import type { JsonValue } from "../types/json";
import type { FlattenedJson } from "./flatten";
import { assertDelimiter, assertJsonValue } from "./shared";

export interface UnflattenJsonOptions {
  /** Character used between object-key path segments. Default: `.` */
  delimiter?: string;
}

type PathToken =
  | { type: "key"; value: string }
  | { type: "index"; value: number };

/** Restores a JSON value previously produced by `flattenJson`. */
export function unflattenJson(
  input: FlattenedJson,
  options: UnflattenJsonOptions = {}
): JsonValue {
  if (input === null || Array.isArray(input) || typeof input !== "object") {
    throw new TypeError("input must be an object containing flattened paths");
  }

  const delimiter = options.delimiter ?? ".";
  assertDelimiter(delimiter);

  const entries = Object.entries(input);
  if (entries.length === 0) {
    return {};
  }

  if (Object.prototype.hasOwnProperty.call(input, "")) {
    if (entries.length !== 1) {
      throw new TypeError('the empty root path "" cannot be combined with other paths');
    }

    const rootValue = input[""];
    assertJsonValue(rootValue);
    return cloneJsonValue(rootValue);
  }

  const firstTokens = parsePath(entries[0]![0], delimiter);
  let root: JsonValue = firstTokens[0]?.type === "index" ? [] : {};

  for (const [path, value] of entries) {
    assertJsonValue(value, path);
    const tokens = parsePath(path, delimiter);

    if (tokens.length === 0) {
      throw new TypeError("flattened paths cannot be empty here");
    }

    root = assignPath(root, tokens, cloneJsonValue(value), path);
  }

  assertCompleteArrays(root);
  return root;
}

function assignPath(
  root: JsonValue,
  tokens: PathToken[],
  value: JsonValue,
  originalPath: string
): JsonValue {
  let current: JsonValue = root;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const isLast = index === tokens.length - 1;
    const nextToken = tokens[index + 1];

    if (token.type === "index") {
      if (!Array.isArray(current)) {
        throw new TypeError(`path conflict at "${originalPath}": expected an array`);
      }

      if (isLast) {
        if (current[token.value] !== undefined) {
          throw new TypeError(`duplicate or conflicting path "${originalPath}"`);
        }
        current[token.value] = value;
        continue;
      }

      const expectedContainer: JsonValue = nextToken?.type === "index" ? [] : {};
      const existing = current[token.value];
      if (existing === undefined) {
        current[token.value] = expectedContainer;
        current = expectedContainer;
      } else {
        ensureContainerType(existing, nextToken, originalPath);
        current = existing;
      }
      continue;
    }

    if (Array.isArray(current) || current === null || typeof current !== "object") {
      throw new TypeError(`path conflict at "${originalPath}": expected an object`);
    }

    if (isUnsafeKey(token.value)) {
      throw new TypeError(`unsafe object key "${token.value}" in path "${originalPath}"`);
    }

    if (isLast) {
      if (Object.prototype.hasOwnProperty.call(current, token.value)) {
        throw new TypeError(`duplicate or conflicting path "${originalPath}"`);
      }
      defineJsonProperty(current, token.value, value);
      continue;
    }

    const expectedContainer: JsonValue = nextToken?.type === "index" ? [] : {};
    const existing = current[token.value];
    if (existing === undefined) {
      defineJsonProperty(current, token.value, expectedContainer);
      current = expectedContainer;
    } else {
      ensureContainerType(existing, nextToken, originalPath);
      current = existing;
    }
  }

  return root;
}

function ensureContainerType(
  value: JsonValue,
  nextToken: PathToken | undefined,
  path: string
): void {
  const expectsArray = nextToken?.type === "index";
  const isObjectContainer = value !== null && typeof value === "object" && !Array.isArray(value);

  if ((expectsArray && !Array.isArray(value)) || (!expectsArray && !isObjectContainer)) {
    throw new TypeError(`path conflict at "${path}"`);
  }
}

function parsePath(path: string, delimiter: string): PathToken[] {
  const tokens: PathToken[] = [];
  let key = "";
  let index = 0;

  const pushKey = (): void => {
    if (key.length === 0) {
      throw new TypeError(`invalid flattened path "${path}"`);
    }
    tokens.push({ type: "key", value: key });
    key = "";
  };

  while (index < path.length) {
    const character = path[index]!;

    if (character === "\\") {
      index += 1;
      if (index >= path.length) {
        throw new TypeError(`invalid escape sequence in path "${path}"`);
      }
      key += path[index]!;
      index += 1;
      continue;
    }

    if (character === delimiter) {
      if (key.length > 0) {
        pushKey();
      } else if (tokens.length === 0 || tokens[tokens.length - 1]?.type !== "index") {
        throw new TypeError(`invalid flattened path "${path}"`);
      }

      index += 1;
      if (index >= path.length || path[index] === delimiter) {
        throw new TypeError(`invalid flattened path "${path}"`);
      }
      continue;
    }

    if (character === "[") {
      if (key.length > 0) {
        tokens.push({ type: "key", value: key });
        key = "";
      }

      const closingIndex = path.indexOf("]", index + 1);
      if (closingIndex === -1) {
        throw new TypeError(`unclosed array index in path "${path}"`);
      }

      const indexText = path.slice(index + 1, closingIndex);
      if (!/^(0|[1-9]\d*)$/.test(indexText)) {
        throw new TypeError(`invalid array index in path "${path}"`);
      }

      tokens.push({ type: "index", value: Number(indexText) });
      index = closingIndex + 1;

      if (index < path.length && path[index] !== delimiter && path[index] !== "[") {
        throw new TypeError(`invalid token after array index in path "${path}"`);
      }
      continue;
    }

    key += character;
    index += 1;
  }

  if (key.length > 0) {
    tokens.push({ type: "key", value: key });
  }

  if (path.endsWith(delimiter)) {
    throw new TypeError(`invalid flattened path "${path}"`);
  }

  return tokens;
}

function defineJsonProperty(
  target: Record<string, JsonValue>,
  key: string,
  value: JsonValue
): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function assertCompleteArrays(value: JsonValue, path = "$"): void {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value) || value[index] === undefined) {
        throw new TypeError(`missing array index at "${path}[${index}]"`);
      }
      assertCompleteArrays(value[index]!, `${path}[${index}]`);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      assertCompleteArrays(nestedValue, `${path}.${key}`);
    }
  }
}

function isUnsafeKey(key: string): boolean {
  return key === "__proto__" || key === "prototype" || key === "constructor";
}

function cloneJsonValue<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonValue(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneJsonValue(nestedValue)])
    ) as T;
  }

  return value;
}
