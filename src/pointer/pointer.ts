import type { JsonObject, JsonValue } from "../types/json";
import { deepClone } from "../transform";

const ARRAY_INDEX_PATTERN = /^(0|[1-9]\d*)$/;

export class JsonPointerError extends Error {
  public readonly pointer: string;
  public readonly token: string | undefined;
  public readonly tokenIndex: number | undefined;

  public constructor(message: string, pointer: string, token?: string, tokenIndex?: number) {
    super(message);
    this.name = "JsonPointerError";
    this.pointer = pointer;
    this.token = token;
    this.tokenIndex = tokenIndex;
  }
}

export interface ListPointersOptions {
  /** Include pointers for objects and arrays as well as leaf values. Default: false. */
  includeContainers?: boolean;
  /** Include the root pointer (empty string). Default: false. */
  includeRoot?: boolean;
}

export function escapePointer(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

export function unescapePointer(token: string): string {
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] === "~") {
      const next = token[index + 1];
      if (next !== "0" && next !== "1") {
        throw new JsonPointerError(`invalid escape sequence in JSON Pointer token: "~${next ?? ""}"`, token);
      }
      index += 1;
    }
  }

  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) {
    throw new JsonPointerError('JSON Pointer must be empty or start with "/"', pointer);
  }

  return pointer.slice(1).split("/").map((token, index) => {
    try {
      const decoded = unescapePointer(token);
      return decoded;
    } catch (error) {
      if (error instanceof JsonPointerError) {
        throw new JsonPointerError(error.message, pointer, token, index);
      }
      throw error;
    }
  });
}

export function getPointer(document: JsonValue, pointer: string): JsonValue {
  const tokens = parsePointer(pointer);
  let current: JsonValue = document;

  tokens.forEach((token, index) => {
    current = readToken(current, token, pointer, index);
  });

  return current;
}

export function hasPointer(document: JsonValue, pointer: string): boolean {
  try {
    getPointer(document, pointer);
    return true;
  } catch (error) {
    if (error instanceof JsonPointerError) return false;
    throw error;
  }
}

export function setPointer(document: JsonValue, pointer: string, value: JsonValue): JsonValue {
  const tokens = parsePointer(pointer);
  const clonedDocument = deepClone(document);
  const clonedValue = deepClone(value);

  if (tokens.length === 0) return clonedValue;

  const parent = resolveParent(clonedDocument, tokens, pointer);
  const finalToken = tokens[tokens.length - 1]!;

  if (Array.isArray(parent)) {
    if (finalToken === "-") {
      parent.push(clonedValue);
      return clonedDocument;
    }

    const index = parseArrayIndex(finalToken, pointer, tokens.length - 1, true);
    if (index > parent.length) {
      throw pointerError(`array index ${index} is out of bounds`, pointer, finalToken, tokens.length - 1);
    }

    if (index === parent.length) parent.push(clonedValue);
    else parent[index] = clonedValue;
    return clonedDocument;
  }

  if (isJsonObject(parent)) {
    defineSafeProperty(parent, finalToken, clonedValue);
    return clonedDocument;
  }

  throw pointerError("cannot set a child of a primitive value", pointer, finalToken, tokens.length - 1);
}

export function removePointer(document: JsonValue, pointer: string): JsonValue {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) {
    throw new JsonPointerError("the root JSON value cannot be removed", pointer);
  }

  const clonedDocument = deepClone(document);
  const parent = resolveParent(clonedDocument, tokens, pointer);
  const finalToken = tokens[tokens.length - 1]!;

  if (Array.isArray(parent)) {
    const index = parseArrayIndex(finalToken, pointer, tokens.length - 1, false);
    if (index >= parent.length) {
      throw pointerError(`array index ${index} is out of bounds`, pointer, finalToken, tokens.length - 1);
    }
    parent.splice(index, 1);
    return clonedDocument;
  }

  if (isJsonObject(parent)) {
    if (!hasOwn(parent, finalToken)) {
      throw pointerError(`property "${finalToken}" does not exist`, pointer, finalToken, tokens.length - 1);
    }
    delete parent[finalToken];
    return clonedDocument;
  }

  throw pointerError("cannot remove a child of a primitive value", pointer, finalToken, tokens.length - 1);
}

export function listPointers(document: JsonValue, options: ListPointersOptions = {}): string[] {
  const { includeContainers = false, includeRoot = false } = options;
  const pointers: string[] = [];

  const visit = (value: JsonValue, pointer: string): void => {
    const isContainer = Array.isArray(value) || isJsonObject(value);
    if ((pointer !== "" || includeRoot) && (!isContainer || includeContainers)) {
      pointers.push(pointer);
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${pointer}/${index}`));
    } else if (isJsonObject(value)) {
      Object.keys(value).forEach((key) => visit(value[key]!, `${pointer}/${escapePointer(key)}`));
    }
  };

  visit(document, "");
  return pointers;
}

function resolveParent(document: JsonValue, tokens: string[], pointer: string): JsonValue {
  let current = document;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    current = readToken(current, tokens[index]!, pointer, index);
  }
  return current;
}

function readToken(current: JsonValue, token: string, pointer: string, tokenIndex: number): JsonValue {
  if (Array.isArray(current)) {
    const index = parseArrayIndex(token, pointer, tokenIndex, false);
    if (index >= current.length) {
      throw pointerError(`array index ${index} is out of bounds`, pointer, token, tokenIndex);
    }
    return current[index]!;
  }

  if (isJsonObject(current)) {
    if (!hasOwn(current, token)) {
      throw pointerError(`property "${token}" does not exist`, pointer, token, tokenIndex);
    }
    return current[token]!;
  }

  throw pointerError("cannot traverse through a primitive value", pointer, token, tokenIndex);
}

function parseArrayIndex(token: string, pointer: string, tokenIndex: number, allowAppend: boolean): number {
  if (token === "-") {
    if (allowAppend) return Number.MAX_SAFE_INTEGER;
    throw pointerError('"-" is only valid when appending with setPointer', pointer, token, tokenIndex);
  }
  if (!ARRAY_INDEX_PATTERN.test(token)) {
    throw pointerError(`invalid array index: "${token}"`, pointer, token, tokenIndex);
  }
  const index = Number(token);
  if (!Number.isSafeInteger(index)) {
    throw pointerError(`array index is outside the safe integer range: "${token}"`, pointer, token, tokenIndex);
  }
  return index;
}

function pointerError(message: string, pointer: string, token: string, tokenIndex: number): JsonPointerError {
  return new JsonPointerError(message, pointer, token, tokenIndex);
}

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function defineSafeProperty(object: JsonObject, key: string, value: JsonValue): void {
  Object.defineProperty(object, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });
}
