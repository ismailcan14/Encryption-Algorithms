import { Cipher } from "../type";

export class RailFenceCipher implements Cipher {
  readonly name = "railfence";

  private parseRails(key: unknown): number {
    const n =
      typeof key === "number"
        ? key
        : Number(String(key ?? "").trim());

    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error("Rail Fence: key tamsayı olmalı");
    }
    if (n < 2) {
      throw new Error("Rail Fence: key en az 2 olmalı");
    }
    return n;
  }

  private buildPattern(length: number, rails: number): number[] {
    const pattern: number[] = new Array(length);
    let row = 0;
    let dir = 1; 

    for (let i = 0; i < length; i++) {
      pattern[i] = row;
      row += dir;
      if (row === 0 || row === rails - 1) {
        dir *= -1;
      }
    }
    return pattern;
  }

  encrypt(plain: string, key: unknown): string {
    const rails = this.parseRails(key);
    if (plain.length === 0) return plain;

    const pattern = this.buildPattern(plain.length, rails);
    const rows: string[] = Array.from({ length: rails }, () => "");

    for (let i = 0; i < plain.length; i++) {
      const r = pattern[i];
      rows[r] += plain[i];
    }

    return rows.join("");
  }

  decrypt(cipher: string, key: unknown): string {
    const rails = this.parseRails(key);
    const len = cipher.length;
    if (len === 0) return cipher;

    const pattern = this.buildPattern(len, rails);

    const counts: number[] = Array.from({ length: rails }, () => 0);
    for (const r of pattern) {
      counts[r]++;
    }

    const railsText: string[] = new Array(rails);
    let pos = 0;
    for (let r = 0; r < rails; r++) {
      const count = counts[r];
      railsText[r] = cipher.slice(pos, pos + count);
      pos += count;
    }

    const indices: number[] = Array.from({ length: rails }, () => 0);
    const out: string[] = new Array(len);

    for (let i = 0; i < len; i++) {
      const r = pattern[i];
      const idx = indices[r]++;
      out[i] = railsText[r][idx];
    }

    return out.join("");
  }
}