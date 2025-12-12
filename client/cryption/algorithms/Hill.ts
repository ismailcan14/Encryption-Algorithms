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

type Mat2 = [[number, number], [number, number]];

export class HillCipher implements Cipher {
  readonly name = "hill";
  private readonly m = AZ.length; 

  private parseKey(key: unknown): Mat2 {
    if (typeof key === "object" && key !== null) {
      if (Array.isArray(key)) {
        const flat: number[] = [];
        for (const v of key) {
          if (Array.isArray(v)) {
            for (const x of v) flat.push(Number(x));
          } else {
            flat.push(Number(v));
          }
        }
        if (flat.length !== 4 || flat.some((n) => !Number.isFinite(n))) {
          throw new Error(
            "Hill: JSON key formatı geçersiz. Örn: [[3,3],[2,5]] veya [3,3,2,5]"
          );
        }
        return [
          [norm(flat[0], this.m), norm(flat[1], this.m)],
          [norm(flat[2], this.m), norm(flat[3], this.m)],
        ];
      }

      throw new Error(
        'Hill: JSON key için dizi bekleniyor. Örn: [[3,3],[2,5]]'
      );
    }

    const s = String(key ?? "").trim();
    if (!s) throw new Error("Hill: key boş olamaz");

    const parts = s.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length !== 4) {
      throw new Error('Hill: 4 sayı bekleniyor. Örn: "3 3 2 5" veya "3,3,2,5"');
    }

    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) {
      throw new Error("Hill: key içindeki tüm değerler sayısal olmalı");
    }

    return [
      [norm(nums[0], this.m), norm(nums[1], this.m)],
      [norm(nums[2], this.m), norm(nums[3], this.m)],
    ];
  }

  private ensureInvertible(mat: Mat2): { inv: Mat2 } {
    const [[a, b], [c, d]] = mat;
    const det = norm(a * d - b * c, this.m);
    const detInv = modInverse(det, this.m);
    if (detInv === null) {
      throw new Error(
        "Hill: determinant 32 ile aralarında asal değil (tersi yok). Farklı bir key deneyin."
      );
    }
    const inv: Mat2 = [
      [
        norm(detInv * d, this.m),
        norm(detInv * -b, this.m),
      ],
      [
        norm(detInv * -c, this.m),
        norm(detInv * a, this.m),
      ],
    ];
    return { inv };
  }

  private encodePair(mat: Mat2, v0: number, v1: number): [number, number] {
    const [[a, b], [c, d]] = mat;
    const x0 = norm(a * v0 + b * v1, this.m);
    const x1 = norm(c * v0 + d * v1, this.m);
    return [x0, x1];
  }

  encrypt(plain: string, key: unknown): string {
    const mat = this.parseKey(key);
    this.ensureInvertible(mat); 

    const padIndex = idx("X"); 
    if (padIndex < 0) {
      throw new Error('Hill: AZ alfabesinde "X" harfi bulunamadı');
    }

    let out = "";
    const buffer: number[] = [];

    for (let i = 0; i < plain.length; i++) {
      const ch = plain[i];
      const p = idx(ch);

      if (p < 0) {
        if (buffer.length === 1) {
          const [y0, y1] = this.encodePair(mat, buffer[0], padIndex);
          out += AZ[y0] + AZ[y1];
          buffer.length = 0;
        }
        out += ch;
        continue;
      }

      buffer.push(p);
      if (buffer.length === 2) {
        const [y0, y1] = this.encodePair(mat, buffer[0], buffer[1]);
        out += AZ[y0] + AZ[y1];
        buffer.length = 0;
      }
    }

    if (buffer.length === 1) {
      const [y0, y1] = this.encodePair(mat, buffer[0], padIndex);
      out += AZ[y0] + AZ[y1];
    }

    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const mat = this.parseKey(key);
    const { inv } = this.ensureInvertible(mat);

    let out = "";
    const buffer: number[] = [];

    for (let i = 0; i < cipher.length; i++) {
      const ch = cipher[i];
      const c = idx(ch);

      if (c < 0) {
        if (buffer.length === 1) {
          const padIndex = idx("X");
          const [p0, p1] = this.encodePair(inv, buffer[0], padIndex);
          out += AZ[p0] + AZ[p1];
          buffer.length = 0;
        }
        out += ch;
        continue;
      }

      buffer.push(c);
      if (buffer.length === 2) {
        const [p0, p1] = this.encodePair(inv, buffer[0], buffer[1]);
        out += AZ[p0] + AZ[p1];
        buffer.length = 0;
      }
    }

    if (buffer.length === 1) {
      const padIndex = idx("X");
      if (padIndex < 0) {
        throw new Error('Hill: AZ alfabesinde "X" harfi bulunamadı');
      }
      const [p0, p1] = this.encodePair(inv, buffer[0], padIndex);
      out += AZ[p0] + AZ[p1];
    }

    return out;
  }
}
