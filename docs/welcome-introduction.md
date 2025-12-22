# Welcome to OpenCore Framework

**Current Version:** `v1.0.0-alpha.1`

OpenCore is a **high-performance, event-driven TypeScript runtime** designed to bring enterprise-grade software engineering standards to the FiveM ecosystem.

Unlike traditional "frameworks" that function primarily as game modes or script collections, OpenCore is a foundational **Engine**. It provides the architectural infrastructure necessary to build complex, scalable, and secure multiplayer systems without dictating gameplay logic.

## The Paradigm Shift

FiveM development has historically relied on loose scripting, global variables, and implicit dependencies. OpenCore rejects this approach in favor of strict architectural patterns commonly found in professional backend development (such as NestJS, Spring Boot, or ASP.NET Core).

### Core Principles

1.  **Dependency Injection (DI):** Managed by `tsyringe`, ensuring loose coupling and high testability.
2.  **Metadata Driven:** Utilizes extensive Decorators (`@Command`, `@Guard`, `@Service`) to declare intent declaratively.
3.  **Platform Agnostic Kernel:** The core logic ("Kernel") is separated from the platform implementation ("Adapter"), allowing business logic to run in pure Node.js environments for testing and simulation.
4.  **Security First:** Security is not a module; it is the default state. Input validation, rate limiting, and access control are baked into the execution pipeline.

## Who is OpenCore for?

OpenCore is built for developers and teams who:

*   Value **Type Safety** and compile-time guarantees over runtime flexibility.
*   Need to build **Scalable Systems** that can handle hundreds of concurrent players.
*   Want to write **Unit and Integration Tests** for their gameplay logic.
*   Are tired of "spaghetti code" and want a clean separation of concerns (Controllers, Services, Entities).

## Project Status

OpenCore is currently in **Alpha (v1.0.0-alpha.1)**.
The Core APIs are considered stable ("frozen"), but the ecosystem is still evolving. We recommend this framework for new projects aiming for high stability or for teams looking to refactor legacy codebases into a modern architecture.

---

### Next Steps

*   [Why OpenCore?](./why-open-core.md) - Understand the architectural decisions.
*   [Getting Started](./getting-started.md) - Set up your first project.
*   [Architecture Overview](./architecture.md) - Deep dive into Kernel, Runtime, and Adapters.
