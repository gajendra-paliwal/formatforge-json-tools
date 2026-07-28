import type { JsonObject, JsonPrimitive, JsonValue } from "../types/json";

export type JsonSchemaType =
  | "null"
  | "boolean"
  | "object"
  | "array"
  | "number"
  | "integer"
  | "string";

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  enum?: JsonValue[];
  const?: JsonValue;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface GenerateSchemaOptions {
  /** Add the Draft 2020-12 metaschema declaration. Defaults to true. */
  includeMetaSchema?: boolean;
  /** Add every observed object property to required. Defaults to true. */
  required?: boolean;
  /** Value for additionalProperties on generated object schemas. */
  additionalProperties?: boolean;
  /** Optional schema title. */
  title?: string;
  /** Optional schema identifier. */
  id?: string;
}

export interface SchemaValidationError {
  path: string;
  keyword: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defineSafe(target: Record<string, JsonSchema>, key: string, value: JsonSchema): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function inferType(value: JsonValue): JsonSchemaType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  throw new TypeError("Value is not valid JSON");
}

function uniqueTypes(types: JsonSchemaType[]): JsonSchemaType[] {
  return Array.from(new Set(types));
}

function mergeRequired(a?: string[], b?: string[]): string[] | undefined {
  if (!a && !b) return undefined;
  const left = a ?? [];
  const right = new Set(b ?? []);
  return left.filter((key) => right.has(key));
}

function schemaSignature(schema: JsonSchema): string {
  return JSON.stringify(schema, Object.keys(schema).sort());
}

