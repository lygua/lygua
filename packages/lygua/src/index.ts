import * as SecureRandom from "@lygua/secure-random";
import * as Crypto from "@lygua/crypto";
import * as Client from "@lygua/client";
import * as Utils from "@lygua/utils";

export { SecureRandom, Crypto, Client, Utils };

export class Lygua {
  static readonly version: string = "0.1.0";
  static readonly SecureRandom: typeof SecureRandom = SecureRandom;
  static readonly Crypto: typeof Crypto = Crypto;
  static readonly Client: typeof Client = Client;
  static readonly Utils: typeof Utils = Utils;

  static readonly Cloner: typeof Utils.Cloner = Utils.Cloner;
  static readonly AccessorMode: typeof Utils.AccessorMode = Utils.AccessorMode;
  static readonly PrivateData: typeof Utils.PrivateData = Utils.PrivateData;
  static readonly createPrivateStore: typeof Utils.createPrivateStore = Utils.createPrivateStore;
  static readonly DeepMerge: typeof Utils.DeepMerge = Utils.DeepMerge;
  static readonly HandleArrays: typeof Utils.HandleArrays = Utils.HandleArrays;

  static installGlobalPolyfills(): void {
    Crypto.installCryptoPolyfill();
  }

  static clone<T>(obj: T, options?: Utils.ClonerOptions): T {
    return Utils.clone(obj, options);
  }

  static deepClone<T>(obj: T, options?: Utils.ClonerOptions): T {
    return Utils.deepClone(obj, options);
  }

  static deepFreeze<T>(obj: T): Utils.DeepReadonly<T> {
    return Utils.deepFreeze(obj);
  }

  static freeze<T>(
    obj: T,
    hardenProto: boolean = true,
    accessorMode: Utils.AccessorMode = Utils.AccessorMode.SNAPSHOT
  ): Utils.DeepReadonly<T> {
    return Utils.freeze(obj, hardenProto, accessorMode);
  }

  static freezeClass<T extends Function>(ctor: T, freezePrototype: boolean = true): T {
    return Utils.freezeClass(ctor, freezePrototype);
  }

  static deepMerge<T extends object>(
    target: T,
    ...sourcesAndOptions: (object | Utils.MergeOptions | undefined | null)[]
  ): T {
    return Utils.deepMerge(target, ...sourcesAndOptions);
  }

  static parsePath(path: string | readonly PropertyKey[]): PropertyKey[] {
    return Utils.parsePath(path);
  }

  static hasPath(obj: unknown, path: string | readonly PropertyKey[]): boolean {
    return Utils.hasPath(obj, path);
  }

  static getPath<T = unknown>(
    obj: unknown,
    path: string | readonly PropertyKey[],
    defaultValue?: T
  ): T {
    return Utils.getPath(obj, path, defaultValue);
  }

  static setPath<T extends object = Record<string, unknown>>(
    obj: T,
    path: string | readonly PropertyKey[],
    value: unknown
  ): T {
    return Utils.setPath(obj, path, value);
  }

  static deletePath<T extends object = Record<string, unknown>>(
    obj: T,
    path: string | readonly PropertyKey[]
  ): boolean {
    return Utils.deletePath(obj, path);
  }

  static updateNested<T extends object = Record<string, unknown>>(
    obj: T,
    path: string | readonly PropertyKey[],
    value: unknown,
    options?: Utils.PathOptions
  ): T {
    return Utils.updateNested(obj, path, value, options);
  }

  static updateMultiple<T extends object = Record<string, unknown>>(
    obj: T,
    updates: Record<string, unknown>,
    options?: Utils.PathOptions
  ): T {
    return Utils.updateMultiple(obj, updates, options);
  }

  static deepEqual(left: unknown, right: unknown): boolean {
    return Utils.deepEqual(left, right);
  }

  static isEqual(left: unknown, right: unknown): boolean {
    return Utils.isEqual(left, right);
  }

  static equal(left: unknown, right: unknown): boolean {
    return Utils.equal(left, right);
  }
}

export default Lygua;
