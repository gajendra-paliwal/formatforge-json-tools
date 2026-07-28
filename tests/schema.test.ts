import { describe, expect, it } from "vitest";
import {
  generateSchema,
  inferSchema,
  isValidAgainstSchema,
  mergeSchemas,
  validateAgainstSchema,
  type JsonSchema
} from "../src";

describe("JSON Schema inference", () => {
  it.each([
    [null, "null"],
    [true, "boolean"],
    ["hello", "string"],
    [3, "integer"],
    [3.14, "number"]
  ] as const)("infers %j as %s", (value, type) => {
    expect(inferSchema(value)).toEqual({ type });
  });

  it("generates object properties and required fields", () => {
    expect(inferSchema({ id: 1, name: "Asha", active: true })).toEqual({
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        active: { type: "boolean" }
      },
      required: ["id", "name", "active"]
    });
  });

  it("supports optional required generation", () => {
    expect(inferSchema({ id: 1 }, { required: false })).toEqual({
      type: "object",
      properties: { id: { type: "integer" } }
    });
  });

  it("supports additionalProperties generation", () => {
    expect(inferSchema({ id: 1 }, { additionalProperties: false })).toMatchObject({ additionalProperties: false });
  });

  it("infers nested objects", () => {
    expect(inferSchema({ user: { name: "Asha" } })).toMatchObject({
      properties: { user: { type: "object", properties: { name: { type: "string" } } } }
    });
  });

  it("infers homogeneous arrays", () => {
    expect(inferSchema([1, 2, 3])).toEqual({ type: "array", items: { type: "integer" } });
  });

  it("infers mixed numeric arrays", () => {
    expect(inferSchema([1, 2.5])).toEqual({ type: "array", items: { type: ["integer", "number"] } });
  });

  it("infers mixed arrays", () => {
    expect(inferSchema([1, "two", null])).toEqual({ type: "array", items: { type: ["integer", "string", "null"] } });
  });

  it("merges object shapes in arrays and keeps common required keys", () => {
    expect(inferSchema([{ id: 1, name: "A" }, { id: 2, email: "a@example.com" }])).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" }
        },
        required: ["id"]
      }
    });
  });

  it("uses an open item schema for empty arrays", () => {
    expect(inferSchema([])).toEqual({ type: "array", items: {} });
  });

  it("adds Draft 2020-12 metadata", () => {
    expect(generateSchema({ id: 1 })).toMatchObject({ $schema: "https://json-schema.org/draft/2020-12/schema" });
  });

  it("can omit Draft metadata", () => {
    expect(generateSchema(1, { includeMetaSchema: false })).toEqual({ type: "integer" });
  });

  it("adds title and id", () => {
    expect(generateSchema(1, { title: "Value", id: "https://example.com/value" })).toMatchObject({ title: "Value", $id: "https://example.com/value" });
  });
});

describe("JSON Schema merging", () => {
  it("returns an equivalent clone for equal schemas", () => {
    const schema: JsonSchema = { type: "string", minLength: 1 };
    expect(mergeSchemas(schema, schema)).toEqual(schema);
  });

  it("merges different primitive types", () => {
    expect(mergeSchemas({ type: "string" }, { type: "null" })).toEqual({ type: ["string", "null"] });
  });

  it("merges array item schemas", () => {
    expect(mergeSchemas({ type: "array", items: { type: "integer" } }, { type: "array", items: { type: "string" } })).toEqual({
      type: "array",
      items: { type: ["integer", "string"] }
    });
  });

  it("merges object properties", () => {
    expect(mergeSchemas(
      { type: "object", properties: { id: { type: "integer" } }, required: ["id"] },
      { type: "object", properties: { name: { type: "string" } }, required: ["name"] }
    )).toEqual({
      type: "object",
      properties: { id: { type: "integer" }, name: { type: "string" } }
    });
  });
});

