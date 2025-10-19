import { Cipher } from "../type";
import { AZ, idx, norm } from "../alph";

function egcd(a: number, b: number): { g: number; x: number; y: number } {
  if (b === 0) return { g: Math.abs(a), x: a >= 0 ? 1 : -1, y: 0 };
  const { g, x, y } = egcd(b, a % b);
  return { g, x: y, y: x - Math.floor(a / b) * y };
}

function modInverse(a: number, m: number): number | null {
  const { g, x } = egcd(a, m);
  if (g !== 1) return null;
  return norm(x, m);
}

export class AffineCipher implements Cipher {
  readonly name = "affine";
  private readonly m = AZ.length; 

  private validateA(a: number) {
    if (!Number.isInteger(a)) throw new Error("Affine: a tamsayı olmalı");
    if (a === 0) throw new Error("Affine: a sıfır olamaz");
    if (Math.abs(a) % 2 === 0) {
      throw new Error("Affine: a ile 32 aralarında asal olmalı (a tek olmalı)");
    }
  }

  private parseKey(key: unknown): { a: number; b: number } {
    if (typeof key === "object" && key !== null) {
      const a = Number((key as any).a);
      const b = Number((key as any).b);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error("Affine: a ve b sayısal olmalı");
      }
      return { a, b };
    }

    const s = String(key ?? "").trim();
    if (!s) throw new Error("Affine: key boş olamaz");
    const parts = s.replace(/\s+/g, " ").replace(",", " ").split(" ").filter(Boolean);
    if (parts.length < 2) throw new Error('Affine: "a b" veya "a,b" formatı bekleniyor');
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error("Affine: a ve b sayısal olmalı");
    }
    return { a, b };
  }

  encrypt(plain: string, key: unknown): string {
    const { a, b } = this.parseKey(key);
    this.validateA(a);
    const A = norm(a, this.m);
    const B = norm(b, this.m);

    let out = "";
    for (let j = 0; j < plain.length; j++) {
      const ch = plain[j];
      const p = idx(ch);
      if (p < 0) { out += ch; continue; }
      const c = norm(A * p + B, this.m);
      out += AZ[c];
    }
    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const { a, b } = this.parseKey(key);
    this.validateA(a);
    const A = norm(a, this.m);
    const B = norm(b, this.m);

    const invA = modInverse(A, this.m);
    if (invA === null) throw new Error("Affine: a için mod 32 ters yok (a ve 32 aralarında asal olmalı)");

    let out = "";
    for (let j = 0; j < cipher.length; j++) {
      const ch = cipher[j];
      const c = idx(ch);
      if (c < 0) { out += ch; continue; }
      const p = norm(invA * (c - B), this.m);
      out += AZ[p];
    }
    return out;
  }
}
