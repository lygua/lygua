function hasSeen(
  seen: WeakMap<object, WeakSet<object>>,
  left: object,
  right: object
): boolean {
  return seen.get(left)?.has(right) ?? false;
}

function markSeen(
  seen: WeakMap<object, WeakSet<object>>,
  left: object,
  right: object
): void {
  let set = seen.get(left);
  if (!set) {
    set = new WeakSet();
    seen.set(left, set);
  }
  set.add(right);
}

function getEnumerableKeys(obj: object): PropertyKey[] {
  const keys: PropertyKey[] = Object.keys(obj);
  const symbols = Object.getOwnPropertySymbols(obj);
  for (let i = 0; i < symbols.length; i++) {
    if (Object.prototype.propertyIsEnumerable.call(obj, symbols[i])) {
      keys.push(symbols[i]);
    }
  }
  return keys;
}

function equalArray(left: unknown[], right: unknown[], seen: WeakMap<object, WeakSet<object>>): boolean {
  if (left.length !== right.length) return false;
  for (let i = left.length; i-- !== 0; ) {
    if (!compareValues(left[i], right[i], seen)) {
      return false;
    }
  }
  return true;
}

function equalArrayBuffer(left: ArrayBuffer, right: ArrayBuffer): boolean {
  if (left.byteLength !== right.byteLength) return false;
  const u8Left = new Uint8Array(left);
  const u8Right = new Uint8Array(right);
  for (let i = left.byteLength; i-- !== 0; ) {
    if (u8Left[i] !== u8Right[i]) return false;
  }
  return true;
}

function equalArrayBufferView(left: ArrayBufferView, right: ArrayBufferView): boolean {
  if (left.byteLength !== right.byteLength) return false;
  const u8Left = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
  const u8Right = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
  for (let i = left.byteLength; i-- !== 0; ) {
    if (u8Left[i] !== u8Right[i]) return false;
  }
  return true;
}

function equalError(
  left: Error,
  right: Error,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  return (
    left.name === right.name &&
    left.message === right.message &&
    compareValues((left as any).cause, (right as any).cause, seen)
  );
}

function equalMap(
  left: Map<unknown, unknown>,
  right: Map<unknown, unknown>,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  if (left.size !== right.size) return false;

  for (const [leftKey, leftVal] of left.entries()) {
    if (right.has(leftKey)) {
      if (!compareValues(leftVal, right.get(leftKey), seen)) {
        return false;
      }
    } else {
      let matched = false;
      if (leftKey !== null && typeof leftKey === 'object') {
        for (const [rightKey, rightVal] of right.entries()) {
          if (compareValues(leftKey, rightKey, seen)) {
            if (compareValues(leftVal, rightVal, seen)) {
              matched = true;
              break;
            }
          }
        }
      }
      if (!matched) return false;
    }
  }
  return true;
}

function equalSet(
  left: Set<unknown>,
  right: Set<unknown>,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  if (left.size !== right.size) return false;

  const rightItems = Array.from(right.values());
  const matchedIndices = new Set<number>();

  for (const leftVal of left.values()) {
    if (right.has(leftVal)) {
      continue;
    }
    let found = false;
    if (leftVal !== null && typeof leftVal === 'object') {
      for (let i = 0; i < rightItems.length; i++) {
        if (!matchedIndices.has(i) && compareValues(leftVal, rightItems[i], seen)) {
          matchedIndices.add(i);
          found = true;
          break;
        }
      }
    }
    if (!found) return false;
  }
  return true;
}

function equalPlainObject(
  left: any,
  right: any,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  const leftKeys = getEnumerableKeys(left);
  const rightKeys = getEnumerableKeys(right);

  if (leftKeys.length !== rightKeys.length) return false;

  for (let i = leftKeys.length; i-- !== 0; ) {
    if (!Object.prototype.hasOwnProperty.call(right, leftKeys[i])) {
      return false;
    }
  }

  for (let i = leftKeys.length; i-- !== 0; ) {
    const key = leftKeys[i];
    if (key === '_owner' && left.$$typeof) {
      continue;
    }
    if (!compareValues(left[key], right[key], seen)) {
      return false;
    }
  }

  return true;
}

function compareObjects(
  left: any,
  right: any,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  if (hasSeen(seen, left, right)) {
    return true;
  }
  markSeen(seen, left, right);

  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return equalArray(left, right, seen);
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (left instanceof RegExp && right instanceof RegExp) {
    return left.source === right.source && left.flags === right.flags;
  }

  if (left instanceof Map && right instanceof Map) {
    return equalMap(left, right, seen);
  }

  if (left instanceof Set && right instanceof Set) {
    return equalSet(left, right, seen);
  }

  if (
    left instanceof WeakMap ||
    left instanceof WeakSet ||
    right instanceof WeakMap ||
    right instanceof WeakSet
  ) {
    return false;
  }

  if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
    return equalArrayBuffer(left, right);
  }

  if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
    if (left.constructor !== right.constructor) return false;
    return equalArrayBufferView(left, right);
  }

  if (left instanceof Error && right instanceof Error) {
    return equalError(left, right, seen);
  }

  if (
    left instanceof Boolean ||
    left instanceof Number ||
    left instanceof String ||
    (typeof BigInt === 'function' && left instanceof Object(BigInt(0)).constructor) ||
    (typeof Symbol === 'function' && left instanceof Object(Symbol()).constructor)
  ) {
    return left.valueOf() === right.valueOf();
  }

  return equalPlainObject(left, right, seen);
}

function compareValues(
  left: unknown,
  right: unknown,
  seen: WeakMap<object, WeakSet<object>>
): boolean {
  if (left === right) {
    return true;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) && Number.isNaN(right)) {
      return true;
    }
  }

  if (
    left === null ||
    typeof left !== 'object' ||
    right === null ||
    typeof right !== 'object'
  ) {
    return false;
  }

  return compareObjects(left, right, seen);
}

export function deepEqual(left: unknown, right: unknown): boolean {
  return compareValues(left, right, new WeakMap());
}

export const isEqual: (left: unknown, right: unknown) => boolean = deepEqual;
export const equal: (left: unknown, right: unknown) => boolean = deepEqual;
