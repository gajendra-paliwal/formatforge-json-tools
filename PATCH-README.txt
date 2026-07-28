FormatForge JSON Tools v0.9.0 - Deterministic & Canonical JSON

Apply this archive to the repository root while on feature/canonical-json.
Replace matching files, then run:

  npm install
  npm run check
  npm audit

Added public APIs:
- stableStringify
- canonicalize
- canonicalizeJson
- isCanonicalJson
- JsonCanonicalizationError

The canonical form is deterministic and intended for comparisons, cache keys,
and snapshots. It intentionally does not claim RFC 8785 JCS compliance.

This merge-safe patch excludes .git, node_modules, and dist.
