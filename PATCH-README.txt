FormatForge JSON Tools v0.7.0 JSONPath position test hotfix

Replace:
  tests/path.test.ts

Reason:
The parser reports token positions at the selector content. In
$.store[0]["name"], the opening quote for the quoted property is at
zero-based position 11. The previous test incorrectly expected the
opening bracket position 10.

No production source file is changed.

Run:
  npm run check
  npm audit
