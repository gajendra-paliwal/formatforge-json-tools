import type { JsonValue } from "../types/json";
import { assertJsonValue } from "./shared";

export interface RemoveEmptyOptions {
  removeNull?: boolean;
  removeEmptyStrings?: boolean;
  removeEmptyArrays?: boolean;
  removeEmptyObjects?: boolean;
  trimStrings?: boolean;
}

const DEFAULT_OPTIONS: Required<RemoveEmptyOptions> = {
  removeNull: true,
  removeEmptyStrings: true,
  removeEmptyArrays: true,
  removeEmptyObjects: true,
  trimStrings: false
};

/**
 * Recursively removes configurable empty values from JSON objects and arrays.
 * The input is never mutated.
 */
export function removeEmpty<T extends JsonValue>(
  input: T,
  options: RemoveEmptyOptions = {}
): JsonValue {
  assertJsonValue(input);
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const result = clean(input, resolved, true);
  return result.remove ? (Array.isArray(input) ? [] : input !== null && typeof input === "object" ? {} : input) : result.value;
}

type CleanResult = { remove: false; value: JsonValue } | { remove: true };

function clean(
  value: JsonValue,
  options: Required<RemoveEmptyOptions>,
  isRoot: boolean
): CleanResult {
  if (value === null) {
    return options.removeNull && !isRoot ? { remove: true } : { remove: false, value };
  }

  if (typeof value === "string") {
    const normalized = options.trimStrings ? value.trim() : value;
    if (options.removeEmptyStrings && normalized.length === 0 && !isRoot) {
      return { remove: true };
    }
    return { remove: false, value: normalized };
  }

  if (Array.isArray(value)) {
    const output: JsonValue[] = [];
    for (const item of value) {
      const result = clean(item, options, false);
      if (!result.remove) {
        output.push(result.value);
      }
    }

    if (options.removeEmptyArrays && output.length === 0 && !isRoot) {
      return { remove: true };
    }
    return { remove: false, value: output };
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const result = clean(nestedValue, options, false);
      if (!result.remove) {
        Object.defineProperty(output, key, {
          value: result.value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
    }

    if (options.removeEmptyObjects && Object.keys(output).length === 0 && !isRoot) {
      return { remove: true };
    }
    return { remove: false, value: output };
  }

  return { remove: false, value };
}
