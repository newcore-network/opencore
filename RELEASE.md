## OpenCore Framework v1.0.7

### Added
- Added `RpcPublicError` and `serializeRpcError()` for safe RPC error exposure.
- Added structured benchmark suites and reporting.

### Changed
- Updated server RPC logging and error handling for clearer failures.
- Updated benchmark metrics to include duration tracking and line-delimited JSON output.

### Fixed
- Fixed RPC error leakage by sanitizing unexpected exceptions before they are returned to the client.
- Fixed `PlayerPersistenceService` bootstrap so `PlayerPersistenceContract` implementations run on session load.

### Notes
- This release tracks the current branch changes for RPC logging, benchmarks, and session persistence.
