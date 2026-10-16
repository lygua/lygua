export type PrivateKey = object | symbol;

export interface PrivateStore<TData, TTarget extends PrivateKey = PrivateKey> {
  get(target: TTarget): TData | undefined;
  set(target: TTarget, data: TData): void;
  has(target: TTarget): boolean;
  delete(target: TTarget): boolean;
}

export interface PrivateDataRegistry {
  register(target?: PrivateKey): PrivateKey;
  get<T = unknown>(target: PrivateKey): T | undefined;
  set<T = unknown>(target: PrivateKey, data: T): void;
  has(target: PrivateKey): boolean;
  delete(target: PrivateKey): boolean;
  createStore: <TData, TTarget extends PrivateKey = PrivateKey>(
    name?: string
  ) => PrivateStore<TData, TTarget>;
  scope: <TData, TTarget extends PrivateKey = PrivateKey>(
    name?: string
  ) => PrivateStore<TData, TTarget>;
}

const centralStore = new WeakMap<any, Map<symbol, unknown>>();
const DEFAULT_SCOPE = Symbol('lygua.private.default');

function validateKeyType(k: unknown): asserts k is PrivateKey {
  const isObj = typeof k === 'object' && k !== null;
  const isSym = typeof k === 'symbol';
  if (!isObj && !isSym) {
    throw new TypeError(
      `Parameter 'key' expected non-null object or symbol, received ${typeof k}`
    );
  }
}

export function createPrivateStore<
  TData,
  TTarget extends PrivateKey = PrivateKey
>(name?: string): PrivateStore<TData, TTarget> {
  const scopeId = Symbol(name ?? 'lygua.private.store');

  return Object.freeze({
    get(target: TTarget): TData | undefined {
      validateKeyType(target);
      const scopeMap = centralStore.get(target as any);
      if (!scopeMap) return undefined;
      return scopeMap.get(scopeId) as TData | undefined;
    },
    set(target: TTarget, data: TData): void {
      validateKeyType(target);
      let scopeMap = centralStore.get(target as any);
      if (!scopeMap) {
        scopeMap = new Map<symbol, unknown>();
        centralStore.set(target as any, scopeMap);
      }
      scopeMap.set(scopeId, data);
    },
    has(target: TTarget): boolean {
      validateKeyType(target);
      const scopeMap = centralStore.get(target as any);
      if (!scopeMap) return false;
      return scopeMap.has(scopeId);
    },
    delete(target: TTarget): boolean {
      validateKeyType(target);
      const scopeMap = centralStore.get(target as any);
      if (!scopeMap) return false;
      return scopeMap.delete(scopeId);
    },
  });
}

export const PrivateData: PrivateDataRegistry = Object.freeze({
  register(target?: PrivateKey): PrivateKey {
    const key = target === undefined ? Symbol() : target;
    validateKeyType(key);
    return key;
  },
  get<T = unknown>(target: PrivateKey): T | undefined {
    validateKeyType(target);
    const scopeMap = centralStore.get(target as any);
    if (!scopeMap) return undefined;
    return scopeMap.get(DEFAULT_SCOPE) as T | undefined;
  },
  set<T = unknown>(target: PrivateKey, data: T): void {
    validateKeyType(target);
    let scopeMap = centralStore.get(target as any);
    if (!scopeMap) {
      scopeMap = new Map<symbol, unknown>();
      centralStore.set(target as any, scopeMap);
    }
    scopeMap.set(DEFAULT_SCOPE, data);
  },
  has(target: PrivateKey): boolean {
    validateKeyType(target);
    const scopeMap = centralStore.get(target as any);
    if (!scopeMap) return false;
    return scopeMap.has(DEFAULT_SCOPE);
  },
  delete(target: PrivateKey): boolean {
    validateKeyType(target);
    const scopeMap = centralStore.get(target as any);
    if (!scopeMap) return false;
    return scopeMap.delete(DEFAULT_SCOPE);
  },
  createStore: createPrivateStore,
  scope: createPrivateStore,
});
