## OpenCore Framework v1.3.0

### Added
- Typed library events through the `Register` type registry. The OpenCore CLI (vX.Y.Z+) now generates a `serverLibraryEvents` and a `clientLibraryEvents` map per resource from its `@OnLibraryEvent` listeners and, for the events no listener types, from the library's `emit()` calls.
- `createServerLibrary()`, `createClientLibrary()` and `createLibraryBase()` keep the library name as a literal type (`OpenCoreServerLibrary<'rp'>`), so `on()`, `once()`, `off()` and `emit()` are typed against that library's events: names autocomplete and payloads are checked against the listeners.
- `emit()` requires the payload of a generated event unless its listeners accept `undefined`.
- In strict mode (`build.typegen.strict`), a registered library rejects event names no listener or `emit()` declares. Unlike network events, it does not admit the framework's `opencore:*` names, as library events are local to a library.
- Exported the library helper types (`ServerLibraryEvents`, `ClientLibraryEvents`, `LooseLibraryEventMap`, `LibraryEventsOf`, `LibraryEventNameIn`, `LibraryEventNameOf`, `LibraryPayloadOf`, `LibraryEmitArgsOf`) from the package root.

### Changed
- `LibraryBus`, `OpenCoreLibraryBase`, `OpenCoreServerLibrary` and `OpenCoreClientLibrary` take type parameters for the library name and its event map. Both default to the previous loose form, so existing annotations such as `lib: OpenCoreServerLibrary` keep accepting any library.
- Without generated types, or for a library typegen has not registered, every library signature keeps its previous loose form, and an explicit payload type argument (`lib.emit<Payload>(...)`) keeps working.

### Notes
- Library events are keyed by library name across the whole project. Two unrelated libraries created with the same name in different resources have their events merged, and the CLI warns when it detects it; give one of them a different name.
