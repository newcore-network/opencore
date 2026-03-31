## OpenCore Framework v1.0.6

### Added
- Added `RpcPublicError` and `serializeRpcError()` for safe RPC error exposure.
- Added `PUBLIC_RPC_ERROR_MESSAGE` as the default public message for unexpected RPC failures.
- Added transport exports for RPC error helpers through `src/adapters/contracts/transport`.
- Added unit and integration coverage for RPC error serialization and server RPC flow logging.

### Changed
- Updated server RPC processing to log handler failures with event, handler, player, and account context.
- Updated RPC handling to preserve explicit public errors while masking unexpected internal errors.
- Refined the RPC path so invalid payloads and session issues are logged with clearer warnings.

### Fixed
- Fixed RPC error leakage by sanitizing unexpected exceptions before they are returned to the client.
- Fixed RPC logger behavior so exposed errors can pass through with their original message and name.
- Fixed contract alignment across transport, server RPC processing, and test coverage.

### Notes
- This release tracks the `fix/rpc-logger` merge request (#51) and keeps the release note focused on the RPC error-handling changes.