export function mergeSchemas(schemaA: JsonSchema, schemaB: JsonSchema): JsonSchema {
  if (schemaSignature(schemaA) === schemaSignature(schemaB)) {
    return structuredCloneSafe(schemaA);
  }

  const typesA = schemaA.type ? (Array.isArray(schemaA.type) ? schemaA.type : [schemaA.type]) : [];
  const typesB = schemaB.type ? (Array.isArray(schemaB.type) ? schemaB.type : [schemaB.type]) : [];
  const types = uniqueTypes([...typesA, ...typesB]);

  if (types.length === 1 && types[0] === "object" && schemaA.properties && schemaB.properties) {
    const properties: Record<string, JsonSchema> = {};
    const keys = new Set([...Object.keys(schemaA.properties), ...Object.keys(schemaB.properties)]);
    for (const key of keys) {
      const left = schemaA.properties[key];
      const right = schemaB.properties[key];
      defineSafe(properties, key, left && right ? mergeSchemas(left, right) : structuredCloneSafe(left ?? right!));
    }

    const merged: JsonSchema = { type: "object", properties };
    const required = mergeRequired(schemaA.required, schemaB.required);
    if (required && required.length > 0) merged.required = required;
    if (schemaA.additionalProperties !== undefined && schemaA.additionalProperties === schemaB.additionalProperties) {
      merged.additionalProperties = schemaA.additionalProperties;
    }
    return merged;
  }

  if (types.length === 1 && types[0] === "array" && schemaA.items && schemaB.items && !Array.isArray(schemaA.items) && !Array.isArray(schemaB.items)) {
    return { type: "array", items: mergeSchemas(schemaA.items, schemaB.items) };
  }

  if (types.length > 0) {
    const onlyType = types[0];
    return { type: types.length === 1 && onlyType ? onlyType : types };
  }

  return { anyOf: [structuredCloneSafe(schemaA), structuredCloneSafe(schemaB)] };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function inferSchemaInternal(value: JsonValue, options: GenerateSchemaOptions): JsonSchema {
  const type = inferType(value);

  if (type === "object") {
    const properties: Record<string, JsonSchema> = {};
    const objectValue = value as JsonObject;
    const required: string[] = [];

    for (const key of Object.keys(objectValue)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      defineSafe(properties, key, inferSchemaInternal(objectValue[key]!, options));
      if (options.required !== false) required.push(key);
    }

    const schema: JsonSchema = { type: "object", properties };
    if (required.length > 0) schema.required = required;
    if (options.additionalProperties !== undefined) {
      schema.additionalProperties = options.additionalProperties;
    }
    return schema;
  }

  if (type === "array") {
    const arrayValue = value as JsonValue[];
    if (arrayValue.length === 0) return { type: "array", items: {} };

    let items = inferSchemaInternal(arrayValue[0]!, options);
    for (let index = 1; index < arrayValue.length; index += 1) {
      items = mergeSchemas(items, inferSchemaInternal(arrayValue[index]!, options));
    }
    return { type: "array", items };
  }

  return { type };
}

export function inferSchema(value: JsonValue, options: GenerateSchemaOptions = {}): JsonSchema {
  return inferSchemaInternal(value, options);
}

export function generateSchema(value: JsonValue, options: GenerateSchemaOptions = {}): JsonSchema {
  const schema = inferSchemaInternal(value, options);
  if (options.includeMetaSchema !== false) schema.$schema = DRAFT_2020_12;
  if (options.title) schema.title = options.title;
  if (options.id) schema.$id = options.id;
  return schema;
}

function appendPath(path: string, token: string | number): string {
  const escaped = String(token).replace(/~/g, "~0").replace(/\//g, "~1");
  return path === "" ? `/${escaped}` : `${path}/${escaped}`;
}

function actualType(value: JsonValue): JsonSchemaType {
  return inferType(value);
}

function typeMatches(value: JsonValue, expected: JsonSchemaType): boolean {
  const actual = actualType(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
}

function pushError(errors: SchemaValidationError[], error: SchemaValidationError): void {
  errors.push(error);
}

function validateNode(value: JsonValue, schema: JsonSchema, path: string, errors: SchemaValidationError[]): void {
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    pushError(errors, { path, keyword: "const", message: "Value does not match const", expected: schema.const, actual: value });
    return;
  }

  if (schema.enum && !schema.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))) {
    pushError(errors, { path, keyword: "enum", message: "Value is not included in enum", expected: schema.enum, actual: value });
  }

  if (schema.anyOf) {
    const matched = schema.anyOf.some((candidate) => validateAgainstSchema(value, candidate).valid);
    if (!matched) pushError(errors, { path, keyword: "anyOf", message: "Value does not match any allowed schema" });
  }

  if (schema.allOf) {
    schema.allOf.forEach((candidate) => validateNode(value, candidate, path, errors));
  }

  if (schema.oneOf) {
    const matchCount = schema.oneOf.filter((candidate) => validateAgainstSchema(value, candidate).valid).length;
    if (matchCount !== 1) pushError(errors, { path, keyword: "oneOf", message: "Value must match exactly one schema", expected: 1, actual: matchCount });
  }

  if (schema.not && validateAgainstSchema(value, schema.not).valid) {
    pushError(errors, { path, keyword: "not", message: "Value matches a disallowed schema" });
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((type) => typeMatches(value, type))) {
      pushError(errors, { path, keyword: "type", message: `Expected ${allowed.join(" or ")}`, expected: allowed, actual: actualType(value) });
      return;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) pushError(errors, { path, keyword: "minLength", message: "String is shorter than minLength", expected: schema.minLength, actual: value.length });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) pushError(errors, { path, keyword: "maxLength", message: "String is longer than maxLength", expected: schema.maxLength, actual: value.length });
    if (schema.pattern !== undefined) {
      let regex: RegExp;
      try { regex = new RegExp(schema.pattern); } catch { pushError(errors, { path, keyword: "pattern", message: "Schema contains an invalid regular expression" }); return; }
      if (!regex.test(value)) pushError(errors, { path, keyword: "pattern", message: "String does not match pattern", expected: schema.pattern, actual: value });
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) pushError(errors, { path, keyword: "minimum", message: "Number is less than minimum", expected: schema.minimum, actual: value });
    if (schema.maximum !== undefined && value > schema.maximum) pushError(errors, { path, keyword: "maximum", message: "Number is greater than maximum", expected: schema.maximum, actual: value });
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) pushError(errors, { path, keyword: "exclusiveMinimum", message: "Number must be greater than exclusiveMinimum", expected: schema.exclusiveMinimum, actual: value });
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) pushError(errors, { path, keyword: "exclusiveMaximum", message: "Number must be less than exclusiveMaximum", expected: schema.exclusiveMaximum, actual: value });
    if (schema.multipleOf !== undefined && Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) > Number.EPSILON) pushError(errors, { path, keyword: "multipleOf", message: "Number is not a multiple of the required value", expected: schema.multipleOf, actual: value });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) pushError(errors, { path, keyword: "minItems", message: "Array has fewer items than minItems", expected: schema.minItems, actual: value.length });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) pushError(errors, { path, keyword: "maxItems", message: "Array has more items than maxItems", expected: schema.maxItems, actual: value.length });
    if (schema.uniqueItems) {
      const signatures = value.map((item) => JSON.stringify(item));
      if (new Set(signatures).size !== signatures.length) pushError(errors, { path, keyword: "uniqueItems", message: "Array items are not unique" });
    }
    if (schema.items) {
      if (Array.isArray(schema.items)) {
        schema.items.forEach((itemSchema, index) => {
          if (index < value.length) validateNode(value[index]!, itemSchema, appendPath(path, index), errors);
        });
      } else {
        value.forEach((item, index) => validateNode(item, schema.items as JsonSchema, appendPath(path, index), errors));
      }
    }
  }

  if (isPlainObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) pushError(errors, { path: appendPath(path, key), keyword: "required", message: `Required property '${key}' is missing` });
      }
    }

    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) validateNode(value[key]!, propertySchema, appendPath(path, key), errors);
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(schema.properties, key)) pushError(errors, { path: appendPath(path, key), keyword: "additionalProperties", message: `Additional property '${key}' is not allowed` });
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object" && !Array.isArray(schema.additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (!schema.properties || !Object.prototype.hasOwnProperty.call(schema.properties, key)) validateNode(value[key]!, schema.additionalProperties, appendPath(path, key), errors);
      }
    }
  }
}

export function validateAgainstSchema(value: JsonValue, schema: JsonSchema): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  validateNode(value, schema, "", errors);
  return { valid: errors.length === 0, errors };
}

export function isValidAgainstSchema(value: JsonValue, schema: JsonSchema): boolean {
  return validateAgainstSchema(value, schema).valid;
}
