/**
 * @module @lygua/crypto/digest
 * High-performance digest and hash utilities for Google Apps Script.
 * Wraps Utilities.computeDigest with support for strings, Blobs, Drive Files, Uint8Array, and Byte[].
 */

export type DigestAlgorithm =
  | 'MD5' | 'md5'
  | 'SHA-1' | 'SHA_1' | 'sha1' | 'sha-1'
  | 'SHA-256' | 'SHA_256' | 'sha256' | 'sha-256'
  | 'SHA-384' | 'SHA_384' | 'sha384' | 'sha-384'
  | 'SHA-512' | 'SHA_512' | 'sha512' | 'sha-512';

export type DigestFormat = 'hex' | 'hex-upper' | 'bytes' | 'base64' | 'raw';

export interface DigestOptions<TFormat extends DigestFormat = 'hex'> {
  format?: TFormat;
  charset?: GoogleAppsScript.Utilities.Charset;
}

export type DigestInput =
  | string
  | Uint8Array
  | ArrayBuffer
  | number[]
  | { getBytes(): number[] | Uint8Array }
  | { getBlob(): { getBytes(): number[] | Uint8Array } };

/**
 * Resolves any standard algorithm name to the Google Apps Script enum.
 */
export function resolveGasAlgorithm(
  algorithm: DigestAlgorithm
): GoogleAppsScript.Utilities.DigestAlgorithm {
  const normalized = algorithm.toUpperCase().replace('-', '_');
  const gasEnum =
    typeof Utilities !== 'undefined' && Utilities?.DigestAlgorithm
      ? Utilities.DigestAlgorithm
      : null;

  switch (normalized) {
    case 'MD5':
      return gasEnum ? gasEnum.MD5 : ('MD5' as any);
    case 'SHA_1':
    case 'SHA1':
      return gasEnum ? gasEnum.SHA_1 : ('SHA_1' as any);
    case 'SHA_256':
    case 'SHA256':
      return gasEnum ? gasEnum.SHA_256 : ('SHA_256' as any);
    case 'SHA_384':
    case 'SHA384':
      return gasEnum ? gasEnum.SHA_384 : ('SHA_384' as any);
    case 'SHA_512':
    case 'SHA512':
      return gasEnum ? gasEnum.SHA_512 : ('SHA_512' as any);
    default:
      throw new TypeError(
        `Unsupported digest algorithm: "${algorithm}". Supported: MD5, SHA-1, SHA-256, SHA-384, SHA-512.`
      );
  }
}

/**
 * Converts signed byte array or Uint8Array into a standard Uint8Array.
 */
export function toUint8Array(bytes: number[] | Uint8Array): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes;
  const uint8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    uint8[i] = bytes[i] & 0xff;
  }
  return uint8;
}

/**
 * Encodes byte array or Uint8Array to a hex string.
 */
export function toHex(bytes: Uint8Array | number[], uppercase = false): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] & 0xff;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return uppercase ? hex.toUpperCase() : hex;
}

/**
 * Encodes byte array or Uint8Array to Base64.
 */
