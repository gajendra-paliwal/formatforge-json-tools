import type { JsonValue } from "../types/json";

export type StableStringifyComparator = (left: string, right: string) => number;

export interface StableStringifyOptions {
  /** Number of spaces or indentation string. Defaults to compact output. */
  space?: number | string;
  /** Comparator used to order object keys. Defaults to ascending UTF-16 order. */
  comparator?: StableStringifyComparator;
}

export class JsonCanonicalizationError extends TypeError {
  readonly path: string;

  constructor(message: string, path = "$") {
    super(`${message} at ${path}`);
    this.name = "JsonCanonicalizationError";
    this.path = path;
  }
}

function defaultComparator(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function escapePathKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `.${key}`
    : `[${JSON.stringify(key)}]`;
}

function normalizeSpace(space: StableStringifyOptions["space"]): string {
  if (typeof space === "number") {
    if (!Number.isFinite(space)) {
      return "";
    }

    return " ".repeat(Math.max(0, Math.min(10, Math.trunc(space))));
  }

  if (typeof space === "string") {
    return space.slice(0, 10);
  }

  return "";
}

function serialize(
  value: unknown,
  path: string,
  depth: number,
  indent: string,
  comparator: StableStringifyComparator,
  ancestors: Set<object>
): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new JsonCanonicalizationError("JSON numbers must be finite", path);
    }

    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    throw new JsonCanonicalizationError(
      `Unsupported JSON value of type ${typeof value}`,
      path
    );
  }

  if (ancestors.has(value)) {
    throw new JsonCanonicalizationError("Circular reference detected", path);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) {
    throw new JsonCanonicalizationError("Only plain objects and arrays are supported", path);
  }

  ancestors.add(value);

  try {
    const nextIndent = indent.repeat(depth + 1);
    const currentIndent = indent.repeat(depth);
    const separator = indent ? ": " : ":";

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }

      const entries = value.map((entry, index) =>
        serialize(entry, `${path}[${index}]`, depth + 1, indent, comparator, ancestors)
      );

      if (!indent) {
        return `[${entries.join(",")}]`;
      }

      return `[\n${nextIndent}${entries.join(`,\n${nextIndent}`)}\n${currentIndent}]`;
    }

    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort(comparator);

    if (keys.length === 0) {
      return "{}";
    }

    const entries = keys.map((key) => {
      const serializedValue = serialize(
        objectValue[key],
        `${path}${escapePathKey(key)}`,
        depth + 1,
        indent,
        comparator,
        ancestors
      );
      return `${JSON.stringify(key)}${separator}${serializedValue}`;
    });

    if (!indent) {
      return `{${entries.join(",")}}`;
    }

    return `{\n${nextIndent}${entries.join(`,\n${nextIndent}`)}\n${currentIndent}}`;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Serializes JSON-compatible data deterministically by sorting every object key.
 * Arrays retain their original order.
 */
export function stableStringify(
  value: JsonValue,
  options: StableStringifyOptions = {}
): string {
  const indent = normalizeSpace(options.space);
  const comparator = options.comparator ?? defaultComparator;

  return serialize(value, "$", 0, indent, comparator, new Set<object>());
}

/**
 * Returns the compact FormatForge canonical representation of a JSON value.
 *
 * This deterministic form is intended for comparison, caching, and snapshots.
 * It is not an implementation of RFC 8785 JSON Canonicalization Scheme (JCS).
 */
export function canonicalize(value: JsonValue): string {
  return stableStringify(value);
}

/** Parses JSON text and returns its compact deterministic representation. */
export function canonicalizeJson(text: string): string {
  if (typeof text !== "string") {
    throw new TypeError("canonicalizeJson expects a JSON string");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new JsonCanonicalizationError(message);
  }

  return canonicalize(parsed as JsonValue);
}

/** Returns true only when the text is valid JSON and already in canonical form. */
export function isCanonicalJson(text: string): boolean {
  if (typeof text !== "string") {
    return false;
  }

  try {
    return canonicalizeJson(text) === text;
  } catch {
    return false;
  }
}
