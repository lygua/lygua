# <img src="docs/assets/icons/lygua.svg" alt="LYGUA" width="32" height="32" align="center" /> LYGUA
> **L**everage **Y**our **G**oogle **U**ser **A**ccount

A modern, high-performance monorepo and toolchain designed to transform everyday Google Accounts into full-blown serverless computing, storage, and automation engines.

## Architecture & Principles
- **Ponyfill-First:** All utilities (Crypto, Polyfills, Utilities) are delivered as pure, zero-side-effect ponyfills.
- **Optional Global Polyfills:** Explicit `.install()` helpers allow attaching utilities to `globalThis` when compatibility demands it.
- **Monolithic IIFE + Modular ESM:** Packages can be imported as discrete ESM modules in modern pipelines or bundled into a single closed `Lygua` IIFE namespace for Google Apps Script.
- **Strictly ESM & ES6 Classes:** No CommonJS at the top level; modern ES6 classes throughout.
- **Hardware-grade Entropy:** Pure CSPRNG harvested directly from Google's backend `SecureRandom` (`Utilities.getUuid()`).

## Packages
- <img src="docs/assets/icons/random.svg" width="16" height="16" align="center" /> [`@lygua/secure-random`](./packages/secure-random) — Pure CSPRNG entropy generator from Google's V8/Java backend.
- <img src="docs/assets/icons/crypto.svg" width="16" height="16" align="center" /> [`@lygua/crypto`](./packages/crypto) — W3C Web Cryptography API (`getRandomValues`, `randomUUID`) with quota enforcement.
- <img src="docs/assets/icons/client.svg" width="16" height="16" align="center" /> [`@lygua/client`](./packages/client) — Type-safe, Promise-based RPC client & local mock bridge for Apps Script Web Apps.
- <img src="docs/assets/icons/testing.svg" width="16" height="16" align="center" /> [`@lygua/testing`](./packages/testing) — In-memory test doubles & fakes (PropertiesService, CacheService, Utilities) for local testing.
- <img src="docs/assets/icons/utils.svg" width="16" height="16" align="center" /> [`@lygua/utils`](./packages/utils) — Immutability, deep freezing, property descriptor locking, and core helpers.
- <img src="docs/assets/icons/core.svg" width="16" height="16" align="center" /> [`lygua`](./packages/lygua) — The monolithic entry point bundling all packages into the `Lygua` IIFE namespace.
- <img src="docs/assets/icons/gasm.svg" width="16" height="16" align="center" /> [`@lygua/gasm`](./packages/gasm) — The Google Apps Script Monorepo CLI and orchestrator.
