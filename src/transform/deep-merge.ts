import type { JsonObject, JsonValue } from "../types/json";
import { deepClone } from "./deep-clone";
import { assertJsonValue, isJsonObject } from "./shared";

export interface DeepMergeOptions {
  /** How arrays are combined. Default: `replace`. */
  arrayStrategy?: "replace" | "concat";
}

/**
 * Recursively merges JSON objects without mutating either input.
 * Objects merge by key; arrays are replaced or concatenated.
 */
export function deepMerge<T extends JsonObject, U extends JsonObject>(
  target: T,
  source: U,
  options: DeepMergeOptions = {}
): T & U {
  assertJsonValue(target, "target");
  assertJsonValue(source, "source");

  const arrayStrategy = options.arrayStrategy ?? "replace";
  if (arrayStrategy !== "replace" && arrayStrategy !== "concat") {
    throw new TypeError('arrayStrategy must be either "replace" or "concat"');
  }

  return mergeObjects(target, source, arrayStrategy) as T & U;
}

function mergeObjects(
  target: JsonObject,
  source: JsonObject,
  arrayStrategy: "replace" | "concat"
): JsonObject {
  const output = deepClone(target);

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = output[key];

    if (targetValue !== undefined && isJsonObject(targetValue) && isJsonObject(sourceValue)) {
      defineJsonProperty(output, key, mergeObjects(targetValue, sourceValue, arrayStrategy));
    } else if (
      arrayStrategy === "concat" &&
      targetValue !== undefined &&
      Array.isArray(targetValue) &&
      Array.isArray(sourceValue)
    ) {
      defineJsonProperty(output, key, [...deepClone(targetValue), ...deepClone(sourceValue)]);
    } else {
      defineJsonProperty(output, key, deepClone(sourceValue));
    }
  }

  return output;
}

function defineJsonProperty(target: JsonObject, key: string, value: JsonValue): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}
