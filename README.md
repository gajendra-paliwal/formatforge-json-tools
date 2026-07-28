# @formatforge/json-tools

Fast, lightweight TypeScript utilities for formatting, validating, and transforming JSON in browsers and Node.js.

[![CI](https://github.com/gajendra-paliwal/formatforge-json-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/gajendra-paliwal/formatforge-json-tools/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@formatforge/json-tools.svg)](https://www.npmjs.com/package/@formatforge/json-tools)
[![license](https://img.shields.io/npm/l/@formatforge/json-tools.svg)](./LICENSE)

> Status: early development. The public API may expand before version 1.0.0.

## Features

- Format JSON strings and JavaScript values
- Validate JSON without throwing
- Parse JSON with line, column, and character-position errors
- Flatten and unflatten nested objects and arrays with escaped paths
- Deep clone and merge JSON-compatible data without mutation
- Recursively sort object keys while preserving array order
- Remove configurable empty values from nested JSON
- Read and immutably update JSON using RFC 6901 JSON Pointers
- Query JSON using a safe, dependency-free JSONPath subset
- Infer Draft 2020-12 JSON Schemas and validate JSON against a practical schema subset
- Choose indentation from 0 to 10 spaces
- Recursively sort object keys while preserving array order
- ESM and CommonJS builds
- TypeScript declarations included
- Browser-friendly and dependency-free at runtime

## Installation

```bash
npm install @formatforge/json-tools
```

## Quick start

```ts
import { formatJson } from "@formatforge/json-tools";

const formatted = formatJson('{"name":"FormatForge","active":true}');

console.log(formatted);
```

Output:

```json
{
  "name": "FormatForge",
  "active": true
}
```

## API

### `formatJson(input, options?)`

Parses string input as JSON and returns a formatted JSON document. Non-string values are serialized directly.

```ts
interface FormatJsonOptions {
  indent?: number;
  sortKeys?: boolean;
}
```

#### Custom indentation

```ts
formatJson({ name: "FormatForge" }, { indent: 4 });
```

#### Sort object keys

```ts
formatJson(
  {
    z: 1,
    a: {
      y: 2,
      b: 3
    }
  },
  { sortKeys: true }
);
```

Sorting is recursive for objects. Array item order is never changed.

#### Errors

`formatJson` throws:

- `SyntaxError` for invalid JSON strings
- `RangeError` when `indent` is not an integer from 0 to 10
- `TypeError` when the root value cannot be represented as a JSON document
- Native `JSON.stringify` errors for unsupported structures such as circular references or `BigInt`

### `isValidJson(input)`

Returns `true` when the input contains one complete JSON document.

```ts
import { isValidJson } from "@formatforge/json-tools";

isValidJson('{"name":"FormatForge"}'); // true
isValidJson('{"name":}'); // false
```

### `parseJson(input)`

Parses JSON and throws `JsonParseError` with `line`, `column`, and `position` when parsing fails.

```ts
import { JsonParseError, parseJson } from "@formatforge/json-tools";

try {
  const value = parseJson<{ name: string }>('{"name":"FormatForge"}');
  console.log(value.name);
} catch (error) {
  if (error instanceof JsonParseError) {
    console.error(error.line, error.column, error.message);
  }
}
```

### `validateJson(input)`

Validates and parses JSON without throwing for malformed input. The return value is a discriminated union.

```ts
import { validateJson } from "@formatforge/json-tools";

const result = validateJson('{"name":}');

if (!result.valid) {
  console.log(result.error.line);
  console.log(result.error.column);
  console.log(result.error.message);
}
```

Success result:

```ts
{ valid: true, value: unknown, error: null }
```

Failure result:

```ts
{
  valid: false,
  value: null,
  error: { message: string, position: number, line: number, column: number }
}
```


### `flattenJson(input, options?)`

Converts nested JSON into path/value pairs. Object keys use dot notation, arrays use bracket indexes, and reserved path characters are escaped.

```ts
import { flattenJson } from "@formatforge/json-tools";

flattenJson({
  customer: {
    name: "Asha",
    orders: [{ id: 101 }]
  }
});
```

Output:

```ts
{
  "customer.name": "Asha",
  "customer.orders[0].id": 101
}
```

Use `{ delimiter: "/" }` to choose a different single-character object-key delimiter. Primitive and empty root values use the empty path (`""`). Empty object keys are rejected because they cannot be represented unambiguously.

### `unflattenJson(input, options?)`

Restores data produced by `flattenJson`. It rejects malformed paths, conflicting assignments, sparse arrays, and prototype-pollution keys.

```ts
import { unflattenJson } from "@formatforge/json-tools";

unflattenJson({
  "customer.name": "Asha",
  "customer.orders[0].id": 101
});
```

### `deepClone(input)`

Creates an independent recursive clone of a JSON-compatible value.

```ts
const cloned = deepClone({ profile: { tags: ["json"] } });
```

Non-JSON values such as `Date`, functions, symbols, circular references, `NaN`, and `Infinity` are rejected.

### `deepMerge(target, source, options?)`

Recursively merges two JSON objects without mutating either input. Arrays are replaced by default.

```ts
const merged = deepMerge(
  { profile: { name: "Asha" }, tags: ["json"] },
  { profile: { active: true }, tags: ["tools"] }
);
```

Concatenate arrays when needed:

```ts
deepMerge(left, right, { arrayStrategy: "concat" });
```

### `sortJsonKeys(input, options?)`

Returns a recursively key-sorted clone while preserving array item order.

```ts
sortJsonKeys({ z: 1, a: { y: 2, b: 3 } });
```

A custom key comparator can be provided through the `compare` option.

### `removeEmpty(input, options?)`

Recursively removes empty nested values without mutating the input. By default it removes `null`, empty strings, empty arrays, and empty objects.

```ts
removeEmpty({
  name: "FormatForge",
  note: "",
  metadata: {},
  tags: ["json", null]
});
```

Configure individual behaviours with `removeNull`, `removeEmptyStrings`, `removeEmptyArrays`, `removeEmptyObjects`, and `trimStrings`.

## Compare and diff

### `isDeepEqual(left, right)`

Performs structural equality for JSON-compatible values. Object key order is ignored, while array order remains significant.

```ts
import { isDeepEqual } from "@formatforge/json-tools";

isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true
isDeepEqual([1, 2], [2, 1]); // false
```

### `diffJson(left, right, options?)`

Returns deterministic added, removed, and changed entries. Paths follow RFC 6901 JSON Pointer syntax.

```ts
import { diffJson } from "@formatforge/json-tools";

diffJson(
  { name: "Asha", active: false },
  { name: "Asha", active: true, role: "admin" }
);
// [
//   { type: "changed", path: "/active", left: false, right: true },
//   { type: "added", path: "/role", right: "admin" }
// ]
```

Use `{ maxDifferences: 100 }` to stop collecting after a chosen number of differences.

### `compareJson(left, right, options?)`

Returns the same difference list with `equal`, `added`, `removed`, and `changed` summary fields.

```ts
const result = compareJson({ total: 10 }, { total: 12 });
// result.equal === false
// result.changed === 1
```

## Package formats

The package provides:

- ESM: `dist/index.js`
- CommonJS: `dist/index.cjs`
- Type declarations: `dist/index.d.ts`


### JSON Pointer (RFC 6901)

Read, check, update, remove, and enumerate values with standards-based JSON Pointer paths. Mutating helpers return a new JSON value and do not modify the input.

```ts
import {
  getPointer,
  hasPointer,
  listPointers,
  removePointer,
  setPointer
} from "@formatforge/json-tools";

const document = {
  user: { name: "Ada" },
  orders: [{ total: 25 }]
};

getPointer(document, "/user/name"); // "Ada"
hasPointer(document, "/orders/0"); // true

const updated = setPointer(document, "/user/name", "Grace");
const appended = setPointer(updated, "/orders/-", { total: 50 });
const cleaned = removePointer(appended, "/orders/0");

listPointers(cleaned); // ["/user/name", "/orders/0/total"]
```

Use `escapePointer` and `unescapePointer` for property names containing `/` or `~`. The empty pointer (`""`) selects the root value.

## JSON Schema

### `generateSchema(value, options?)`

Generates a Draft 2020-12-compatible schema from JSON-compatible data. Object properties, required keys, nested arrays, mixed arrays, integers, numbers, strings, booleans, and null values are inferred.

```ts
import { generateSchema } from "@formatforge/json-tools";

const schema = generateSchema(
  { id: 1, name: "Asha", tags: ["json", "tools"] },
  { title: "User", additionalProperties: false }
);
```

Use `inferSchema()` when the `$schema` declaration is not needed. Set `required: false` to omit generated required lists.

### `validateAgainstSchema(value, schema)`

Validates JSON without throwing and returns `{ valid, errors }`. Error paths use RFC 6901 JSON Pointer notation.

```ts
import { validateAgainstSchema } from "@formatforge/json-tools";

const result = validateAgainstSchema(
  { id: "1" },
  { type: "object", properties: { id: { type: "integer" } }, required: ["id"] }
);

if (!result.valid) console.log(result.errors);
```

The dependency-free validator supports types, properties, required, items, additionalProperties, enum, const, anyOf, allOf, oneOf, not, string constraints, numeric constraints, and array constraints. It is a practical subset rather than a complete implementation of every JSON Schema Draft 2020-12 keyword. `isValidAgainstSchema()` returns only a boolean.

### `mergeSchemas(schemaA, schemaB)`

Merges inferred schemas, combining types and object properties while retaining only required properties present in both object shapes.

## Development

```bash
npm install
npm run check
```

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run dev
```


## JSONPath queries

Query nested JSON without `eval` or runtime dependencies. Version 0.7.0 supports the root selector, dot properties, quoted bracket properties, array indexes, and object/array wildcards.

```ts
import { exists, find, first, query, select } from "@formatforge/json-tools";

const data = {
  users: [
    { name: "Asha", role: "admin" },
    { name: "David", role: "editor" }
  ]
};

query(data, "$.users[*].name");
// ["Asha", "David"]

first(data, "$.users[*].role");
// "admin"

exists(data, "$.users[1]");
// true

select(data, "$.users[*].name");
// [
//   { pointer: "/users/0/name", value: "Asha" },
//   { pointer: "/users/1/name", value: "David" }
// ]

find(data, "$.users[*].name");
// { pointer: "/users/0/name", value: "Asha" }
```

Supported selectors:

```text
$
$.user.name
$.orders[0]
$.orders[*].price
$.*
$["property.with.dots"]
$['property/with/slashes']
```

Not supported in this release: recursive descent, filters, slices, unions, negative indexes, and script expressions. Missing properties and out-of-range indexes return no matches; malformed expressions throw `JsonPathError`. Match pointers use RFC 6901 escaping.

## Roadmap

Planned capabilities include JSON Schema inference and validation, canonical JSON, stable stringification, benchmarks, and expanded JSONPath selectors.

## Browser tool

Use the hosted [FormatForge JSON Studio](https://formatforge.in/tools/json-studio) for interactive formatting and validation without installing a package.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Please report security concerns according to [SECURITY.md](./SECURITY.md).

## License

MIT © 2026 Gajendra Paliwal

## JSON Patch

Create and apply RFC 6902 patches:

```ts
import { applyPatch, createPatch, invertPatch } from "@formatforge/json-tools";

const source = { name: "Alice", active: true };
const target = { name: "Bob", age: 30 };

const patch = createPatch(source, target);
const changed = applyPatch(source, patch).document;
const original = applyPatch(changed, invertPatch(source, patch)).document;
```

Supported operations: `add`, `remove`, `replace`, `move`, `copy`, and `test`. Paths follow RFC 6901 JSON Pointer syntax.