describe("JSON Schema validation", () => {
  it("validates primitive types", () => {
    expect(isValidAgainstSchema("hello", { type: "string" })).toBe(true);
    expect(isValidAgainstSchema(2, { type: "number" })).toBe(true);
    expect(isValidAgainstSchema(2.5, { type: "integer" })).toBe(false);
  });

  it("validates union types", () => {
    expect(isValidAgainstSchema(null, { type: ["string", "null"] })).toBe(true);
  });

  it("returns useful type errors", () => {
    expect(validateAgainstSchema("2", { type: "integer" })).toEqual({
      valid: false,
      errors: [expect.objectContaining({ path: "", keyword: "type", actual: "string" })]
    });
  });

  it("validates required properties", () => {
    const result = validateAgainstSchema({}, { type: "object", required: ["name"] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ path: "/name", keyword: "required" });
  });

  it("validates nested properties", () => {
    const schema: JsonSchema = { type: "object", properties: { user: { type: "object", properties: { age: { type: "integer" } } } } };
    expect(validateAgainstSchema({ user: { age: "20" } }, schema).errors[0]).toMatchObject({ path: "/user/age", keyword: "type" });
  });

  it("rejects additional properties", () => {
    const result = validateAgainstSchema({ id: 1, extra: true }, { type: "object", properties: { id: { type: "integer" } }, additionalProperties: false });
    expect(result.errors[0]).toMatchObject({ path: "/extra", keyword: "additionalProperties" });
  });

  it("validates additional properties with a schema", () => {
    expect(isValidAgainstSchema({ x: 1, y: 2 }, { type: "object", additionalProperties: { type: "integer" } })).toBe(true);
    expect(isValidAgainstSchema({ x: "bad" }, { type: "object", additionalProperties: { type: "integer" } })).toBe(false);
  });

  it("validates array items", () => {
    const result = validateAgainstSchema([1, "two"], { type: "array", items: { type: "integer" } });
    expect(result.errors[0]).toMatchObject({ path: "/1", keyword: "type" });
  });

  it("validates tuple items", () => {
    expect(isValidAgainstSchema([1, "two"], { type: "array", items: [{ type: "integer" }, { type: "string" }] })).toBe(true);
  });

  it("validates array limits and uniqueness", () => {
    const result = validateAgainstSchema([1, 1], { type: "array", minItems: 3, uniqueItems: true });
    expect(result.errors.map((error) => error.keyword)).toEqual(["minItems", "uniqueItems"]);
  });

  it("validates string constraints", () => {
    expect(validateAgainstSchema("ab", { type: "string", minLength: 3, pattern: "^[A-Z]" }).errors.map((error) => error.keyword)).toEqual(["minLength", "pattern"]);
    expect(isValidAgainstSchema("Abc", { type: "string", minLength: 3, maxLength: 5, pattern: "^[A-Z]" })).toBe(true);
  });

  it("reports invalid schema patterns", () => {
    expect(validateAgainstSchema("abc", { type: "string", pattern: "[" }).errors[0].keyword).toBe("pattern");
  });

  it("validates number constraints", () => {
    const result = validateAgainstSchema(10, { type: "number", minimum: 11, maximum: 9, exclusiveMinimum: 10, exclusiveMaximum: 10, multipleOf: 3 });
    expect(result.errors.map((error) => error.keyword)).toEqual(["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"]);
  });

  it("validates enum", () => {
    expect(isValidAgainstSchema("red", { enum: ["red", "green"] })).toBe(true);
    expect(isValidAgainstSchema("blue", { enum: ["red", "green"] })).toBe(false);
  });

  it("validates const", () => {
    expect(isValidAgainstSchema({ id: 1 }, { const: { id: 1 } })).toBe(true);
    expect(isValidAgainstSchema({ id: 2 }, { const: { id: 1 } })).toBe(false);
  });

  it("validates anyOf", () => {
    expect(isValidAgainstSchema(1, { anyOf: [{ type: "integer" }, { type: "string" }] })).toBe(true);
    expect(isValidAgainstSchema(true, { anyOf: [{ type: "integer" }, { type: "string" }] })).toBe(false);
  });

  it("validates allOf", () => {
    expect(isValidAgainstSchema("ABC", { allOf: [{ type: "string" }, { minLength: 3 }, { pattern: "^[A-Z]+$" }] })).toBe(true);
  });

  it("validates oneOf", () => {
    expect(isValidAgainstSchema("x", { oneOf: [{ type: "string" }, { type: "integer" }] })).toBe(true);
    expect(isValidAgainstSchema(2, { oneOf: [{ type: "number" }, { type: "integer" }] })).toBe(false);
  });

  it("validates not", () => {
    expect(isValidAgainstSchema("allowed", { not: { const: "blocked" } })).toBe(true);
    expect(isValidAgainstSchema("blocked", { not: { const: "blocked" } })).toBe(false);
  });

  it("validates a generated schema", () => {
    const value = { id: 1, user: { name: "Asha" }, tags: ["json", "tools"] };
    const schema = generateSchema(value, { additionalProperties: false });
    expect(isValidAgainstSchema(value, schema)).toBe(true);
    expect(isValidAgainstSchema({ ...value, id: "1" }, schema)).toBe(false);
  });

  it("escapes JSON Pointer paths in errors", () => {
    const result = validateAgainstSchema({ "a/b": "bad" }, { type: "object", properties: { "a/b": { type: "integer" } } });
    expect(result.errors[0].path).toBe("/a~1b");
  });
});
