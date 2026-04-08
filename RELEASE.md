## OpenCore Framework v1.0.10

### Added
- Added authoritative CORE exports to link and unlink player accounts from remote resources.
- Added debug logs for remote player session mutations delegated from `RESOURCE` to `CORE`.

### Fixed
- Fixed `RESOURCE` player session mutations so `player.linkAccount()`, `player.unlinkAccount()`, `player.setMeta()` and state changes propagate to CORE.
- Fixed secure `@OnNet` and `@OnRPC` handlers being blocked in sibling resources after successful authentication performed from a `RESOURCE` auth module.