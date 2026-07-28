import type { JsonValue } from "../types/json";
import { assertJsonValue } from "./shared";

/** Creates a fully independent clone of a JSON-compatible value. */
export function deepClone<T extends JsonValue>(input: T): T {
  assertJsonValue(input);
  return clone(input);
}

function clone<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, clone(nestedValue)])
    ) as T;
  }

  return value;
}
