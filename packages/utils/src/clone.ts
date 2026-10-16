import { createPrivateStore } from './private-data';
import { hardenPrototypeChainSafe, freezeClass, DeepReadonly } from './freeze';

const MUTATING_MAP_METHODS = new Set(['set', 'delete', 'clear']);
const MUTATING_SET_METHODS = new Set(['add', 'delete', 'clear']);

const frozenMapHandler: ProxyHandler<Map<any, any>> = {
  get(target, prop) {
    if (MUTATING_MAP_METHODS.has(prop as string)) {
      return () => {
        throw new TypeError(`Cannot call ${String(prop)} on frozen Map`);
      };
    }
    const val = Reflect.get(target, prop, target);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  },
  set() {
    throw new TypeError('Cannot assign properties on frozen Map');
  },
  deleteProperty() {
    throw new TypeError('Cannot delete properties on frozen Map');
  },
};

const frozenSetHandler: ProxyHandler<Set<any>> = {
  get(target, prop) {
    if (MUTATING_SET_METHODS.has(prop as string)) {
      return () => {
        throw new TypeError(`Cannot call ${String(prop)} on frozen Set`);
      };
    }
    const val = Reflect.get(target, prop, target);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  },
  set() {
    throw new TypeError('Cannot assign properties on frozen Set');
  },
  deleteProperty() {
    throw new TypeError('Cannot delete properties on frozen Set');
  },
};

const frozenTypedArrayHandler: ProxyHandler<any> = {
  get(target, prop) {
    if (prop === 'set') {
      return () => {
        throw new TypeError('Cannot call set on frozen TypedArray');
      };
    }
    const val = Reflect.get(target, prop, target);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  },
  set() {
    throw new TypeError('Cannot mutate elements of frozen TypedArray');
  },
  deleteProperty() {
    throw new TypeError('Cannot delete properties on frozen TypedArray');
  },
};

export type AccessorMode = 'snapshot' | 'strip' | 'preserve';

export interface AccessorModeObject {
  readonly SNAPSHOT: 'snapshot';
  readonly STRIP: 'strip';
  readonly PRESERVE: 'preserve';
  readonly DEFAULT: 'snapshot';
}

export const AccessorMode: AccessorModeObject = Object.freeze({
  SNAPSHOT: 'snapshot',
  STRIP: 'strip',
  PRESERVE: 'preserve',
  get DEFAULT(): 'snapshot' {
    return 'snapshot';
  },
});

export interface ClonerOptions {
  freeze?: boolean;
  hardenProto?: boolean;
  accessorMode?: AccessorMode;
}

export const ClonerDefaultOptions: Readonly<Required<ClonerOptions>> = Object.freeze({
  freeze: false,
  hardenProto: false,
  accessorMode: AccessorMode.SNAPSHOT,
});

export const validateAccessorMode = (mode?: unknown): AccessorMode => {
  if (mode === undefined) return AccessorMode.SNAPSHOT;
  if (mode === 'snapshot' || mode === 'strip' || mode === 'preserve') {
    return mode;
  }
  throw new TypeError(
    `options.accessorMode must be one of: 'snapshot', 'strip', 'preserve'. Received: ${String(mode)}`
  );
};

export const validateOptions = (options?: ClonerOptions): Required<ClonerOptions> => {
  const validated: Required<ClonerOptions> = {
    freeze: false,
    hardenProto: false,
    accessorMode: AccessorMode.SNAPSHOT,
  };

  if (!options) return validated;

  if (options.freeze !== undefined) {
    if (typeof options.freeze !== 'boolean') {
      throw new TypeError(
        `When a value for options.freeze is provided, a boolean is expected. Received: ${typeof options.freeze}`
      );
    }
    validated.freeze = options.freeze;
  }

  if (options.hardenProto !== undefined) {
    if (typeof options.hardenProto !== 'boolean') {
      throw new TypeError(
        `When a value for options.hardenProto is provided, a boolean is expected. Received: ${typeof options.hardenProto}`
      );
    }
    validated.hardenProto = options.hardenProto;
  }

  if (options.accessorMode !== undefined) {
    validated.accessorMode = validateAccessorMode(options.accessorMode);
  }

  return validated;
};

interface ClonerPrivateState {
  config: Required<ClonerOptions>;
  hardenedProtos: WeakSet<object>;
}

const clonerStore = createPrivateStore<ClonerPrivateState>('lygua.Cloner');

export class Cloner {
  constructor(options?: ClonerOptions) {
    const config = validateOptions(options);
    clonerStore.set(this, {
      config,
      hardenedProtos: new WeakSet(),
    });
    Object.freeze(this);
  }

  clone<T>(obj: T): T {
    const state = clonerStore.get(this);
    if (!state) {
      throw new Error('Invalid Cloner instance');
    }
    const seen = new WeakMap<object, unknown>();
    return this._cloneInternal(obj, state, seen);
  }

  private _cloneInternal<T>(obj: T, state: ClonerPrivateState, seen: WeakMap<object, unknown>): T {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return obj;
    }

    if (typeof obj === 'function') {
      return obj;
    }

    if (seen.has(obj as object)) {
      return seen.get(obj as object) as T;
    }

    const { freeze, hardenProto, accessorMode } = state.config;

    if (obj instanceof Date) {
      const cloned = new Date(obj.getTime());
      seen.set(obj, cloned);
      this._copyCustomProperties(obj, cloned, state, seen);
      if (freeze) Object.freeze(cloned);
      return cloned as unknown as T;
    }

