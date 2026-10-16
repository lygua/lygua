export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export function isNativePrototype(proto: unknown): boolean {
  if (!proto || typeof proto !== 'object') return true;
  const ctor = (proto as { constructor?: unknown }).constructor;
  if (!ctor || typeof ctor !== 'function') return true;
  const src = Function.prototype.toString.call(ctor);
  return src.includes('[native code]');
}

export function hardenPrototypeChainSafe(
  obj: unknown,
  hardened: WeakSet<object> = new WeakSet()
): void {
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) return;
  let proto = Object.getPrototypeOf(obj);

  while (proto && proto !== Object.prototype && !isNativePrototype(proto)) {
    if (hardened.has(proto)) break;
    hardened.add(proto);
    Object.freeze(proto);
    proto = Object.getPrototypeOf(proto);
  }
}

export function freezeClass<T extends Function>(ctor: T, freezePrototype: boolean = true): T {
  if (typeof ctor !== 'function') {
    throw new TypeError(`freezeClass expects a constructor function, received ${typeof ctor}`);
  }
  if (freezePrototype && ctor.prototype && typeof ctor.prototype === 'object') {
    Object.freeze(ctor.prototype);
  }
  return Object.freeze(ctor);
}

export function deepFreeze<T>(obj: T, visited: WeakSet<object> = new WeakSet()): DeepReadonly<T> {
  if (obj === null || obj === undefined) return obj as DeepReadonly<T>;

  const type = typeof obj;
  if (type !== 'object' && type !== 'function') return obj as DeepReadonly<T>;

  if (Object.isFrozen(obj) || visited.has(obj as object)) {
    return obj as DeepReadonly<T>;
  }
  visited.add(obj as object);

  if (ArrayBuffer.isView(obj)) {
    const view = obj as unknown as Record<string, unknown>;
    try {
      view.set = () => {
        throw new TypeError('Cannot modify read-only TypedArray');
      };
    } catch {}
    return obj as DeepReadonly<T>;
  }

  if (obj instanceof Map) {
    obj.set = obj.delete = obj.clear = () => {
      throw new TypeError('Cannot modify read-only Map');
    };
    for (const [k, v] of obj) {
      deepFreeze(k, visited);
      deepFreeze(v, visited);
    }
  } else if (obj instanceof Set) {
    obj.add = obj.delete = obj.clear = () => {
      throw new TypeError('Cannot modify read-only Set');
    };
    for (const v of obj) {
      deepFreeze(v, visited);
    }
  } else if (obj instanceof WeakMap) {
    obj.set = obj.delete = () => {
      throw new TypeError('Cannot modify read-only WeakMap');
    };
  } else if (obj instanceof WeakSet) {
    obj.add = obj.delete = () => {
      throw new TypeError('Cannot modify read-only WeakSet');
    };
  }

  const keys = Reflect.ownKeys(obj as object);

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (!descriptor) continue;

    if ('value' in descriptor) {
      const val = descriptor.value;
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        deepFreeze(val, visited);
      }
    } else {
      if (descriptor.get) deepFreeze(descriptor.get, visited);
      if (descriptor.set) deepFreeze(descriptor.set, visited);
    }
  }

  return Object.freeze(obj) as DeepReadonly<T>;
}

export function defineImmutable<T extends object, K extends PropertyKey, V>(
  target: T,
  key: K,
  value: V,
  enumerable: boolean = true
): T & Record<K, V> {
  Object.defineProperty(target, key, {
    value,
    writable: false,
    configurable: false,
    enumerable,
  });
  return target as T & Record<K, V>;
}

export function defineImmutableProperties<
  T extends object,
  P extends Record<PropertyKey, unknown>
>(
  target: T,
  properties: P,
  enumerable: boolean = true
): T & P {
  const descriptors: PropertyDescriptorMap = {};
  for (const key of Reflect.ownKeys(properties)) {
    descriptors[key as string] = {
      value: (properties as Record<PropertyKey, unknown>)[key],
      writable: false,
      configurable: false,
      enumerable,
    };
  }
  Object.defineProperties(target, descriptors);
  return target as T & P;
}

export function isFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return true;
  }
  return Object.isFrozen(value);
}
