import type { JsonObject, JsonValue } from "../types/json";

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertDelimiter(delimiter: string): void {
  if (delimiter.length !== 1) {
    throw new RangeError("delimiter must contain exactly one character");
  }

  if (delimiter === "\\" || delimiter === "[" || delimiter === "]") {
    throw new RangeError('delimiter cannot be "\\", "[", or "]"');
  }
}

export function assertJsonValue(value: unknown, path = "$", ancestors = new WeakSet<object>()): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} contains a non-finite number`);
    }
    return;
  }

  if (typeof value === "object") {
    if (ancestors.has(value)) {
      throw new TypeError(`${path} contains a circular reference`);
    }
    ancestors.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, ancestors));
      ancestors.delete(value);
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      ancestors.delete(value);
      throw new TypeError(`${path} must contain only plain objects and arrays`);
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      assertJsonValue(nestedValue, `${path}.${key}`, ancestors);
    }
    ancestors.delete(value);
    return;
  }

  throw new TypeError(`${path} contains a value that is not valid JSON`);
}
