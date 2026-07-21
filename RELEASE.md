## OpenCore Framework v1.1.0

### Added
- Added CodeQL analysis for JavaScript and TypeScript on `master`, `develop`, pull requests, and a weekly schedule.
- Added Dependabot updates for npm packages and GitHub Actions.

### Changed
- Replaced development-mode event history eviction with a fixed-capacity circular buffer.

### Fixed
- Redacted raw command arguments from suspicious-command rejection logs while retaining the argument count.
- Returned a generic public error for invalid RPC payloads without exposing validation details to callers.
- Preserved invalid RPC payload details in server-only logs for diagnostics.
- Kept rate-limit hits until their configured throttle window has elapsed.
- Prevented unbounded pending-event tracking without expiring valid long-running operations.
