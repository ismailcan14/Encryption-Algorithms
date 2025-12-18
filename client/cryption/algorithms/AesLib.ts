import CryptoJS from "crypto-js";
import { Cipher } from "../type";

export class AesLibCipher implements Cipher {
  readonly name = "aes-lib";

  private normalizeKey(key: unknown): string {
    const s = String(key ?? "").trim();
    if (!s) {
      throw new Error("AES (lib): key boş olamaz");
    }
    return s;
  }

  encrypt(plain: string, key: unknown): string {
    const k = this.normalizeKey(key);

    // Passphrase modu: key'i direkt string olarak veriyoruz
    const encrypted = CryptoJS.AES.encrypt(plain, k, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    // OpenSSL formatlı Base64 string (içinde gerekirse salt bilgisi de var)
    return encrypted.toString();
  }

  decrypt(cipher: string, key: unknown): string {
    const k = this.normalizeKey(key);

    // Aynı cipher string + aynı key → otomatik çözülecek
    const decrypted = CryptoJS.AES.decrypt(cipher, k, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plain) {
      throw new Error("AES (lib): şifre çözme başarısız (key veya veri hatalı)");
    }
    return plain;
  }
}
