import { Cipher } from "../type";

export class RouteCipher implements Cipher {
  readonly name = "route";

  private parseCols(key: unknown): number {
    const n =
      typeof key === "number"
        ? key
        : Number(String(key ?? "").trim());

    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error("Route: key tamsayı olmalı");
    }
    if (n < 2) {
      throw new Error("Route: key en az 2 olmalı");
    }
    return n;
  }


  encrypt(plain: string, key: unknown): string {
    const cols = this.parseCols(key);
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
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const ch = grid[r][c];
        if (ch != null) out += ch;
      }
    }

    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const cols = this.parseCols(key);
    const n = cipher.length;
    if (n === 0) return cipher;

    const rows = Math.ceil(n / cols);
    const remainder = n % cols;


    const colHeights: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      if (remainder === 0 || c < remainder) {
        colHeights[c] = rows;
      } else {
        colHeights[c] = rows - 1;
      }
    }

    const grid: (string | null)[][] = Array.from({ length: rows }, () =>
      Array<string | null>(cols).fill(null)
    );

    let idx = 0;
    for (let c = 0; c < cols; c++) {
      const h = colHeights[c];
      for (let r = 0; r < h; r++) {
        grid[r][c] = cipher[idx++];
      }
    }

    const out: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = grid[r][c];
        if (ch != null) out.push(ch);
      }
    }

    return out.join("");
  }
}
