# AGENTS.md — Repository Instructions for AI Agents

> **Project:** LYGUA (`@avgdickie/lygua`)
> **Environment:** Google Apps Script (V8 Runtime) & Modern Node.js/Browser Monorepo
> **Target Audiences:** Professional TypeScript web developers and casual Google Apps Script spreadsheet users.

---

## 1. Absolute Golden Rules (Never Break These)

1. **NO JSDOC COMMENTS:**
   - Under no circumstances should you generate JSDoc (`/** ... */`) comments in any code.
   - Use regular line comments (`//`) or write clean, self-documenting code with explicit TypeScript types.

2. **NO NATIVE APPS SCRIPT LIBRARIES VIA SCRIPT ID:**
   - Native Google Apps Script libraries via Script ID are slow, cache-stale, and bug-prone.
   - Never steer users toward native Script ID libraries.
   - Instead, prioritize:
     - **Vendored/Inlined Standalone IIFEs:** Pre-built, zero-dependency standalone `.iife.js` files dropped directly into projects as `.gs` files.
     - **`gasm` CLI:** Vendoring tools directly into `clasp` repositories.
     - **Modular ESM:** Modern bundlers (Vite, tsdown, Rollup).

3. **GOOGLE APPS SCRIPT V8 RUNTIME CONSTRAINTS:**
   - **No `#private` Class Fields:** The Apps Script V8 AST scanner chokes on `#privateField` syntax. Use closures, `WeakMap`, or `@lygua/utils` `createPrivateStore` / `PrivateData`.
   - **Warm V8 Instance Immutability:** Google keeps execution instances warm between triggers and users. Mutable global state bleeds across runs. Enforce immutability via `Object.freeze`, `freezeClass`, `deepFreeze`, and prototype chain hardening (`hardenPrototypeChainSafe`).
   - **Binary Data:** `Uint8Array` is interchangeable with signed Java `Byte[]` in modern GAS.
   - **Hashing:** `Utilities.computeDigest` powers MD5, SHA-1, SHA-256, SHA-384, and SHA-512.
   - **Hardware CSPRNG:** `Utilities.getUuid()` is the entropy harvester for cryptographically secure pseudo-random numbers.

---

## 2. Toolchain & Monorepo Architecture

- **Package Manager:** `pnpm` (Workspace mode).
- **Orchestration:** Turborepo (`turbo.json`).
  - Run typecheck: `pnpm run typecheck`
  - Run build: `pnpm run build`
- **Bundler:** `tsdown` (powered by Rolldown) with `--isolatedDeclarations`.
  - Every exported function, constant, and class must have explicit return/variable types.
  - Builds dual outputs: `esm` (with `.d.ts`) and standalone `iife`.
- **Versioning & Releases:** Changesets (`.changeset/config.json`).
  - Add changeset: `pnpm change`
  - Version packages: `pnpm version:packages`
  - Publish packages: `pnpm release`
- **Linting:** `oxlint`.

---

## 3. Package Directory Map

| Package | Path | Purpose |
| :--- | :--- | :--- |
| **`@lygua/secure-random`** | `packages/secure-random` | Hardware-grade CSPRNG entropy from `Utilities.getUuid()`. |
| **`@lygua/crypto`** | `packages/crypto` | W3C WebCrypto API (`getRandomValues`, `randomUUID`) & full `computeDigest` suite. |
| **`@lygua/client`** | `packages/client` | Type-safe, Promise-based RPC client for `google.script.run` + local mock bridge. |
| **`@lygua/testing`** | `packages/testing` | In-memory fakes (`FakePropertiesService`, `FakeCacheService`, `FakeUtilities`) for offline Node testing. |
| **`@lygua/utils`** | `packages/utils` | Immutability, `Cloner` with `AccessorMode`, `DeepMerge`, `parsePath`/`setPath`, and `PrivateData`. |
| **`lygua`** | `packages/lygua` | Monolithic entry point bundling all packages into a single standalone `Lygua` IIFE and unified ESM export. |
| **`@lygua/gasm`** | `packages/gasm` | CLI and package manager for Apps Script monorepos. |

---

## 4. Code Patterns & Conventions

### Private State Pattern (No `#` fields)
```typescript
import { createPrivateStore } from '@lygua/utils';

interface MyState {
  count: number;
}

const privateStore = createPrivateStore<MyState>('MyClass');

export class MyClass {
  constructor(initialCount: number) {
    privateStore.set(this, { count: initialCount });
    Object.freeze(this);
  }

  getCount(): number {
    return privateStore.get(this)?.count ?? 0;
  }
}
```

### Deep Cloning & Freezing
```typescript
import { clone, freeze, AccessorMode } from '@lygua/utils';

// Clone and deeply freeze copy with computed getter snapshots
const frozenSnapshot = freeze(myObject, true, AccessorMode.SNAPSHOT);
```

### Deep Merging
```typescript
import { deepMerge, HandleArrays } from '@lygua/utils';

// Immutable deep merge with array union strategy
const result = deepMerge(target, source1, source2, {
  clone: true,
  handleArrays: HandleArrays.UNION,
});
```

### Safe Path Navigation
```typescript
import { getPath, setPath } from '@lygua/utils';

const name = getPath(data, 'users[0].name', 'Default');
setPath(data, 'users[0].name', 'Updated'); // Synthesizes arrays for numeric indices
```
