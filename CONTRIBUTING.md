# Contributing

Use Node 24 and pnpm 11.25.0. Install from the frozen lockfile, build with `pnpm build`, and run `pnpm test`. Use the separate seeded demo to exercise UI changes.

Keep changes in the existing Angular/Nest feature modules and preserve the original theme unless a design change is part of the issue. Document function inputs/outputs and important authorization or transaction invariants. Add regression tests for security, persisted behavior and migrations. Include a screenshot for visible UI changes.

Never commit a database, session key, real customer upload, `.env`, credentials, local logs or a source backup. Use fictional `.example.test` addresses in fixtures. Schema changes require an explicit migration and a preservation test; do not turn on synchronization for existing databases.

A pull request should state the problem, the resulting behavior and the checks run. CI must pass before merging.
