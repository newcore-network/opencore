# Why OpenCore?

In a landscape saturated with FiveM resources, the question arises: *Why another framework?*

OpenCore was born from a specific necessity: **Complexity Management**. As FiveM servers grow from simple scripts to complex virtual economies and societies, traditional procedural scripting collapses under its own weight.

OpenCore solves this by introducing **Structural Engineering** to the runtime.

## 1. Engineering vs. Scripting

Most FiveM frameworks function as "Game Modes"—they provide inventory, jobs, and banking out of the box, but often with tightly coupled, unmaintainable code.

OpenCore is a **Runtime Framework**. We do not provide the "Job System"; we provide the **Architecture** (Controllers, Services, Events) for you to build the Job System correctly, securely, and efficiently.

| Traditional Scripting | OpenCore Engineering |
|-----------------------|----------------------|
| `onNet('buyItem', (item) => ...)` | `@Server.OnNet()` decorators with schema validation |
| `if (src == undefined) return` | Automatic context injection |
| `exports['db'].execute(...)` | `constructor(private db: DatabaseService)` |
| Global state & variables | Singleton Services & Dependency Injection |

## 2. Security by Design

In OpenCore, security is not an addon; it is the gateway. The framework enforces security before your business logic ever executes.

*   **Zero-Trust Input:** All network inputs are validated against **Zod Schemas**. If the payload doesn't match the schema, the request is rejected at the network layer. Your controller never sees invalid data.
*   **Declarative Guards:** Access control is defined via metadata.
    ```typescript
    @Server.Guard({ permission: 'admin.manage' })
    @Server.Throttle(5, 1000) // 5 requests per second
    public sensitiveAction() { ... }
    ```
*   **State Requirements:** Prevent "dead player exploits" using State Guards that enforce player status (e.g., must be alive, must not be cuffed) automatically.

## 3. Unmatched Performance

OpenCore is optimized for high-concurrency environments.

*   **Sub-Microsecond Latency:** Our benchmarks confirm that the Core Event Bus and DI resolution operate in the sub-microsecond range.
*   **Adapter Pattern:** By decoupling the engine from FiveM natives, we can mock and simulate heavy loads in a pure Node.js environment (`bench:load`), proving the system handles 500+ concurrent players with stable latencies.
*   **Parallel Computing:** Built-in utilities to offload heavy computations to worker threads, preventing main thread blocking (crucial for the Node.js event loop).

## 4. Testability

Because OpenCore uses Dependency Injection and separates the Kernel from the Adapter, **90% of your gameplay logic can be unit tested without starting the FiveM server.**

*   **Mockable Infrastructure:** You can inject mock database adapters or event transports during tests.
*   **Integration Testing:** The framework includes a robust testing suite (`Vitest`) to verify your controllers and services in isolation.

## Conclusion

OpenCore is chosen by developers who treat their server as a software product. It requires a higher initial skill level than drag-and-drop frameworks, but it pays immediate dividends in stability, maintainability, and scalability.
