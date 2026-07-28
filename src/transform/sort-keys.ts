import type { JsonValue } from "../types/json";
import { assertJsonValue } from "./shared";

export interface SortJsonKeysOptions {
  /** Optional key comparator. Defaults to locale-aware ascending order. */
  compare?: (left: string, right: string) => number;
}

/** Recursively sorts object keys while preserving array item order. */
export function sortJsonKeys<T extends JsonValue>(
  input: T,
  options: SortJsonKeysOptions = {}
): T {
  assertJsonValue(input);
  const compare = options.compare ?? ((left, right) => left.localeCompare(right));
  return sort(input, compare);
}

function sort<T extends JsonValue>(
  value: T,
  compare: (left: string, right: string) => number
): T {
  if (Array.isArray(value)) {
    return value.map((item) => sort(item, compare)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compare(left, right))
        .map(([key, nestedValue]) => [key, sort(nestedValue, compare)])
    ) as T;
  }

  return value;
}
