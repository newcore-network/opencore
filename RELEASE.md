## OpenCore Framework v0.3.2 

---

### Highlights

- **Command Parameter Intelligence**: The framework now correctly differentiates between TypeScript's spread operator (`...args: string[]`) and direct array parameters (`args: string[]`).
- **Improved Reflection**: Added source-code analysis to overcome TypeScript's reflection limitations (`design:paramtypes` ambiguity).

---

### Fixes

- **Spread Operator Handling**: Fixed an issue where using `...args` would sometimes result in arguments being joined by commas or passed incorrectly.
- **Array Parameter Support**: Resolved "join is not a function" errors when using `args: string[]` by ensuring the full array is passed as a single argument.
- **Argument Consistency**: Ensured that single-word and multi-word inputs are handled consistently across both `Command` and `OnNet` (NetEvents) systems.

---

### Internal Changes

- Added `getSpreadParameterIndices` to `function-helper.ts` for runtime parameter inspection.
- Updated `CommandMetadata` to track `hasSpreadParam`.
- Refined `validateAndExecuteCommand` to implement conditional argument flattening.

---

### Notes

This release ensures that the framework respects the intended TypeScript parameter types, providing a more intuitive and reliable experience for building complex command handlers and event listeners.