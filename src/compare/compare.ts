import type { JsonValue } from "../types/json";
import { assertJsonValue, isJsonObject } from "../transform/shared";

export type JsonDifferenceType = "added" | "removed" | "changed";

export interface JsonDifference {
  type: JsonDifferenceType;
  /** RFC 6901 JSON Pointer. The root value is represented by an empty string. */
  path: string;
  left?: JsonValue;
  right?: JsonValue;
}

export interface DiffJsonOptions {
  /** Stop after this many differences. Defaults to unlimited. */
  maxDifferences?: number;
}

export interface JsonComparisonResult {
  equal: boolean;
  differences: JsonDifference[];
  added: number;
  removed: number;
  changed: number;
}

/**
 * Performs a structural, order-sensitive comparison of two JSON values.
 * Object property order is ignored; array item order is significant.
 */
export function isDeepEqual(left: unknown, right: unknown): boolean {
  assertJsonValue(left, "$left");
  assertJsonValue(right, "$right");
  return areEqual(left, right);
}

/**
 * Returns deterministic structural differences between two JSON values.
 * Paths use RFC 6901 JSON Pointer syntax.
 */
export function diffJson(
  left: unknown,
  right: unknown,
  options: DiffJsonOptions = {}
): JsonDifference[] {
  assertJsonValue(left, "$left");
  assertJsonValue(right, "$right");

  const maxDifferences = options.maxDifferences ?? Number.POSITIVE_INFINITY;
  if (
    maxDifferences !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(maxDifferences) || maxDifferences < 1)
  ) {
    throw new RangeError("maxDifferences must be a positive integer");
  }

  const differences: JsonDifference[] = [];
  collectDifferences(left, right, "", differences, maxDifferences);
  return differences;
}

/** Returns differences together with summary counts. */
export function compareJson(
  left: unknown,
  right: unknown,
  options: DiffJsonOptions = {}
): JsonComparisonResult {
  const differences = diffJson(left, right, options);

  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const difference of differences) {
    if (difference.type === "added") added += 1;
    else if (difference.type === "removed") removed += 1;
    else changed += 1;
  }

  return {
    equal: differences.length === 0,
    differences,
    added,
    removed,
    changed
  };
}

function areEqual(left: JsonValue, right: JsonValue): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((value, index) => areEqual(value, right[index]!));
  }

  if (isJsonObject(left) || isJsonObject(right)) {
    if (!isJsonObject(left) || !isJsonObject(right)) return false;

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    return leftKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(right, key) && areEqual(left[key]!, right[key]!)
    );
  }

  return false;
}

function collectDifferences(
  left: JsonValue,
  right: JsonValue,
  path: string,
  differences: JsonDifference[],
  limit: number
): void {
  if (differences.length >= limit || areEqual(left, right)) return;

  if (Array.isArray(left) && Array.isArray(right)) {
    const sharedLength = Math.min(left.length, right.length);

    for (let index = 0; index < sharedLength && differences.length < limit; index += 1) {
      collectDifferences(left[index]!, right[index]!, appendPointer(path, String(index)), differences, limit);
    }

    for (let index = sharedLength; index < left.length && differences.length < limit; index += 1) {
      differences.push({
        type: "removed",
        path: appendPointer(path, String(index)),
        left: left[index]!
      });
    }

    for (let index = sharedLength; index < right.length && differences.length < limit; index += 1) {
      differences.push({
        type: "added",
        path: appendPointer(path, String(index)),
        right: right[index]!
      });
    }
    return;
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();

    for (const key of keys) {
      if (differences.length >= limit) return;

      const inLeft = Object.prototype.hasOwnProperty.call(left, key);
      const inRight = Object.prototype.hasOwnProperty.call(right, key);
      const nestedPath = appendPointer(path, key);

      if (!inLeft) {
        differences.push({ type: "added", path: nestedPath, right: right[key]! });
      } else if (!inRight) {
        differences.push({ type: "removed", path: nestedPath, left: left[key]! });
      } else {
        collectDifferences(left[key]!, right[key]!, nestedPath, differences, limit);
      }
    }
    return;
  }

  differences.push({ type: "changed", path, left, right });
}

function appendPointer(path: string, segment: string): string {
  return `${path}/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}
