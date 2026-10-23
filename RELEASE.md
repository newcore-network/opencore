## OpenCore Framework v1.3.1

### Fixed
- Exported `AppearanceService` from the client runtime services (`src/runtime/client/services/index.ts`). It was missing from the barrel, so it could not be accessed from the client side of a project. Reported in #122 and fixed in #123.

### Contributors
- Thanks to [@SzybkiRito](https://github.com/SzybkiRito) (Mateusz Jakubczak) for reporting and fixing the missing client export in [#123](https://github.com/newcore-network/opencore/pull/123).
