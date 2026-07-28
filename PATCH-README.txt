FormatForge JSON Tools v0.4.0 — Compare & Diff Merge-Safe Patch
================================================================

Baseline: committed v0.3.0 release

Copy this patch into the repository root and replace matching files.
The patch does not contain .git, node_modules, or dist.

New APIs
--------
- isDeepEqual(left, right)
- diffJson(left, right, options?)
- compareJson(left, right, options?)

Highlights
----------
- Deterministic added, removed, and changed differences
- RFC 6901 JSON Pointer paths
- Correct escaping for '/' and '~' in property names
- Object property order ignored
- Array order preserved and compared
- Root-value differences supported
- Optional maxDifferences safety limit
- Non-JSON and circular inputs rejected
- Summary counts from compareJson

Files added
-----------
- src/compare/compare.ts
- src/compare/index.ts
- tests/compare.test.ts

Files updated
-------------
- src/index.ts
- package.json
- package-lock.json
- README.md
- CHANGELOG.md

Validation
----------
TypeScript compilation was checked successfully with:
  tsc --noEmit

Run locally after applying:
  npm install
  npm run check
  npm audit

Expected:
- 47 total tests (based on v0.3.0 baseline)
- TypeScript pass
- ESM/CJS/DTS build pass
- 0 vulnerabilities
