/** Options used by {@link formatJson}. */
export interface FormatJsonOptions {
  /** Number of spaces used for indentation. Must be an integer from 0 to 10. */
  indent?: number;
  /** Recursively sort object keys. Array item order is preserved. */
  sortKeys?: boolean;
}

/**
 * Parse and format JSON input.
 *
 * String inputs are parsed as JSON first. Other values are serialized directly.
 * The function throws when the input is invalid JSON or cannot be represented as
 * a complete JSON document.
 */
export function formatJson(
  input: string | unknown,
  options: FormatJsonOptions = {}
): string {
  const { indent = 2, sortKeys = false } = options;

  if (!Number.isInteger(indent) || indent < 0 || indent > 10) {
    throw new RangeError("indent must be an integer between 0 and 10");
  }

  const value = typeof input === "string" ? JSON.parse(input) : input;
  const normalized = sortKeys ? sortJsonKeys(value) : value;
  const result = JSON.stringify(normalized, null, indent);

  if (result === undefined) {
    throw new TypeError("input cannot be represented as a JSON document");
  }

  return result;
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonKeys(nestedValue)])
    );
  }

  return value;
}
