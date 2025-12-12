import { Cipher } from "../type";
import { AZ, idx } from "../alph";

export class PigpenCipher implements Cipher {
  readonly name = "pigpen";

  private normalizeText(text: string): string {
    let out = "";
    for (const ch of text) {
      const u = ch.toLocaleUpperCase("tr");
      if (idx(u) >= 0) {
        out += u;
      } else {
        out += ch;
      }
    }
    return out;
  }

  encrypt(plain: string, key: unknown): string {
    return this.normalizeText(plain);
  }

  decrypt(cipher: string, key: unknown): string {
    return this.normalizeText(cipher);
  }
}
