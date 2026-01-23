## OpenCore Framework v0.4.0

---

### Highlights

- **Native Binary Isolation**: Introduced a robust system to execute heavy or sensitive logic in isolated operating system processes, outside the FiveM runtime.
- **Language-Agnostic Services**: Binary services can be implemented in any language (Go, Rust, C++, etc.) that supports standard I/O (stdin/stdout).
- **Asynchronous Proxy Pattern**: Methods decorated with `@BinaryCall` are automatically transformed into asynchronous proxies, making external execution feel like native TypeScript.

---

### New Features

- **@BinaryService Decorator**: New decorator to declare and manage the lifecycle of external binary processes.
- **@BinaryCall Decorator**: New decorator to mark class methods as remote actions to be executed by the associated binary.
- **BinaryProcessManager**: A centralized runtime service that handles process spawning, JSON-RPC communication, and automatic timeout management.
- **Enhanced Observability**: Added detailed debug logging for service registration, process lifecycle events, and RPC call/response cycles.

---

### Internal Changes

- **JSON-RPC Over Stdin/Stdout**: Implemented a lightweight protocol for bidirectional communication between OpenCore and external binaries.
- **Platform-Specific Resolution**: Automated resolution of binary executables based on the host operating system (Windows/Linux).
- **Graceful Error Handling**: Comprehensive error propagation from external processes back to the TypeScript runtime, including stderr capture.

---

### Notes

This release marks a significant milestone in OpenCore's architecture, providing developers with the tools to build high-performance, isolated systems that leverage native code while maintaining the ease of use of the framework's decorator-based DI system.