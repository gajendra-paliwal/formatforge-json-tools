import type { JsonObject, JsonValue } from "../types/json";
import { isDeepEqual } from "../compare";
import { deepClone } from "../transform";
import { assertJsonValue, isJsonObject } from "../transform/shared";

export type JsonPatchOperation =
  | { op: "add"; path: string; value: JsonValue }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: JsonValue }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: JsonValue };

export interface ApplyPatchOptions {
  /** Mutate the supplied document instead of cloning it first. Default: false. */
  mutate?: boolean;
}

export interface ApplyPatchResult<T extends JsonValue = JsonValue> {
  document: T;
  applied: number;
}

export interface PatchValidationError {
  index: number;
  message: string;
}

export interface PatchValidationResult {
  valid: boolean;
  errors: PatchValidationError[];
}

export class JsonPatchError extends Error {
  readonly operationIndex: number;
  readonly operation: JsonPatchOperation;

  constructor(message: string, operationIndex: number, operation: JsonPatchOperation) {
    super(message);
    this.name = "JsonPatchError";
    this.operationIndex = operationIndex;
    this.operation = operation;
  }
}

/** Creates a deterministic RFC 6902 patch that transforms source into target. */
export function createPatch(source: unknown, target: unknown): JsonPatchOperation[] {
  assertJsonValue(source, "$source");
  assertJsonValue(target, "$target");

  const operations: JsonPatchOperation[] = [];
  collectPatch(source, target, "", operations);
  return operations;
}

