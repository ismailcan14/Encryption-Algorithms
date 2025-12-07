import { Cipher } from "../type";
import { AZ, idx } from "../alph";

export class PolybiusCipher implements Cipher {
  readonly name = "polybius";

  private readonly ROWS = 4;
  private readonly COLS = 8;

  private normalizeKey(key: unknown): string {
    if (key == null) return "";
    const s = String(key).trim();
    if (!s) return "";
    return s.toLocaleUpperCase("tr");
  }

  private buildTable(key: unknown): {
    grid: string[][];
    pos: Record<string, [number, number]>;
  } {
    const k = this.normalizeKey(key);
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const ch of k) {
      const u = ch.toLocaleUpperCase("tr");
      if (idx(u) >= 0 && !seen.has(u)) {
        seen.add(u);
        ordered.push(u);
      }
    }

    for (const ch of AZ) {
      if (!seen.has(ch)) {
        seen.add(ch);
        ordered.push(ch);
      }
    }

    const grid: string[][] = [];
    const pos: Record<string, [number, number]> = {};
    let t = 0;
    for (let r = 0; r < this.ROWS; r++) {
      const row: string[] = [];
      for (let c = 0; c < this.COLS; c++) {
        const ch = ordered[t++];
        row.push(ch);
        pos[ch] = [r, c];
      }
      grid.push(row);
    }
    return { grid, pos };
  }

  encrypt(plain: string, key: unknown): string {
    const { pos } = this.buildTable(key);
    let out = "";

    for (const ch of plain) {
      const u = ch.toLocaleUpperCase("tr");
      if (idx(u) < 0) {
        out += ch;
        continue;
      }
      const p = pos[u];
      if (!p) {
        out += ch;
        continue;
      }
      const [r, c] = p;
      const rowCode = (r + 1).toString(); 
      const colCode = (c + 1).toString(); 
      out += rowCode + colCode;
    }

    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const { grid } = this.buildTable(key);
    let out = "";
    let i = 0;

    while (i < cipher.length) {
      const c1 = cipher[i];
      const c2 = cipher[i + 1];

      if (
        c1 >= "1" &&
        c1 <= "4" &&
        c2 >= "1" &&
        c2 <= "8"
      ) {
        const r = parseInt(c1, 10) - 1;
        const c = parseInt(c2, 10) - 1;
        const ch = grid[r]?.[c];
        if (ch != null) {
          out += ch;
          i += 2;
          continue;
        }
      }

      out += c1;
      i += 1;
    }

    return out;
  }
}
