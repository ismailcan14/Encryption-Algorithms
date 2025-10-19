import { Cipher } from "../type";
import { AZ, idx } from "../alph";

export class PlayfairCipher implements Cipher {
  readonly name = "playfair";

  private readonly ROWS = 4;
  private readonly COLS = 8;


  encrypt(plain: string, key: unknown): string {
    const table = this.buildTable(key);
    const letters = this.extractLetters(plain);
    const digraphs = this.makeDigraphs(letters);
    const outLetters: string[] = [];

    for (const [a, b] of digraphs) {
      const [ra, ca] = table.pos[a]!;
      const [rb, cb] = table.pos[b]!;
      if (ra === rb) {
        const na = table.grid[ra][(ca + 1) % this.COLS];
        const nb = table.grid[rb][(cb + 1) % this.COLS];
        outLetters.push(na, nb);
      } else if (ca === cb) {
        const na = table.grid[(ra + 1) % this.ROWS][ca];
        const nb = table.grid[(rb + 1) % this.ROWS][cb];
        outLetters.push(na, nb);
      } else {
        const na = table.grid[ra][cb];
        const nb = table.grid[rb][ca];
        outLetters.push(na, nb);
      }
    }

    return this.rebuildWithNonLetters(plain, outLetters);
  }

  decrypt(cipher: string, key: unknown): string {
    const table = this.buildTable(key);
    const letters = this.extractLetters(cipher);
    const digraphs = this.chunkPairs(letters); 
    const outLetters: string[] = [];

    for (const [a, b] of digraphs) {
      const [ra, ca] = table.pos[a]!;
      const [rb, cb] = table.pos[b]!;
      if (ra === rb) {
        const na = table.grid[ra][(ca - 1 + this.COLS) % this.COLS];
        const nb = table.grid[rb][(cb - 1 + this.COLS) % this.COLS];
        outLetters.push(na, nb);
      } else if (ca === cb) {
        const na = table.grid[(ra - 1 + this.ROWS) % this.ROWS][ca];
        const nb = table.grid[(rb - 1 + this.ROWS) % this.ROWS][cb];
        outLetters.push(na, nb);
      } else {
        const na = table.grid[ra][cb];
        const nb = table.grid[rb][ca];
        outLetters.push(na, nb);
      }
    }

    return this.rebuildWithNonLetters(cipher, outLetters);
  }


  private buildTable(key: unknown): {
    grid: string[][];
    pos: Record<string, [number, number]>;
  } {
    const k = this.normalizeKey(key);
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const ch of k) {
      if (idx(ch) >= 0 && !seen.has(ch)) {
        seen.add(ch);
        ordered.push(ch);
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

  private normalizeKey(key: unknown): string {
    if (typeof key !== "string") {
      throw new Error("Playfair: Anahtar bir string olmalı");
    }
    const s = key.toLocaleUpperCase("tr").trim();
    if (!s) throw new Error("Playfair: Anahtar boş olamaz");
    return s;
  }


  private extractLetters(text: string): string[] {
    const out: string[] = [];
    for (const ch of text) {
      const u = ch.toLocaleUpperCase("tr");
      if (idx(u) >= 0) out.push(u);
    }
    return out;
  }

  private makeDigraphs(letters: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    let i = 0;
    while (i < letters.length) {
      const a = letters[i];
      const b = letters[i + 1];
      if (b == null) {
        pairs.push([a, "X"]);
        i += 1;
      } else if (a === b) {
        pairs.push([a, "X"]);
        i += 1;
      } else {
        pairs.push([a, b]);
        i += 2;
      }
    }
    return pairs;
  }

  private chunkPairs(letters: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < letters.length; i += 2) {
      const a = letters[i];
      const b = letters[i + 1];
      if (b == null) {
        pairs.push([a, "X"]);
      } else {
        pairs.push([a, b]);
      }
    }
    return pairs;
  }

 
  private rebuildWithNonLetters(original: string, lettersOut: string[]): string {
    const out: string[] = [];
    let li = 0;
    for (const ch of original) {
      const u = ch.toLocaleUpperCase("tr");
      if (idx(u) >= 0) {
        out.push(lettersOut[li++] ?? u);
      } else {
        out.push(ch);
      }
    }
    return out.join("");
  }
}
