/**
 * @module @lygua/testing
 * In-memory fakes and test doubles for Google Apps Script services (PropertiesService, CacheService, Utilities).
 */

// ============================================================================
// PropertiesService Fakes
// ============================================================================

export class FakeProperties {
  private readonly store = new Map<string, string>();

  getProperty(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  getProperties(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      result[k] = v;
    }
    return result;
  }

  setProperty(key: string, value: string): this {
    this.store.set(key, String(value));
    return this;
  }

  setProperties(properties: Record<string, string>, deleteAllOthers = false): this {
    if (deleteAllOthers) {
      this.store.clear();
    }
    for (const [k, v] of Object.entries(properties)) {
      this.store.set(k, String(v));
    }
    return this;
  }

  deleteProperty(key: string): this {
    this.store.delete(key);
    return this;
  }

  deleteAllProperties(): this {
    this.store.clear();
    return this;
  }

  getKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

export class FakePropertiesService {
  private scriptProperties = new FakeProperties();
  private userProperties = new FakeProperties();
  private documentProperties = new FakeProperties();

  getScriptProperties(): FakeProperties {
    return this.scriptProperties;
  }

  getUserProperties(): FakeProperties {
    return this.userProperties;
  }

  getDocumentProperties(): FakeProperties {
    return this.documentProperties;
  }

  resetAll(): void {
    this.scriptProperties.deleteAllProperties();
    this.userProperties.deleteAllProperties();
    this.documentProperties.deleteAllProperties();
  }
}

// ============================================================================
// CacheService Fakes
// ============================================================================

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export class FakeCache {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  getAll(keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const val = this.get(key);
      if (val !== null) {
        result[key] = val;
      }
    }
    return result;
  }

  put(key: string, value: string, expirationInSeconds?: number): void {
    const expiresAt =
      typeof expirationInSeconds === 'number' && expirationInSeconds > 0
        ? Date.now() + expirationInSeconds * 1000
        : null;
    this.store.set(key, { value: String(value), expiresAt });
  }

