import type { JsonObject, JsonValue } from "../types/json";
import { escapePointer } from "../pointer";

export class JsonPathError extends Error {
  public readonly expression: string;
  public readonly position: number;

  public constructor(message: string, expression: string, position: number) {
    super(`${message} at position ${position}`);
    this.name = "JsonPathError";
    this.expression = expression;
    this.position = position;
  }
}

export interface JsonPathMatch {
  /** RFC 6901 JSON Pointer identifying the matched value. The root is an empty string. */
  pointer: string;
  value: JsonValue;
}

type PathToken =
  | { type: "property"; key: string; position: number }
  | { type: "index"; index: number; position: number }
  | { type: "wildcard"; position: number };

interface WorkingMatch {
  pointer: string;
  value: JsonValue;
}

/** Return every value matched by a supported JSONPath expression. */
export function query(document: JsonValue, expression: string): JsonValue[] {
  return select(document, expression).map((match) => match.value);
}

/** Return the first matched value, or undefined when the path has no match. */
export function first(document: JsonValue, expression: string): JsonValue | undefined {
  return find(document, expression)?.value;
}

/** Return true when at least one value matches the expression. */
export function exists(document: JsonValue, expression: string): boolean {
  return find(document, expression) !== undefined;
}

/** Return the first match with both its value and RFC 6901 pointer. */
export function find(document: JsonValue, expression: string): JsonPathMatch | undefined {
  return evaluate(document, parseJsonPath(expression), true)[0];
}

/** Return all matches with values and RFC 6901 pointers. */
export function select(document: JsonValue, expression: string): JsonPathMatch[] {
  return evaluate(document, parseJsonPath(expression), false);
}

/** Parse and validate the supported JSONPath subset. */
export function parseJsonPath(expression: string): ReadonlyArray<PathToken> {
  if (typeof expression !== "string") {
    throw new TypeError("JSONPath expression must be a string");
  }
  if (expression.length === 0 || expression[0] !== "$") {
    throw new JsonPathError('JSONPath expression must start with "$"', expression, 0);
  }

  const tokens: PathToken[] = [];
  let position = 1;

  while (position < expression.length) {
    const character = expression[position];

    if (character === ".") {
      const dotPosition = position;
      position += 1;
      if (position >= expression.length) {
        throw new JsonPathError("property name is missing after dot", expression, dotPosition);
      }
      if (expression[position] === "*") {
        tokens.push({ type: "wildcard", position });
        position += 1;
        continue;
      }

      const start = position;
      while (position < expression.length && isIdentifierCharacter(expression[position]!)) {
        position += 1;
      }
      if (start === position) {
        throw new JsonPathError("invalid property name after dot", expression, position);
      }
      tokens.push({ type: "property", key: expression.slice(start, position), position: start });
      continue;
    }

    if (character === "[") {
      const bracketPosition = position;
      position += 1;
      if (position >= expression.length) {
        throw new JsonPathError("unterminated bracket selector", expression, bracketPosition);
      }

      if (expression[position] === "*") {
        tokens.push({ type: "wildcard", position });
        position += 1;
        position = requireClosingBracket(expression, position, bracketPosition);
        continue;
      }

      const quote = expression[position];
      if (quote === '"' || quote === "'") {
        const parsed = parseQuotedProperty(expression, position, quote);
        tokens.push({ type: "property", key: parsed.value, position });
        position = requireClosingBracket(expression, parsed.nextPosition, bracketPosition);
        continue;
      }

      const indexStart = position;
      while (position < expression.length && isDigit(expression[position]!)) position += 1;
      if (indexStart === position) {
        throw new JsonPathError("bracket selector must contain an array index, wildcard, or quoted property", expression, position);
      }
      const rawIndex = expression.slice(indexStart, position);
      if (rawIndex.length > 1 && rawIndex[0] === "0") {
        throw new JsonPathError("array index cannot contain leading zeros", expression, indexStart);
      }
      const index = Number(rawIndex);
      if (!Number.isSafeInteger(index)) {
        throw new JsonPathError("array index is outside the safe integer range", expression, indexStart);
      }
      tokens.push({ type: "index", index, position: indexStart });
      position = requireClosingBracket(expression, position, bracketPosition);
      continue;
    }

    throw new JsonPathError(`unexpected character "${character}"`, expression, position);
  }

  return tokens;
}

function evaluate(document: JsonValue, tokens: ReadonlyArray<PathToken>, stopAfterFirst: boolean): JsonPathMatch[] {
  let matches: WorkingMatch[] = [{ pointer: "", value: document }];

  for (const token of tokens) {
    const next: WorkingMatch[] = [];

    for (const match of matches) {
      applyToken(match, token, next);
      if (stopAfterFirst && next.length > 0) break;
    }

    matches = next;
    if (matches.length === 0) break;
  }

  return matches;
}

function applyToken(match: WorkingMatch, token: PathToken, output: WorkingMatch[]): void {
  const { value, pointer } = match;

  if (token.type === "property") {
    if (isJsonObject(value) && hasOwn(value, token.key)) {
      output.push({ pointer: `${pointer}/${escapePointer(token.key)}`, value: value[token.key]! });
    }
    return;
  }

  if (token.type === "index") {
    if (Array.isArray(value) && token.index < value.length) {
      output.push({ pointer: `${pointer}/${token.index}`, value: value[token.index]! });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => output.push({ pointer: `${pointer}/${index}`, value: item }));
    return;
  }

  if (isJsonObject(value)) {
    Object.keys(value).forEach((key) => {
      output.push({ pointer: `${pointer}/${escapePointer(key)}`, value: value[key]! });
    });
  }
}

function parseQuotedProperty(expression: string, start: number, quote: '"' | "'"): { value: string; nextPosition: number } {
  let position = start + 1;
  let value = "";

  while (position < expression.length) {
    const character = expression[position]!;
    if (character === quote) {
      return { value, nextPosition: position + 1 };
    }
    if (character === "\\") {
      position += 1;
      if (position >= expression.length) {
        throw new JsonPathError("unterminated escape sequence", expression, position - 1);
      }
      const escaped = expression[position]!;
      const simpleEscapes: Record<string, string> = {
        '"': '"',
        "'": "'",
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t"
      };
      if (escaped === "u") {
        const hex = expression.slice(position + 1, position + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new JsonPathError("invalid Unicode escape sequence", expression, position - 1);
        }
        value += String.fromCharCode(Number.parseInt(hex, 16));
        position += 5;
        continue;
      }
      if (!(escaped in simpleEscapes)) {
        throw new JsonPathError(`invalid escape sequence "\\${escaped}"`, expression, position - 1);
      }
      value += simpleEscapes[escaped]!;
      position += 1;
      continue;
    }
    value += character;
    position += 1;
  }

  throw new JsonPathError("unterminated quoted property", expression, start);
}

function requireClosingBracket(expression: string, position: number, bracketPosition: number): number {
  if (expression[position] !== "]") {
    throw new JsonPathError("unterminated or malformed bracket selector", expression, bracketPosition);
  }
  return position + 1;
}

function isIdentifierCharacter(character: string): boolean {
  return /[A-Za-z0-9_$-]/.test(character);
}

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}
