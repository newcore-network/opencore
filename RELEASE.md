## OpenCore Framework v1.2.0

### Added
- Added the `Register` type registry, exported from `@open-core/framework/register`, which the OpenCore CLI (v1.6.0+) augments with the generated `.opencore/opencore.gen.ts` of every resource.
- Typed `events.emit()`, `player.emit()`, `rpc.call()`, `rpc.notify()` and `WebView.send()` against the registered handlers: names autocomplete and payloads are checked against the handler signatures.
- Typed `rpc.call()` results from the handler's return type.
- Added strict mode, enabled through the CLI's `build.typegen.strict`, which rejects names no handler declares while still accepting the framework's own `opencore:*` events.
- Exported the registry helper types (`ClientEvents`, `ServerEvents`, `ServerRpc`, `ClientRpc`, `Commands`, `ViewSend`, `ViewReceive`, `NameOf`, `StrictNameOf`, `ArgsOf`, `RpcArgsOf`, `RpcResultOf`, `RpcCallResultOf`, `PayloadOf`, `DropFirst`, `IsRegistered`) from the package root.

### Changed
- Without generated types every signature keeps its previous loose form, so enabling or disabling typegen requires no source changes.
- `WebViewBridge`, `NuiBridge` and `createWebView()` now default their message maps to the registered `ViewSend` and `ViewReceive`, and accept any object type as a map.
- Removed the untyped `emit(event: string, target, ...args: unknown[])` overload of `EventsAPI`. It matched every call the typed signature rejected; without generated types the remaining signature is equally loose.
- For a registered RPC name, `rpc.call()` always resolves to the handler's result and ignores an explicit `TResult`. `TResult` still types calls to unregistered names.

### Fixed
- Prevented a contextual type from overriding a registered RPC result, which let `const x: Promise<string> = rpc.call('bank:getBalance')` compile against a handler returning `number`.
- Fixed the `WebView` and `NUI` singletons being published with a pinned loose type, which kept `send()` from ever being narrowed.
