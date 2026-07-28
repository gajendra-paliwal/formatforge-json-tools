import type { JsonValue } from "../types/json";
import { assertDelimiter, assertJsonValue, isJsonObject } from "./shared";

export interface FlattenJsonOptions {
  /** Character used between object-key path segments. Default: `.` */
  delimiter?: string;
}

export type FlattenedJson = Record<string, JsonValue>;

/**
 * Flattens a JSON value into path/value pairs.
 *
 * Object keys use the configured delimiter, array indexes use bracket notation,
 * and reserved path characters are escaped with a backslash. A primitive or
 * empty root value is represented by the empty path (`""`).
 */
export function flattenJson(
  input: JsonValue,
  options: FlattenJsonOptions = {}
): FlattenedJson {
  const delimiter = options.delimiter ?? ".";
  assertDelimiter(delimiter);
  assertJsonValue(input);

  const output: FlattenedJson = {};

  const visit = (value: JsonValue, path: string): void => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        output[path] = [];
        return;
      }

      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (isJsonObject(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        output[path] = {};
        return;
      }

      for (const [key, nestedValue] of entries) {
        const escapedKey = escapePathKey(key, delimiter);
        const nestedPath = path ? `${path}${delimiter}${escapedKey}` : escapedKey;
        visit(nestedValue, nestedPath);
      }
      return;
    }

    output[path] = value;
  };

  visit(input, "");
  return output;
}

function escapePathKey(key: string, delimiter: string): string {
  if (key.length === 0) {
    throw new TypeError("empty object keys cannot be flattened");
  }

  return key
    .split("\\").join("\\\\")
    .split(delimiter).join(`\\${delimiter}`)
    .split("[").join("\\[")
    .split("]").join("\\]");
}
