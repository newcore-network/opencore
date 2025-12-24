# Decorators Overview

OpenCore uses TypeScript decorators to declare **runtime behavior** in a way that is:

- explicit
- discoverable
- testable
- hard to misuse

Decorators are the primary “wiring language” of the framework.

---

## 1. What is a decorator in OpenCore?

In OpenCore, a decorator is a declaration that attaches meaning to code.

Examples:

- “this class is a controller” (`@Server.Controller()`)
- “this method handles a net event” (`@Server.OnNet('event:name')`)
- “this method is a command” (`@Server.Command({ ... })`)

The important point:

- decorators describe **intent**
- the framework turns that intent into runtime bindings during bootstrap

---

## 2. What problem do decorators solve?

Without decorators, most FiveM codebases drift into:

- hidden globals
- ad-hoc event registration scattered across files
- implicit lifecycle assumptions
- duplicated validation/security

OpenCore decorators solve this by:

- making entry points explicit (controllers)
- centralizing binding/registration into the bootstrap phase
- making security and validation declarative

---

## 3. When do decorators execute?

There are two distinct moments:

### 3.1 Decorator evaluation (module load time)

Decorators execute when the module is evaluated (imported).

If a module is never imported:

- its decorators never run
- the framework cannot discover it

### 3.2 Framework binding (bootstrap scan)

Even after decorators have stored metadata, the framework becomes “live” only after bootstrap scanning.

Reference:

- see `docs/lifecycle.md` (section: “Decorator binding moment”).

---

## 4. Guarantees (what decorators give you)

Decorators provide a stable contract:

- **Consistent entry points**
  - handlers receive a `Server.Player` context where required
- **Centralized validation and security**
  - schemas and security decorators run before your logic
- **Explicit runtime wiring**
  - you can reason about behavior by reading the controller class

---

## 5. Non-guarantees (what decorators do NOT do)

Decorators do not guarantee:

- that your controller is imported
- that your handler will run before bootstrap scan completes
- that payloads are safe unless you declare a schema or rely on the built-in pipelines
- that gameplay invariants are enforced (that is your domain responsibility)

---

## 6. Practical mental model

Think of decorators as:

- “configuration attached to code”

And the bootstrap as:

- “the compiler that turns that configuration into live runtime bindings”.

If you remember only one rule:

- **If a controller is not imported before bootstrap scanning, it does not exist for the framework.**
