## OpenCore Framework v1.0.5

### Added
- Added new client adapter ports for camera, ped, vehicle, progress, spawn, local player, runtime bridge, and WebView integration, with matching node runtime implementations.
- Added support for WebView chat mode, richer client UI/runtime abstractions, and cleaner adapter-facing contracts/exports.
- Added server-side improvements for command handling, including command validation, default function parameter support, and standardized system event names.
- Added more coverage around parallel compute, vehicle modification, vehicle sync state, player state sync, adapters, and command execution flows.
- Added Husky pre-commit and pre-push hooks for local quality checks.

### Changed
- Refactored client services to rely on explicit adapter ports instead of direct runtime assumptions, especially for camera, ped, progress, spawn, and vehicle flows.
- Refactored logging so logger writes use string log levels and runtime log domain labels are derived dynamically from the active resource.
- Refactored worker execution to use inline worker scripts with performance tracking in the parallel compute pipeline.
- Updated package/tooling setup to TypeScript 6 and refreshed package exports, scripts, and dependency configuration.

### Fixed
- Fixed command schema handling so exported/remote commands support default parameters more reliably.
- Fixed transport/event contract alignment across node events and RPC layers.
- Fixed several test, lint, and export consistency issues while expanding automated coverage.

### Notes
- This release covers the full `master...v1` delta and keeps the release notes compact by grouping related adapter/runtime refactors instead of listing each port separately.
