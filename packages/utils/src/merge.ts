import { Cloner, clone } from './clone';
import { freezeClass } from './freeze';

export type ArrayMergeMode = 'replace' | 'merge' | 'concat' | 'union';

export interface HandleArraysObject {
  readonly MERGE: 'merge';
  readonly REPLACE: 'replace';
  readonly CONCAT: 'concat';
  readonly UNION: 'union';
}

export const HandleArrays: HandleArraysObject = Object.freeze({
  MERGE: 'merge',
  REPLACE: 'replace',
  CONCAT: 'concat',
  UNION: 'union',
});

export interface MergeOptions {
  handleArrays?: ArrayMergeMode;
  clone?: boolean | Cloner | ((val: unknown) => unknown);
  cloner?: Cloner | ((val: unknown) => unknown);
}

function resolveCloner(options?: MergeOptions): ((val: unknown) => unknown) | null {
  if (!options) return null;
  const c = options.clone ?? options.cloner;
  if (!c) return null;
  if (typeof c === 'function') return c;
  if (c instanceof Cloner) return (v: unknown) => c.clone(v);
  if (c === true) return (v: unknown) => clone(v);
  return null;
}

function isPlainObject(val: unknown): val is Record<PropertyKey, unknown> {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function isMergeOptions(arg: unknown): arg is MergeOptions {
  if (!arg || typeof arg !== 'object') return false;
  return 'handleArrays' in arg || 'clone' in arg || 'cloner' in arg;
}

function mergeRecursive(
  dest: any,
  src: any,
  handleArrays: ArrayMergeMode,
  cloner: ((val: unknown) => unknown) | null,
  seen: WeakMap<object, object>
): void {
  if (src === null || typeof src !== 'object') return;
  if (seen.has(src)) return;
  seen.set(src, dest);

  const keys = Reflect.ownKeys(src);

  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const srcVal = src[key];

    if (Array.isArray(srcVal)) {
      if (handleArrays === 'merge' || handleArrays === 'concat') {
        if (Array.isArray(dest[key])) {
          const combined = [...dest[key], ...srcVal];
          dest[key] = cloner ? combined.map(cloner) : combined;
        } else {
          dest[key] = cloner ? cloner(srcVal) : srcVal.slice();
        }
      } else if (handleArrays === 'union') {
        if (Array.isArray(dest[key])) {
          const combined = Array.from(new Set([...dest[key], ...srcVal]));
          dest[key] = cloner ? combined.map(cloner) : combined;
        } else {
          dest[key] = cloner ? cloner(srcVal) : srcVal.slice();
        }
      } else {
        dest[key] = cloner ? cloner(srcVal) : srcVal.slice();
      }
    } else if (isPlainObject(srcVal)) {
      if (!isPlainObject(dest[key])) {
        dest[key] = {};
      }
      mergeRecursive(dest[key], srcVal, handleArrays, cloner, seen);
    } else if (srcVal instanceof Date) {
      dest[key] = cloner ? cloner(srcVal) : new Date(srcVal.getTime());
    } else if (srcVal instanceof RegExp) {
      dest[key] = cloner ? cloner(srcVal) : new RegExp(srcVal.source, srcVal.flags);
    } else if (ArrayBuffer.isView(srcVal) || srcVal instanceof ArrayBuffer) {
      dest[key] = cloner ? cloner(srcVal) : srcVal;
    } else {
      dest[key] =
        cloner && typeof srcVal === 'object' && srcVal !== null
          ? cloner(srcVal)
          : srcVal;
    }
  }
}

export function deepMerge<T extends object>(
  target: T,
  ...sourcesAndOptions: (object | MergeOptions | undefined | null)[]
): T {
  if (!target || typeof target !== 'object') {
    return target;
  }

  let options: MergeOptions = {};
  const sources: object[] = [];

  for (let i = 0; i < sourcesAndOptions.length; i++) {
    const item = sourcesAndOptions[i];
    if (i === sourcesAndOptions.length - 1 && isMergeOptions(item)) {
      options = item;
    } else if (item && typeof item === 'object') {
      sources.push(item);
    }
  }

  const handleArrays = options.handleArrays ?? HandleArrays.REPLACE;
  const cloner = resolveCloner(options);
  const result: any = cloner ? cloner(target) : target;
  const seen = new WeakMap<object, object>();

  for (const source of sources) {
    mergeRecursive(result, source, handleArrays, cloner, seen);
  }

  return result as T;
}

export class DeepMerge {
  static get HandleArrays(): HandleArraysObject {
    return HandleArrays;
  }

  deepMerge<T extends object, S extends object>(
    target: T,
    source: S,
    options: MergeOptions = {}
  ): T & S {
    return deepMerge(target, source, options) as T & S;
  }
}

freezeClass(DeepMerge);
