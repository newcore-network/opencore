## OpenCore Framework v1.0.13

### Fixed
- Fixed `@Guard` rejecting valid players with `clientID: 0`, which affected the first RageMP player connected to a fresh server.
- Fixed `@Throttle` skipping rate-limit enforcement for valid players with `clientID: 0`, preventing an unthrottled first-player security bypass on RageMP.

### Tests
- Added regression coverage for `@Guard` and `@Throttle` with `clientID: 0`.
