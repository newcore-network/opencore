## OpenCore Framework v1.0.8

### Added
- Added framework event bridging from `CORE` to `RESOURCE` for `@OnFrameworkEvent` listeners.

### Changed
- Updated `@OnRuntimeEvent` and `@OnFrameworkEvent` documentation to clarify handler arguments and cross-context behavior.

### Fixed
- Fixed `@OnFrameworkEvent` delivery so built-in framework lifecycle events can reach `RESOURCE` listeners with hydrated payloads.