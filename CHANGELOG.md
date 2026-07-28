# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/gajendra-paliwal/formatforge-json-tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gajendra-paliwal/formatforge-json-tools/releases/tag/v0.1.0
