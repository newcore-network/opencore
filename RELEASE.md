## OpenCore Framework v0.3.0 ⚠️ BREAKING CHANGE

> **This release introduces breaking changes.**
> Backward compatibility with previous versions is **not guaranteed**.
> Please read the notes carefully before upgrading.

---

### Highlights

- **Hard runtime separation (Client / Server)**  
  OpenCore now enforces a strict boundary between client and server runtimes.  
  Server-only code can no longer be accidentally bundled into client resources.

- **Kernel-first public API**  
  All runtime-agnostic logic has been consolidated into a single, safe `kernel` entrypoint exposed at the package root.

- **Smaller and cleaner client bundles**  
  Client bundles are significantly lighter after removing unintended server-side dependencies and Node-specific code.

---

### 🚨 Breaking Changes

- The package root (`@open-core/framework`) now **only exposes kernel (runtime-agnostic) APIs**.
- Runtime-specific APIs **must** be imported explicitly:
  - `@open-core/framework/client`
  - `@open-core/framework/server`
- Deep internal imports (e.g. `@open-core/framework/kernel/...`) are **no longer supported** and will fail at build time.
- The generic `runtime/index.ts` entrypoint has been **removed** to prevent client/server graph leakage.
- Internal utility and error module paths have changed and require updated imports.

---

### Changes

- Reorganized package exports so the kernel is the main public entrypoint.
- Removed separate `./shared` and `./utils` export subpaths.
- Consolidated the former `utils` directory into `kernel/shared/utils`.
- Moved error and security-related types into `kernel/shared/utils/error`.
- Updated all internal framework imports to rely on the public kernel API instead of deep relative paths.
- Introduced explicit `api.ts` barrel files for both client and server runtimes.
- Reorganized adapter contract interfaces into `client` and `server` subdirectories.
- Updated all FiveM and Node implementations, runtime services, entities, and tests to reflect the new contract structure.
- Improved import ordering (external dependencies first).
- Standardized file formatting across the codebase.

---

### Fixes

- Fixed a **critical bundler issue** where server-side code (including Node core modules) could be included in client bundles.
- Prevented runtime leakage caused by overly broad barrel exports.
- Enforced the package `exports` map to block invalid or unsupported subpath imports.
- Ensured client builds are free of `node:*` imports and server-only services.

---

### Migration Notes

If you are upgrading from **v0.2.x**, you will need to:

- Replace any deep internal imports with:
```ts
  import { X } from '@open-core/framework'
```
- Import runtime-specific APIs explicitly:
```ts
import { Client } from '@open-core/framework/client'
import { Server } from '@open-core/framework/server'
```

- Remove any reliance on shared runtime entrypoints or implicit client/server exposure.

### Notes

This release intentionally prioritizes correctness, safety, and long-term scalability over backward compatibility.
It establishes hard architectural boundaries required for a stable and predictable framework as OpenCore continues to grow.