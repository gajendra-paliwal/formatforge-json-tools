FormatForge JSON Tools v0.3.0 - Merge-Safe Transform Patch

Baseline:
- Apply to the committed v0.2.0 repository.

How to apply:
1. Extract this ZIP into the repository root.
2. Allow files with matching paths to be replaced.
3. Run:
     npm install
     npm run check
     npm audit

Expected project state:
- Package version: 0.3.0
- Existing formatter and validator code remains unchanged.
- New APIs:
  flattenJson
  unflattenJson
  deepClone
  deepMerge
  sortJsonKeys
  removeEmpty
- New exported types:
  JsonPrimitive
  JsonValue
  JsonObject

Patch files only:
- package.json
- package-lock.json
- README.md
- CHANGELOG.md
- src/index.ts
- src/types/json.ts
- src/transform/*.ts
- tests/transform.test.ts

No .git, node_modules, or dist files are included.
