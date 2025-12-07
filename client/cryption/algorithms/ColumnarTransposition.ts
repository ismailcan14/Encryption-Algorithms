import { Cipher } from "../type";

export class ColumnarTranspositionCipher implements Cipher {
  readonly name = "columnar";

  private normalizeKey(key: unknown): string {
    const s = String(key ?? "").trim();
    if (!s) throw new Error("Columnar: key boş olamaz");
    if (s.length < 2) throw new Error("Columnar: key en az 2 karakter olmalı");
    return s.toLocaleUpperCase("tr");
  }

  private getPermutation(key: string): number[] {
    const chars = key.split("");
    const indexed = chars.map((ch, idx) => ({ ch, idx }));
    indexed.sort((a, b) => {
      if (a.ch < b.ch) return -1;
      if (a.ch > b.ch) return 1;
      return a.idx - b.idx;
    });
    return indexed.map((x) => x.idx);
  }

  encrypt(plain: string, key: unknown): string {
    const k = this.normalizeKey(key);
    const cols = k.length;
    const perm = this.getPermutation(k);
    const n = plain.length;
    if (n === 0) return plain;

    const rows = Math.ceil(n / cols);

    const grid: (string | null)[][] = Array.from({ length: rows }, () =>
      Array<string | null>(cols).fill(null)
    );

    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      grid[r][c] = plain[i];
    }

    let out = "";
    for (const c of perm) {
      for (let r = 0; r < rows; r++) {
        const ch = grid[r][c];
        if (ch != null) out += ch;
      }
    }

    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const k = this.normalizeKey(key);
    const cols = k.length;
    const perm = this.getPermutation(k);
    const n = cipher.length;
    if (n === 0) return cipher;

    const rows = Math.ceil(n / cols);
    const remainder = n % cols;


    const counts: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      if (remainder === 0 || c < remainder) {
        counts[c] = rows;
      } else {
        counts[c] = rows - 1;
      }
    }

    const grid: (string | null)[][] = Array.from({ length: rows }, () =>
      Array<string | null>(cols).fill(null)
    );

    let idx = 0;
    for (const c of perm) {
      const count = counts[c];
      for (let r = 0; r < count; r++) {
        grid[r][c] = cipher[idx++];
      }
    }

    const out: string[] = [];
    for (let i = 0; i < rows * cols; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const ch = grid[r][c];
      if (ch != null) out.push(ch);
    }

    return out.join("");
  }
}
