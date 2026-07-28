# Contributing

Thank you for contributing to `@formatforge/json-tools`.

## Development setup

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Create a focused branch from `main`.
4. Make the change and add or update tests.
5. Run `npm run check` before opening a pull request.

## Pull requests

Keep pull requests small and focused. Explain the problem, the chosen solution, and any public API changes. New behavior must include tests and documentation when relevant.

## Coding expectations

- Use TypeScript strict mode.
- Avoid runtime dependencies unless clearly justified.
- Preserve browser compatibility.
- Export public APIs through `src/index.ts`.
- Do not introduce breaking changes without discussion.

## Commit messages

Use concise imperative messages, for example:

```text
Add JSON minifier
Fix unsupported root value handling
Document formatter errors
```

## Reporting bugs

Use the bug report template and include a minimal reproduction, expected behavior, actual behavior, and environment details.
