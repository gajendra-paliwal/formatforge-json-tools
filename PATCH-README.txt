FormatForge JSON Tools v0.8.0 - JSON Schema Merge-Safe Patch

Apply this patch while on the feature/json-schema branch.
Extract into the repository root and replace matching files.

Added:
- generateSchema
- inferSchema
- validateAgainstSchema
- isValidAgainstSchema
- mergeSchemas
- JSON Schema types and structured validation errors
- Draft 2020-12 metaschema declaration for generated schemas
- Core object, array, primitive, enum, const, composition, string,
  numeric, and array constraint validation
- JSON Schema test suite

Updated:
- src/index.ts
- package.json and package-lock.json to v0.8.0
- README.md
- CHANGELOG.md

Verification:
  npm install
  npm run check
  npm audit

Notes:
- Runtime remains dependency-free.
- The validator intentionally implements a practical documented subset of
  JSON Schema Draft 2020-12, not every keyword in the specification.
- This archive excludes .git, node_modules, and dist.
