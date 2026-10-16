export class SecureRandom {
  /**
   * Generates a cryptographically secure random float in the range [0, 1).
   * Extracts unbiased entropy bits from Google Apps Script's backend SecureRandom.
   */
  static random(): number {
    const hexSubset = Utilities.getUuid()
      .split('')
      .filter((e: unknown, i: number) => e !== '-' && i !== 14 && i !== 19)
      .join('')
      .slice(0, 14);

    const bigIntValue = BigInt('0x' + hexSubset);
    const maxRange = BigInt(2) ** BigInt(56);
    return Number(bigIntValue) / Number(maxRange);
  }

  /**
   * Generates a cryptographically secure integer between min and max (inclusive).
   */
  static integer(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(this.random() * (high - low + 1) + low);
  }

  /**
   * Returns a Uint8Array filled with cryptographically secure random bytes.
   */
  static bytes(length: number): Uint8Array {
    const buffer = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = this.integer(0, 255);
    }
    return buffer;
  }
}

// Top-level functional exports (Ponyfills)
export const secureRandom = (): number => SecureRandom.random();
export const randomInteger = (min: number, max: number): number => SecureRandom.integer(min, max);
export const randomBytes = (length: number): Uint8Array => SecureRandom.bytes(length);
