import { Cipher } from "../type";
import { AZ, idx } from "../alph";

export class VigenereCipher implements Cipher {
  readonly name = "vigenere";

  private normalizeKey(key: string): string {
    return key.toLocaleUpperCase("tr");
  }

  encrypt(plain: string, key: unknown): string {
    if (typeof key !== "string") {
      throw new Error("VigenereCipher: Anahtar bir string olmalı");
    }

    const k = this.normalizeKey(key);
    let result = "";
    let ki = 0;

    for (let j = 0; j < plain.length; j++) {
      const ch = plain[j];
      const pi = idx(ch); 
      if (pi < 0) {
        result += ch;
        continue;
      }

      const kiIndex = idx(k[ki % k.length]); 
      const newIndex = (pi + kiIndex) % AZ.length; 
      result += AZ[newIndex];

      ki++; 
    }

    return result;
  }

  decrypt(cipher: string, key: unknown): string {
    if (typeof key !== "string") {
      throw new Error("VigenereCipher: Anahtar bir string olmalı");
    }

    const k = this.normalizeKey(key);
    let result = "";
    let ki = 0;

    for (let j = 0; j < cipher.length; j++) {
      const ch = cipher[j];
      const ci = idx(ch);
      if (ci < 0) {
        result += ch;
        continue;
      }

      const kiIndex = idx(k[ki % k.length]);
      const newIndex = (ci - kiIndex + AZ.length) % AZ.length;
      result += AZ[newIndex];

      ki++;
    }

    return result;
  }
}
