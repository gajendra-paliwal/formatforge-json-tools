# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-07-28

### Added

- Deterministic JSON serialization with `stableStringify`.
- Compact canonical output with `canonicalize`.
- JSON-text normalization with `canonicalizeJson`.
- Canonical-form detection with `isCanonicalJson`.
- Numeric and string indentation compatible with JSON.stringify limits.
- Custom object-key comparators while preserving array order.
- `JsonCanonicalizationError` with precise value-path context.
- Strict rejection of circular references, non-finite numbers, unsupported values, and non-plain objects.
- Canonical serialization tests covering recursion, formatting, immutability, path reporting, repeated references, and malformed input.

## [0.8.0] - 2026-07-28

### Added

- Draft 2020-12-compatible JSON Schema generation with `generateSchema`.
- Metadata-free schema inference with `inferSchema`.
- Dependency-free schema validation with structured RFC 6901 error paths.
- Boolean validation through `isValidAgainstSchema`.
- Schema merging for mixed arrays and evolving object shapes.
- Support for core type, object, array, string, number, enum, const, and composition keywords.
- JSON Schema tests covering inference, merging, nested validation, constraints, and generated schemas.

## [0.7.0] - 2026-07-28

### Added

- Safe, dependency-free JSONPath query engine.
- `query`, `first`, and `exists` helpers for value-oriented lookups.
- `select` and `find` helpers returning matched values with RFC 6901 pointers.
- Root, dot-property, quoted bracket-property, array-index, and wildcard selectors.
- `parseJsonPath` and `JsonPathError` with expression and error-position context.
- JSONPath tests covering nested objects, arrays, wildcards, escaping, missing values, invalid syntax, and immutability.

## [0.6.0] - 2026-07-28

### Added

- RFC 6901 JSON Pointer parsing, escaping, and unescaping.
- `getPointer` and `hasPointer` for safe JSON value lookup.
- Immutable `setPointer` and `removePointer` operations.
- Array append support through the `-` token.
- `listPointers` for enumerating escaped leaf and container paths.
- `JsonPointerError` with pointer, token, and token-index context.
- JSON Pointer tests covering objects, arrays, root values, escaping, immutability, malformed paths, and prototype safety.

## [0.5.0] - 2026-07-28

### Added

- RFC 6902 JSON Patch creation with `createPatch`.
- Immutable patch application with `applyPatch`.
- Patch structure validation with `validatePatch`.
- Reversible patches with `invertPatch(document, patch)`.
- Support for add, remove, replace, move, copy, and test operations.
- RFC 6901 JSON Pointer escaping and root-document operations.


## [0.4.0] - 2026-07-28

### Added

- `isDeepEqual` for structural JSON equality with order-insensitive object keys and order-sensitive arrays
- `diffJson` with deterministic RFC 6901 JSON Pointer paths and added, removed, and changed records
- `compareJson` with difference records and summary counts
- Configurable `maxDifferences` limit for large comparisons
- Compare test suite covering nested objects, arrays, escaped paths, root changes, invalid inputs, and result limits

## [0.3.0] - 2026-07-28

### Added

- `flattenJson` with escaped object-key paths, bracket array indexes, custom delimiters, and empty-root support
- `unflattenJson` with conflict detection, sparse-array validation, and prototype-pollution protection
- `deepClone` for independent JSON-compatible copies
- `deepMerge` with replace and concatenate array strategies
- `sortJsonKeys` with recursive sorting and custom comparators
- `removeEmpty` with configurable empty-value handling
- Exported `JsonPrimitive`, `JsonValue`, and `JsonObject` types
- Transform test suite covering nested arrays, escaped keys, immutability, invalid input, and custom options

## [0.2.0] - 2026-07-28

### Added

- `isValidJson` for boolean JSON validation
- `parseJson` for typed parsing with structured location errors
- `validateJson` for non-throwing validation and parsing
- `JsonParseError` with line, column, and zero-based character position
- Validator test suite covering valid documents, malformed JSON, primitives, and typed parsing

## [0.1.1] - 2026-07-28

### Added

- Repository documentation and contribution guidelines
- GitHub Actions continuous integration
- Package publishing safeguards and Node.js engine declaration
- Tests for primitives, array-order preservation, and non-serializable root values

### Changed

- `formatJson` now throws a `TypeError` instead of returning `undefined` for unsupported root values

## [0.1.0] - 2026-07-28

### Added

- Initial TypeScript package foundation
- `formatJson` with configurable indentation and recursive key sorting
- ESM, CommonJS, source map, and declaration builds
- Vitest test suite

[Unreleased]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/releases/tag/v0.1.0
