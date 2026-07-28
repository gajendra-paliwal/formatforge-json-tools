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

## Package formats

The package provides:

- ESM: `dist/index.js`
- CommonJS: `dist/index.cjs`
- Type declarations: `dist/index.d.ts`

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

## Roadmap

Planned capabilities include minification, flattening and unflattening, key sorting utilities, and structural comparison.

## Browser tool

Use the hosted [FormatForge JSON Studio](https://formatforge.in/tools/json-studio) for interactive formatting and validation without installing a package.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Please report security concerns according to [SECURITY.md](./SECURITY.md).

## License

MIT © 2026 Gajendra Paliwal
