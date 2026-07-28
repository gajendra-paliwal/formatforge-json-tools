/** Structured information describing why JSON validation failed. */
export interface JsonValidationError {
  /** Parser error message. */
  message: string;
  /** Zero-based character offset in the original input. */
  position: number;
  /** One-based line number. */
  line: number;
  /** One-based column number. */
  column: number;
}

/** Result returned by {@link validateJson}. */
export type JsonValidationResult<T = unknown> =
  | {
      valid: true;
      value: T;
      error: null;
    }
  | {
      valid: false;
      value: null;
      error: JsonValidationError;
    };

/**
 * SyntaxError with the location of an invalid JSON token.
 */
export class JsonParseError extends SyntaxError {
  readonly position: number;
  readonly line: number;
  readonly column: number;

  constructor(details: JsonValidationError) {
    super(details.message);
    this.name = "JsonParseError";
    this.position = details.position;
    this.line = details.line;
    this.column = details.column;
  }
}

/** Return whether a string contains one complete, valid JSON document. */
export function isValidJson(input: string): boolean {
  assertStringInput(input);

  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON and throw a {@link JsonParseError} containing line, column, and
 * character-position information when parsing fails.
 */
export function parseJson<T = unknown>(input: string): T {
  assertStringInput(input);

  try {
    return JSON.parse(input) as T;
  } catch (error) {
    throw toJsonParseError(input, error);
  }
}

/**
 * Validate and parse JSON without throwing for malformed JSON.
 */
export function validateJson<T = unknown>(input: string): JsonValidationResult<T> {
  assertStringInput(input);

  try {
    return {
      valid: true,
      value: JSON.parse(input) as T,
      error: null
    };
  } catch (error) {
    const parseError = toJsonParseError(input, error);

    return {
      valid: false,
      value: null,
      error: {
        message: parseError.message,
        position: parseError.position,
        line: parseError.line,
        column: parseError.column
      }
    };
  }
}

function assertStringInput(input: unknown): asserts input is string {
  if (typeof input !== "string") {
    throw new TypeError("input must be a string");
  }
}

function toJsonParseError(input: string, error: unknown): JsonParseError {
  const nativeError = error instanceof Error ? error : new SyntaxError("Invalid JSON");
  const location = getErrorLocation(input, nativeError.message);

  return new JsonParseError({
    message: nativeError.message,
    ...location
  });
}

function getErrorLocation(
  input: string,
  message: string
): Pick<JsonValidationError, "position" | "line" | "column"> {
  const positionMatch = /position\s+(\d+)/i.exec(message);
  const lineColumnMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);

  let position = positionMatch ? Number(positionMatch[1]) : input.length;

  if (!Number.isFinite(position)) {
    position = input.length;
  }

  position = Math.min(Math.max(0, position), input.length);

  if (lineColumnMatch) {
    return {
      position,
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2])
    };
  }

  return positionToLineColumn(input, position);
}

function positionToLineColumn(
  input: string,
  position: number
): Pick<JsonValidationError, "position" | "line" | "column"> {
  const beforeError = input.slice(0, position);
  const lines = beforeError.split(/\r\n|\r|\n/);

  return {
    position,
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1
  };
}
