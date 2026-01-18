## OpenCore Framework v0.3.1 

---

### Highlights

- **Hot-Reload Stability**: Fixed critical race condition that caused resources to hang during hot-reload
- **Command System Reliability**: Improved command registration and execution flow with better error handling (Now Array types means spreed operator in commands and netEvents parameters handler, string[] === rest of the arguments, and supporting spreed operator as string[])
- **Bidirectional Core Detection**: Enhanced core ready detection mechanism for late-starting resources

---

### Changes

- **Core Initialization**
  - Added bidirectional ready detection with `core:request-ready` event for hot-reload scenarios
  - Reordered core dependency detection to register event listener before requesting status
  - Removed artificial delay in `ReadyController`, set `isReady=true` immediately

- **Command System**
  - Allow command re-registration from same resource during hot-reload
  - Fixed tuple schema validation to properly handle rest array parameters
  - Added comprehensive debug logging for command registration and execution flow
  - Enhanced error handling in remote command service

---

### Notes

This release focuses on improving the developer experience during hot-reload scenarios. Resources that are restarted or hot-reloaded will now properly detect the Core's ready state without hanging, and commands will continue to function correctly after resource restarts.