export function toBase64(bytes: Uint8Array | number[]): string {
  const uint8 = toUint8Array(bytes);
  if (typeof Utilities !== 'undefined' && typeof Utilities.base64Encode === 'function') {
    // In modern GAS V8, Utilities.base64Encode accepts Uint8Array directly
    return Utilities.base64Encode(uint8 as unknown as number[]);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Normalizes input from string, Blob, Drive File, Uint8Array, or Byte[].
 */
export function normalizeDigestInput(input: DigestInput): string | Uint8Array | number[] {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (Array.isArray(input)) {
    return input;
  }
  // Drive file with getBlob()
  if (input && typeof (input as { getBlob?: () => { getBytes(): number[] | Uint8Array } }).getBlob === 'function') {
    return (input as { getBlob(): { getBytes(): number[] | Uint8Array } }).getBlob().getBytes();
  }
  // Blob with getBytes()
  if (input && typeof (input as { getBytes?: () => number[] | Uint8Array }).getBytes === 'function') {
    return (input as { getBytes(): number[] | Uint8Array }).getBytes();
  }
  throw new TypeError(
    'Invalid input for computeDigest. Expected string, Blob, Drive File, Uint8Array, ArrayBuffer, or Byte[].'
  );
}

/**
 * Computes a cryptographic hash using Utilities.computeDigest.
 *
 * @param algorithm - MD5, SHA-1, SHA-256, SHA-384, or SHA-512
 * @param input - string, Blob, Google Drive File, Uint8Array, or Java byte array
 * @param options - Format ('hex' | 'hex-upper' | 'bytes' | 'base64' | 'raw') and optional charset
 * @returns Hash formatted according to the requested format (default: lowercase hex string)
 */
export function computeDigest<TFormat extends DigestFormat = 'hex'>(
  algorithm: DigestAlgorithm,
  input: DigestInput,
  options: DigestOptions<TFormat> = {}
): DigestResult<TFormat> {
  const gasAlgo = resolveGasAlgorithm(algorithm);
  const normalizedInput = normalizeDigestInput(input);
  const format = options.format ?? ('hex' as TFormat);

  let rawBytes: number[];

  if (typeof normalizedInput === 'string') {
    if (options.charset) {
      rawBytes = Utilities.computeDigest(gasAlgo, normalizedInput, options.charset);
    } else {
      rawBytes = Utilities.computeDigest(gasAlgo, normalizedInput);
    }
  } else {
    // Uint8Array is interchangeable with Google Apps Script Byte[] in modern V8 runtime
    rawBytes = Utilities.computeDigest(
      gasAlgo,
      normalizedInput as unknown as GoogleAppsScript.Byte[]
    );
  }

  switch (format) {
    case 'hex':
      return toHex(rawBytes, false) as any;
    case 'hex-upper':
      return toHex(rawBytes, true) as any;
    case 'bytes':
      return toUint8Array(rawBytes) as any;
    case 'base64':
      return toBase64(rawBytes) as any;
    case 'raw':
      return rawBytes as any;
    default:
      return toHex(rawBytes, false) as any;
  }
}

export type DigestResult<TFormat extends DigestFormat = 'hex'> =
  TFormat extends 'bytes' ? Uint8Array : TFormat extends 'raw' ? number[] : string;

// ============================================================================
// Convenience Shortcuts
// ============================================================================

export function md5<TFormat extends DigestFormat = 'hex'>(
  input: DigestInput,
  options: DigestOptions<TFormat> | TFormat = {}
): DigestResult<TFormat> {
  const opts = typeof options === 'string' ? { format: options } : options;
  return computeDigest('MD5', input, opts);
}

export function sha1<TFormat extends DigestFormat = 'hex'>(
  input: DigestInput,
  options: DigestOptions<TFormat> | TFormat = {}
): DigestResult<TFormat> {
  const opts = typeof options === 'string' ? { format: options } : options;
  return computeDigest('SHA-1', input, opts);
}

export function sha256<TFormat extends DigestFormat = 'hex'>(
  input: DigestInput,
  options: DigestOptions<TFormat> | TFormat = {}
): DigestResult<TFormat> {
  const opts = typeof options === 'string' ? { format: options } : options;
  return computeDigest('SHA-256', input, opts);
}

export function sha384<TFormat extends DigestFormat = 'hex'>(
  input: DigestInput,
  options: DigestOptions<TFormat> | TFormat = {}
): DigestResult<TFormat> {
  const opts = typeof options === 'string' ? { format: options } : options;
  return computeDigest('SHA-384', input, opts);
}

export function sha512<TFormat extends DigestFormat = 'hex'>(
  input: DigestInput,
  options: DigestOptions<TFormat> | TFormat = {}
): DigestResult<TFormat> {
  const opts = typeof options === 'string' ? { format: options } : options;
  return computeDigest('SHA-512', input, opts);
}

