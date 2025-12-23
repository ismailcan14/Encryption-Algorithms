export interface RsaKeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export interface ExportedKeyPair {
    publicKeyBase64: string;
    privateKey: CryptoKey;
}

export class RsaKeyExchange {
    private keyPair: RsaKeyPair | null = null;

    async generateKeyPair(): Promise<RsaKeyPair> {
        this.keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
        return this.keyPair;
    }

    async exportPublicKey(): Promise<string> {
        if (!this.keyPair) {
            throw new Error("RSA: Önce generateKeyPair() çağrılmalı");
        }
        const exported = await crypto.subtle.exportKey("spki", this.keyPair.publicKey);
        return this.arrayBufferToBase64(exported);
    }

    async importPublicKey(base64Key: string): Promise<CryptoKey> {
        const keyBuffer = this.base64ToArrayBuffer(base64Key);
        return await crypto.subtle.importKey(
            "spki",
            keyBuffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            true,
            ["encrypt"]
        );
    }

    async encryptAesKey(aesKeyBytes: Uint8Array, recipientPublicKey: CryptoKey): Promise<string> {
        const buffer = new ArrayBuffer(aesKeyBytes.length);
        new Uint8Array(buffer).set(aesKeyBytes);

        const encrypted = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            recipientPublicKey,
            buffer
        );
        return this.arrayBufferToBase64(encrypted);
    }

    async decryptAesKey(encryptedKeyBase64: string): Promise<Uint8Array> {
        if (!this.keyPair) {
            throw new Error("RSA: Önce generateKeyPair() çağrılmalı");
        }
        const encryptedBytes = this.base64ToArrayBuffer(encryptedKeyBase64);
        const decrypted = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            this.keyPair.privateKey,
            encryptedBytes
        );
        return new Uint8Array(decrypted);
    }

    generateRandomAesKey(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(16));
    }

    aesKeyToHex(aesKey: Uint8Array): string {
        return Array.from(aesKey)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    hexToAesKey(hex: string): Uint8Array {
        if (hex.length !== 32) {
            throw new Error("RSA: AES key hex 32 karakter olmalı (128-bit)");
        }
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    hasKeyPair(): boolean {
        return this.keyPair !== null;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const rsaKeyExchange = new RsaKeyExchange();
