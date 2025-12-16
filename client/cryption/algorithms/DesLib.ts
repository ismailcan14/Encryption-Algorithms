import CryptoJS from "crypto-js";
import { Cipher } from "../type";

export class DesLibCipher implements Cipher {
  readonly name = "des-lib";

  private normalizeKey(key: unknown): string {
    const s = String(key ?? "").trim();
    if (!s) {
      throw new Error("DES (lib): key boş olamaz");
    }
    return s;
  }

  private toKeyWordArray(s: string): CryptoJS.lib.WordArray {
    const isHex16 = /^[0-9a-fA-F]{16}$/.test(s);
    if (isHex16) {
      return CryptoJS.enc.Hex.parse(s);
    }
    return CryptoJS.enc.Utf8.parse(s);
  }

  encrypt(plain: string, key: unknown): string {
    const k = this.normalizeKey(key);
    const keyWA = this.toKeyWordArray(k);

    const encrypted = CryptoJS.DES.encrypt(plain, keyWA, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString();
  }

  decrypt(cipher: string, key: unknown): string {
    const k = this.normalizeKey(key);
    const keyWA = this.toKeyWordArray(k);

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(cipher),
    });

    const decrypted = CryptoJS.DES.decrypt(cipherParams, keyWA, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plain) {
      throw new Error("DES (lib): şifre çözme başarısız (key yanlış olabilir)");
    }
    return plain;
  }
}
