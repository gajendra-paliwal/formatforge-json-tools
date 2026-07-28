FormatForge JSON Tools v0.5.0 - Array Inverse Hotfix

Merge-safe patch. Replace only these files:
- src/patch/patch.ts
- tests/patch.test.ts

Fixes:
- invertPatch() no longer emits an invalid remove path ending in '/-' for array appends.
- Array add/copy inverses now remove the inserted element at its concrete numeric index.
- Array insertion inverses no longer incorrectly replace the previous array item.
- Root add/copy inverse restores the original document.
- Adds a regression test for numeric array insertion inversion.

After extraction, run:
  npm run check
  npm audit

Expected test count: 63 tests.