    if (obj instanceof RegExp) {
      const cloned = new RegExp(obj.source, obj.flags);
      seen.set(obj, cloned);
      this._copyCustomProperties(obj, cloned, state, seen);
      if (freeze) Object.freeze(cloned);
      return cloned as unknown as T;
    }

    if (obj instanceof ArrayBuffer) {
      const cloned = obj.slice(0);
      seen.set(obj, cloned);
      return cloned as unknown as T;
    }

    if (ArrayBuffer.isView(obj)) {
      if (obj instanceof DataView) {
        const clonedBuffer = obj.buffer.slice(0);
        const cloned = new DataView(clonedBuffer, obj.byteOffset, obj.byteLength);
        seen.set(obj, cloned);
        if (freeze) Object.freeze(cloned);
        return cloned as unknown as T;
      }

      const TypedArrayCtor = (obj as any).constructor;
      const cloned = new TypedArrayCtor(obj.buffer.slice(0), obj.byteOffset, (obj as any).length);
      seen.set(obj, cloned);
      if (freeze) {
        const proxy = new Proxy(cloned, frozenTypedArrayHandler);
        return proxy as unknown as T;
      }
      return cloned as unknown as T;
    }

    if (Array.isArray(obj)) {
      const cloned: unknown[] = [];
      seen.set(obj, cloned);
      for (let i = 0; i < obj.length; i++) {
        cloned[i] = this._cloneInternal(obj[i], state, seen);
      }
      if (freeze) Object.freeze(cloned);
      if (freeze && hardenProto) {
        hardenPrototypeChainSafe(cloned, state.hardenedProtos);
      }
      return cloned as unknown as T;
    }

    if (obj instanceof Map) {
      const cloned = new Map<unknown, unknown>();
      seen.set(obj, cloned);
      for (const [key, value] of obj.entries()) {
        cloned.set(
          this._cloneInternal(key, state, seen),
          this._cloneInternal(value, state, seen)
        );
      }
      if (freeze) {
        const proxy = new Proxy(cloned, frozenMapHandler);
        if (hardenProto) hardenPrototypeChainSafe(proxy, state.hardenedProtos);
        return Object.freeze(proxy) as unknown as T;
      }
      return cloned as unknown as T;
    }

    if (obj instanceof Set) {
      const cloned = new Set<unknown>();
      seen.set(obj, cloned);
      for (const value of obj.values()) {
        cloned.add(this._cloneInternal(value, state, seen));
      }
      if (freeze) {
        const proxy = new Proxy(cloned, frozenSetHandler);
        if (hardenProto) hardenPrototypeChainSafe(proxy, state.hardenedProtos);
        return Object.freeze(proxy) as unknown as T;
      }
      return cloned as unknown as T;
    }

    if (obj instanceof Error) {
      const ErrorCtor = (obj as any).constructor || Error;
      const cloned = new ErrorCtor(obj.message);
      if (obj.stack) cloned.stack = obj.stack;
      seen.set(obj, cloned);
      this._copyCustomProperties(obj, cloned, state, seen, ['message', 'stack']);
      if (freeze) Object.freeze(cloned);
      if (freeze && hardenProto) hardenPrototypeChainSafe(cloned, state.hardenedProtos);
      return cloned as unknown as T;
    }

    const proto = Object.getPrototypeOf(obj);
    const cloned = Object.create(proto);
    seen.set(obj, cloned);

    for (const key of Reflect.ownKeys(obj)) {
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      if (!desc) continue;

      if ('value' in desc) {
        desc.value = this._cloneInternal(desc.value, state, seen);
        Object.defineProperty(cloned, key, desc);
      } else {
        if (accessorMode === AccessorMode.STRIP) continue;

        if (accessorMode === AccessorMode.SNAPSHOT && typeof desc.get === 'function') {
          const value = this._cloneInternal(desc.get.call(obj), state, seen);
          Object.defineProperty(cloned, key, {
            value,
            writable: false,
            configurable: false,
            enumerable: desc.enumerable,
          });
        }

        if (accessorMode === AccessorMode.PRESERVE) {
          Object.defineProperty(cloned, key, desc);
        }
      }
    }

    if (freeze) Object.freeze(cloned);
    if (freeze && hardenProto) {
      hardenPrototypeChainSafe(cloned, state.hardenedProtos);
    }

    return cloned as T;
  }

  private _copyCustomProperties(
    src: object,
    dest: object,
    state: ClonerPrivateState,
    seen: WeakMap<object, unknown>,
    ignoreKeys: string[] = []
  ): void {
    const ignore = new Set(ignoreKeys);
    for (const key of Reflect.ownKeys(src)) {
      if (typeof key === 'string' && ignore.has(key)) continue;
      const desc = Object.getOwnPropertyDescriptor(src, key);
      if (!desc) continue;
      if ('value' in desc) {
        desc.value = this._cloneInternal(desc.value, state, seen);
        Object.defineProperty(dest, key, desc);
      }
    }
  }
}

freezeClass(Cloner);

export function createCloner(options?: ClonerOptions): Cloner {
  return new Cloner(options);
}

export function clone<T>(obj: T, options?: ClonerOptions): T {
  const cloner = new Cloner(options);
  return cloner.clone(obj);
}

export const deepClone: <T>(obj: T, options?: ClonerOptions) => T = clone;

export function freeze<T>(
  obj: T,
  hardenProto: boolean = true,
  accessorMode: AccessorMode = AccessorMode.SNAPSHOT
): DeepReadonly<T> {
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return obj as DeepReadonly<T>;
  }
  const cloner = new Cloner({
    freeze: true,
    hardenProto,
    accessorMode: validateAccessorMode(accessorMode),
  });
  return cloner.clone(obj) as DeepReadonly<T>;
}
