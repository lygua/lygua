import { SecureRandom } from '@lygua/secure-random';

export const MAX_BYTE_LENGTH = 65536;

export interface QuotaExceededErrorOptions {
  quota?: number;
  requested?: number;
  cause?: unknown;
}

export class QuotaExceededError extends Error {
  quota: number;
  requested?: number;

  constructor(message: string, options: QuotaExceededErrorOptions = {}) {
    super(message, { cause: options.cause });

    Object.defineProperties(this, {
      name: { value: 'QuotaExceededError', configurable: true, writable: true },
      message: { value: message, configurable: true, writable: true },
    });

    this.quota = options.quota ?? MAX_BYTE_LENGTH;
    this.requested = options.requested;

    if (this.quota < 0) {
      throw new RangeError('quota cannot be less than zero', { cause: this });
    }
    if (this.requested !== undefined && this.requested < 0) {
      throw new RangeError('requested cannot be less than zero', { cause: this });
    }
    if (this.requested !== undefined && this.requested < this.quota) {
      throw new RangeError('requested cannot be less than quota', { cause: this });
    }
  }
}

export type ValidTypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array;

export const isValidTypedArray = (value: unknown): value is ValidTypedArray => {
  if (
    value !== null &&
    typeof value === 'object' &&
    (
      value instanceof Int8Array ||
      value instanceof Uint8Array ||
      value instanceof Uint8ClampedArray ||
      value instanceof Int16Array ||
      value instanceof Uint16Array ||
      value instanceof Int32Array ||
      value instanceof Uint32Array ||
      value instanceof BigInt64Array ||
      value instanceof BigUint64Array
    )
  ) {
    return true;
  }

  throw new TypeError(
    `"getRandomValues" expected the "typedArray" parameter to be an instance of an integer TypedArray.`
  );
};

export class CryptoPonyfill {
  static getRandomValues<T extends ValidTypedArray>(typedArray: T): T {
    isValidTypedArray(typedArray);

    if (typedArray.byteLength > MAX_BYTE_LENGTH) {
      throw new QuotaExceededError(
        `Failed to execute 'getRandomValues': The ArrayBufferView's byte length (${typedArray.byteLength}) exceeds the allowed quota (${MAX_BYTE_LENGTH}).`,
        { quota: MAX_BYTE_LENGTH, requested: typedArray.byteLength }
      );
    }

    const byteView = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );

    for (let i = 0; i < byteView.length; i++) {
      byteView[i] = SecureRandom.integer(0, 255);
    }

    return typedArray;
  }

  static randomUUID(): string {
    return Utilities.getUuid();
  }
}

// Ponyfills
export const getRandomValues = <T extends ValidTypedArray>(typedArray: T): T =>
  CryptoPonyfill.getRandomValues(typedArray);

export const randomUUID = (): string => CryptoPonyfill.randomUUID();

/**
 * Installs getRandomValues and randomUUID onto globalThis.crypto safely.
 */
export function installCryptoPolyfill(): void {
  const g = globalThis as Record<string, unknown>;
  const currentCrypto = (g.crypto ?? {}) as Record<string, unknown>;

  if (!currentCrypto.getRandomValues) {
    currentCrypto.getRandomValues = getRandomValues;
  }
  if (!currentCrypto.randomUUID) {
    currentCrypto.randomUUID = randomUUID;
  }

  g.crypto = currentCrypto;
}

// Digest & Hashing Utilities
export * from './digest';
