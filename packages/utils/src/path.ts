import { Cloner, clone } from './clone';

export interface PathOptions {
  clone?: boolean | Cloner | ((val: unknown) => unknown);
  cloner?: Cloner | ((val: unknown) => unknown);
}

function resolveCloner(options?: PathOptions): ((val: unknown) => unknown) | null {
  if (!options) return null;
  const c = options.clone ?? options.cloner;
  if (!c) return null;
  if (typeof c === 'function') return c;
  if (c instanceof Cloner) return (v: unknown) => c.clone(v);
  if (c === true) return (v: unknown) => clone(v);
  return null;
}

export function parsePath(path: string | readonly PropertyKey[]): PropertyKey[] {
  if (Array.isArray(path)) {
    return [...path];
  }
  if (typeof path === 'symbol') {
    return [path];
  }
  const str = String(path);
  if (!str.length) return [];

  const normalized = str.replace(/\[(\w+)\]/g, '.$1');
  return normalized.split('.').filter(Boolean);
}

export function hasPath(obj: unknown, path: string | readonly PropertyKey[]): boolean {
  if (obj === null || obj === undefined) return false;
  const keys = parsePath(path);
  if (!keys.length) return false;

  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    if (!(key in current)) {
      return false;
    }
    current = current[key];
  }
  return true;
}

export function getPath<T = unknown>(
  obj: unknown,
  path: string | readonly PropertyKey[],
  defaultValue?: T
): T {
  if (obj === null || obj === undefined) {
    return defaultValue as T;
  }
  const keys = parsePath(path);
  if (!keys.length) return defaultValue as T;

  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue as T;
    }
    current = current[key];
  }

  return current !== undefined ? (current as T) : (defaultValue as T);
}

export function setPath<T extends object = Record<string, unknown>>(
  obj: T,
  path: string | readonly PropertyKey[],
  value: unknown
): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const keys = parsePath(path);
  if (!keys.length) return obj;

  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return obj;
    }

    const nextKey = keys[i + 1];
    const isNextNumeric =
      typeof nextKey === 'number' ||
      (typeof nextKey === 'string' && /^\d+$/.test(nextKey));

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = isNextNumeric ? [] : {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey !== '__proto__' && lastKey !== 'constructor' && lastKey !== 'prototype') {
    current[lastKey] = value;
  }

  return obj;
}

export function deletePath<T extends object = Record<string, unknown>>(
  obj: T,
  path: string | readonly PropertyKey[]
): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  const keys = parsePath(path);
  if (!keys.length) return false;

  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (!current || typeof current !== 'object' || !(lastKey in current)) {
    return false;
  }

  if (Array.isArray(current) && typeof lastKey === 'number') {
    current.splice(lastKey, 1);
    return true;
  }
  if (Array.isArray(current) && typeof lastKey === 'string' && /^\d+$/.test(lastKey)) {
    current.splice(Number(lastKey), 1);
    return true;
  }

  return delete current[lastKey];
}

export function updateNested<T extends object = Record<string, unknown>>(
  obj: T,
  path: string | readonly PropertyKey[],
  value: unknown,
  options?: PathOptions
): T {
  const cloner = resolveCloner(options);
  const target = cloner ? (cloner(obj) as T) : obj;
  return setPath(target, path, value);
}

export function updateMultiple<T extends object = Record<string, unknown>>(
  obj: T,
  updates: Record<string, unknown>,
  options?: PathOptions
): T {
  const cloner = resolveCloner(options);
  const target = cloner ? (cloner(obj) as T) : obj;

  for (const key of Reflect.ownKeys(updates)) {
    setPath(target, key as string, updates[key as string]);
  }

  return target;
}