/** Applies an RFC 6902 patch and returns the resulting JSON document. */
export function applyPatch<T extends JsonValue>(
  document: T,
  patch: readonly JsonPatchOperation[],
  options: ApplyPatchOptions = {}
): ApplyPatchResult<T> {
  assertJsonValue(document, "$document");
  const validation = validatePatch(patch);
  if (!validation.valid) {
    const first = validation.errors[0]!;
    throw new TypeError(`Invalid JSON Patch operation at index ${first.index}: ${first.message}`);
  }

  let current: JsonValue = options.mutate ? document : deepClone(document);

  patch.forEach((operation, index) => {
    try {
      current = applyOperation(current, operation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON Patch operation failed";
      throw new JsonPatchError(message, index, operation);
    }
  });

  return { document: current as T, applied: patch.length };
}

/** Validates the structure and JSON Pointer fields of a patch. */
export function validatePatch(patch: unknown): PatchValidationResult {
  const errors: PatchValidationError[] = [];

  if (!Array.isArray(patch)) {
    return { valid: false, errors: [{ index: -1, message: "patch must be an array" }] };
  }

  patch.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      errors.push({ index, message: "operation must be an object" });
      return;
    }

    const operation = candidate as Record<string, unknown>;
    const op = operation.op;
    if (!isOperationName(op)) {
      errors.push({ index, message: "op must be add, remove, replace, move, copy, or test" });
      return;
    }

    if (typeof operation.path !== "string" || !isValidPointer(operation.path)) {
      errors.push({ index, message: "path must be a valid JSON Pointer" });
    }

    if ((op === "move" || op === "copy") &&
        (typeof operation.from !== "string" || !isValidPointer(operation.from))) {
      errors.push({ index, message: "from must be a valid JSON Pointer" });
    }

    if (op === "add" || op === "replace" || op === "test") {
      if (!("value" in operation)) {
        errors.push({ index, message: `${op} requires a value` });
      } else {
        try {
          assertJsonValue(operation.value, `$patch[${index}].value`);
        } catch (error) {
          errors.push({ index, message: error instanceof Error ? error.message : "value must be valid JSON" });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Builds a patch that reverses another patch for the supplied original document.
 * The original document is required because remove/replace operations do not
 * contain their previous values.
 */
export function invertPatch(
  document: JsonValue,
  patch: readonly JsonPatchOperation[]
): JsonPatchOperation[] {
  assertJsonValue(document, "$document");
  const inverse: JsonPatchOperation[] = [];
  let current = deepClone(document);

  patch.forEach((operation, index) => {
    try {
      const inverseOperation = invertOperation(current, operation);
      current = applyOperation(current, operation);
      inverse.unshift(...inverseOperation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON Patch operation failed";
      throw new JsonPatchError(message, index, operation);
    }
  });

  return inverse;
}

function collectPatch(
  source: JsonValue,
  target: JsonValue,
  path: string,
  operations: JsonPatchOperation[]
): void {
  if (isDeepEqual(source, target)) return;

  if (Array.isArray(source) && Array.isArray(target)) {
    operations.push({ op: "replace", path, value: deepClone(target) });
    return;
  }

  if (isJsonObject(source) && isJsonObject(target)) {
    const sourceKeys = Object.keys(source).sort();
    const targetKeys = Object.keys(target).sort();

    for (const key of sourceKeys.filter((key) => !Object.prototype.hasOwnProperty.call(target, key)).reverse()) {
      operations.push({ op: "remove", path: appendPointer(path, key) });
    }

    for (const key of targetKeys) {
      const nestedPath = appendPointer(path, key);
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        operations.push({ op: "add", path: nestedPath, value: deepClone(target[key]!) });
      } else {
        collectPatch(source[key]!, target[key]!, nestedPath, operations);
      }
    }
    return;
  }

  operations.push({ op: "replace", path, value: deepClone(target) });
}

function applyOperation(document: JsonValue, operation: JsonPatchOperation): JsonValue {
  switch (operation.op) {
    case "add":
      return addValue(document, operation.path, deepClone(operation.value));
    case "remove":
      return removeValue(document, operation.path).document;
    case "replace":
      getValue(document, operation.path);
      return replaceValue(document, operation.path, deepClone(operation.value));
    case "copy":
      return addValue(document, operation.path, deepClone(getValue(document, operation.from)));
    case "move": {
      if (operation.path === operation.from || operation.path.startsWith(`${operation.from}/`)) {
        throw new Error("move destination cannot be inside the source value");
      }
      const removed = removeValue(document, operation.from);
      return addValue(removed.document, operation.path, removed.value);
    }
    case "test":
      if (!isDeepEqual(getValue(document, operation.path), operation.value)) {
        throw new Error(`test operation failed at path "${operation.path}"`);
      }
      return document;
  }
}

function invertOperation(document: JsonValue, operation: JsonPatchOperation): JsonPatchOperation[] {
  switch (operation.op) {
    case "add":
      return invertAddLikeOperation(document, operation.path);
    case "remove":
      return [{ op: "add", path: operation.path, value: deepClone(getValue(document, operation.path)) }];
    case "replace":
      return [{ op: "replace", path: operation.path, value: deepClone(getValue(document, operation.path)) }];
    case "copy":
      return invertAddLikeOperation(document, operation.path);
    case "move": {
      const destinationExisted = pointerExists(document, operation.path);
      const destinationValue = destinationExisted ? deepClone(getValue(document, operation.path)) : null;
      const result: JsonPatchOperation[] = [{ op: "move", from: operation.path, path: operation.from }];
      if (destinationExisted) result.push({ op: "add", path: operation.path, value: destinationValue });
      return result;
    }
    case "test":
      return [{ ...operation, value: deepClone(operation.value) }];
  }
}

function invertAddLikeOperation(
  document: JsonValue,
  path: string
): JsonPatchOperation[] {
  if (path === "") {
    return [{ op: "replace", path: "", value: deepClone(document) }];
  }

  const { parent, token } = resolveParent(document, path);

  if (Array.isArray(parent)) {
    const index = token === "-"
      ? parent.length
      : parseArrayIndex(token, parent.length, true);
    const concretePath = replaceFinalPointerToken(path, String(index));
    return [{ op: "remove", path: concretePath }];
  }

  return Object.prototype.hasOwnProperty.call(parent, token)
    ? [{ op: "replace", path, value: deepClone(parent[token]!) }]
    : [{ op: "remove", path }];
}

function replaceFinalPointerToken(pointer: string, token: string): string {
  const separatorIndex = pointer.lastIndexOf("/");
  return `${pointer.slice(0, separatorIndex + 1)}${token.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function getValue(document: JsonValue, pointer: string): JsonValue {
  if (pointer === "") return document;
  const tokens = parsePointer(pointer);
  let current: JsonValue = document;

  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = parseArrayIndex(token, current.length, false);
      current = current[index]!;
    } else if (isJsonObject(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, token)) {
        throw new Error(`path does not exist: "${pointer}"`);
      }
      current = current[token]!;
    } else {
      throw new Error(`path does not exist: "${pointer}"`);
    }
  }

  return current;
}

function addValue(document: JsonValue, pointer: string, value: JsonValue): JsonValue {
  if (pointer === "") return value;
  const { parent, token } = resolveParent(document, pointer);

  if (Array.isArray(parent)) {
    if (token === "-") {
      parent.push(value);
    } else {
      const index = parseArrayIndex(token, parent.length, true);
      parent.splice(index, 0, value);
    }
  } else {
    defineJsonProperty(parent, token, value);
  }
  return document;
}

function replaceValue(document: JsonValue, pointer: string, value: JsonValue): JsonValue {
  if (pointer === "") return value;
  const { parent, token } = resolveParent(document, pointer);

  if (Array.isArray(parent)) {
    const index = parseArrayIndex(token, parent.length, false);
    parent[index] = value;
  } else {
    if (!Object.prototype.hasOwnProperty.call(parent, token)) {
      throw new Error(`path does not exist: "${pointer}"`);
    }
    defineJsonProperty(parent, token, value);
  }
  return document;
}

function removeValue(document: JsonValue, pointer: string): { document: JsonValue; value: JsonValue } {
  if (pointer === "") {
    return { document: null, value: document };
  }

  const { parent, token } = resolveParent(document, pointer);
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(token, parent.length, false);
    const [value] = parent.splice(index, 1);
    return { document, value: value! };
  }

  if (!Object.prototype.hasOwnProperty.call(parent, token)) {
    throw new Error(`path does not exist: "${pointer}"`);
  }
  const value = parent[token]!;
  delete parent[token];
  return { document, value };
}

function resolveParent(document: JsonValue, pointer: string): { parent: JsonObject | JsonValue[]; token: string } {
  const tokens = parsePointer(pointer);
  const token = tokens.pop();
  if (token === undefined) throw new Error("path must not be empty");
  let current = document;

  for (const segment of tokens) {
    if (Array.isArray(current)) {
      current = current[parseArrayIndex(segment, current.length, false)]!;
    } else if (isJsonObject(current) && Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment]!;
    } else {
      throw new Error(`path does not exist: "${pointer}"`);
    }
  }

  if (!Array.isArray(current) && !isJsonObject(current)) {
    throw new Error(`parent path is not a container: "${pointer}"`);
  }
  return { parent: current, token };
}

function parsePointer(pointer: string): string[] {
  if (!isValidPointer(pointer)) throw new Error(`invalid JSON Pointer: "${pointer}"`);
  if (pointer === "") return [];
  return pointer.slice(1).split("/").map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function isValidPointer(pointer: string): boolean {
  return pointer === "" || (pointer.startsWith("/") && !/~(?:[^01]|$)/.test(pointer));
}

function parseArrayIndex(token: string, length: number, allowEnd: boolean): number {
  if (!/^(0|[1-9]\d*)$/.test(token)) throw new Error(`invalid array index: "${token}"`);
  const index = Number(token);
  const maximum = allowEnd ? length : length - 1;
  if (!Number.isSafeInteger(index) || index < 0 || index > maximum) {
    throw new Error(`array index out of bounds: "${token}"`);
  }
  return index;
}

function pointerExists(document: JsonValue, pointer: string): boolean {
  try {
    getValue(document, pointer);
    return true;
  } catch {
    return false;
  }
}

function appendPointer(path: string, segment: string): string {
  return `${path}/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function defineJsonProperty(target: JsonObject, key: string, value: JsonValue): void {
  Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true });
}

function isOperationName(value: unknown): value is JsonPatchOperation["op"] {
  return value === "add" || value === "remove" || value === "replace" ||
    value === "move" || value === "copy" || value === "test";
}