  putAll(values: Record<string, string>, expirationInSeconds?: number): void {
    for (const [key, val] of Object.entries(values)) {
      this.put(key, val, expirationInSeconds);
    }
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  removeAll(keys: string[]): void {
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export class FakeCacheService {
  private scriptCache = new FakeCache();
  private userCache = new FakeCache();
  private documentCache = new FakeCache();

  getScriptCache(): FakeCache {
    return this.scriptCache;
  }

  getUserCache(): FakeCache {
    return this.userCache;
  }

  getDocumentCache(): FakeCache {
    return this.documentCache;
  }

  resetAll(): void {
    this.scriptCache.clear();
    this.userCache.clear();
    this.documentCache.clear();
  }
}

// ============================================================================
// Utilities Fakes & Blob
// ============================================================================

export class FakeBlob {
  private bytes: Uint8Array;
  private contentType: string;
  private name: string;

  constructor(data: unknown = '', contentType = 'application/octet-stream', name = '') {
    this.contentType = contentType;
    this.name = name;

    if (typeof data === 'string') {
      this.bytes = new TextEncoder().encode(data);
    } else if (data instanceof Uint8Array) {
      this.bytes = new Uint8Array(data);
    } else if (Array.isArray(data)) {
      this.bytes = new Uint8Array(data);
    } else {
      this.bytes = new Uint8Array();
    }
  }

  getBytes(): number[] {
    return Array.from(this.bytes);
  }

  getDataAsString(_charset?: string): string {
    return new TextDecoder().decode(this.bytes);
  }

  getContentType(): string | null {
    return this.contentType || null;
  }

  setContentType(contentType: string): this {
    this.contentType = contentType;
    return this;
  }

  getName(): string | null {
    return this.name || null;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setBytes(bytes: number[] | Uint8Array | string): this {
    if (typeof bytes === 'string') {
      this.bytes = new TextEncoder().encode(bytes);
    } else if (bytes instanceof Uint8Array) {
      this.bytes = new Uint8Array(bytes);
    } else {
      this.bytes = new Uint8Array(bytes);
    }
    return this;
  }

  copyBlob(): FakeBlob {
    return new FakeBlob(this.bytes, this.contentType, this.name);
  }
}

import { createHash } from 'node:crypto';

export class FakeUtilities {
  readonly DigestAlgorithm = {
    MD5: 'MD5' as unknown as GoogleAppsScript.Utilities.DigestAlgorithm,
    SHA_1: 'SHA_1' as unknown as GoogleAppsScript.Utilities.DigestAlgorithm,
    SHA_256: 'SHA_256' as unknown as GoogleAppsScript.Utilities.DigestAlgorithm,
    SHA_384: 'SHA_384' as unknown as GoogleAppsScript.Utilities.DigestAlgorithm,
    SHA_512: 'SHA_512' as unknown as GoogleAppsScript.Utilities.DigestAlgorithm,
  };
  getUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  base64Encode(data: string | number[] | Uint8Array): string {
    let bytes: Uint8Array;
    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      bytes = new Uint8Array(data);
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64Decode(encoded: string): number[] {
    if (typeof Buffer !== 'undefined') {
      return Array.from(Buffer.from(encoded, 'base64'));
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return Array.from(bytes);
  }

  base64EncodeWebSafe(data: string | number[] | Uint8Array): string {
    return this.base64Encode(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  base64DecodeWebSafe(encoded: string): number[] {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return this.base64Decode(base64);
  }

  newBlob(data: unknown, contentType?: string, name?: string): FakeBlob {
    return new FakeBlob(data, contentType, name);
  }

  computeDigest(
    algorithm: string | GoogleAppsScript.Utilities.DigestAlgorithm,
    value: string | number[] | Uint8Array,
    _charset?: GoogleAppsScript.Utilities.Charset
  ): number[] {
    const algoStr = String(algorithm).toUpperCase().replace('-', '_');
    let nodeAlgo: string;
    switch (algoStr) {
      case 'MD5':
        nodeAlgo = 'md5';
        break;
      case 'SHA_1':
      case 'SHA1':
        nodeAlgo = 'sha1';
        break;
      case 'SHA_256':
      case 'SHA256':
        nodeAlgo = 'sha256';
        break;
      case 'SHA_384':
      case 'SHA384':
        nodeAlgo = 'sha384';
        break;
      case 'SHA_512':
      case 'SHA512':
        nodeAlgo = 'sha512';
        break;
      default:
        throw new TypeError(`FakeUtilities.computeDigest: Unsupported algorithm "${algorithm}"`);
    }

    let inputBytes: Uint8Array;
    if (typeof value === 'string') {
      inputBytes = new TextEncoder().encode(value);
    } else if (value instanceof Uint8Array) {
      inputBytes = value;
    } else {
      inputBytes = new Uint8Array(value);
    }

    const hash = createHash(nodeAlgo).update(inputBytes).digest();
    // Google Apps Script returns signed byte array (-128 to 127)
    return Array.from(new Int8Array(hash.buffer, hash.byteOffset, hash.byteLength));
  }

  sleep(ms: number): void {
    // Synchronous busy-wait sleep for Node/V8 testing environments
    const start = Date.now();
    while (Date.now() - start < ms) {
      // spin
    }
  }
}

// ============================================================================
// Global Test Doubles Installation
// ============================================================================

export interface TestingGlobalsOptions {
  properties?: boolean;
  cache?: boolean;
  utilities?: boolean;
}

export function installTestingGlobals(options: TestingGlobalsOptions = {}): {
  propertiesService: FakePropertiesService;
  cacheService: FakeCacheService;
  utilities: FakeUtilities;
} {
  const g = globalThis as Record<string, unknown>;

  const propertiesService = new FakePropertiesService();
  const cacheService = new FakeCacheService();
  const utilities = new FakeUtilities();

  if (options.properties !== false) {
    g.PropertiesService = propertiesService;
  }
  if (options.cache !== false) {
    g.CacheService = cacheService;
  }
  if (options.utilities !== false) {
    g.Utilities = utilities;
  }

  return { propertiesService, cacheService, utilities };
}

export function uninstallTestingGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  delete g.PropertiesService;
  delete g.CacheService;
  delete g.Utilities;
}
