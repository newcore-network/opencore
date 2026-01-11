## OpenCore Framework v0.2.9

### Highlights
- Migration of the parallel compute system to **native Node.js worker threads**, enabling true parallel execution with improved lifecycle management, error handling, and inter-thread communication.
- Improved NUI integration by **returning handler results in successful callback responses**, enabling more robust bidirectional UI ↔ runtime workflows.

### Changes
- Complete refactor of the parallel compute service:
  - Removal of virtual worker implementation.
  - Adoption of native `worker_threads` with a dedicated entrypoint (`native-worker.entry.ts`).
- Release workflow improvements:
  - GitHub Actions pinned to specific versions for better reproducibility.
  - Replacement of auto-generated release notes with a manually maintained `RELEASE.md`.
- Documentation improvements:
  - Consolidation of links in the README.
  - Addition of CI, npm, license, and TypeScript badges.
  - Homepage updated to https://opencorejs.dev.
- Examples updated to consistently use the `Server.Player` namespace in decorators (`Guard`, `OnNet`).

### Fixes
- Correct error handling in NUI callbacks using explicit `instanceof Error` checks.
- Minor documentation and example corrections to avoid namespace ambiguity.

### Notes
- This release does not introduce breaking changes to the public API.
- Highly recommended for projects using intensive NUI workflows or parallel execution.
- Compatible with the `v0.2.x` series.
