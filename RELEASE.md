## OpenCore Framework v1.1.0

### Added
- `@Controller()` now accepts an optional `ControllerOptions` object to define **default decorations** applied automatically to every method in the class.
  - `guard` — applies `@Guard` to all methods that do not declare their own.
  - `throttle` — applies `@Throttle` (supports both object and `[limit, windowMs]` tuple) to all methods that do not declare their own.
  - `requiresState` — applies `@RequiresState` to all methods that do not declare their own.
  - `public` — applies `@Public` to all methods that are not already marked `@Public()`.
- Explicit method-level decorators always **override** controller-level defaults. No breaking changes.

### Tests
- Added comprehensive unit tests for controller default decorations and override behavior.
