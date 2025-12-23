export interface EcdhKeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export class EcdhKeyExchange {
    private keyPair: EcdhKeyPair | null = null;

    async generateKeyPair(): Promise<EcdhKeyPair> {
        this.keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            true,
            ["deriveBits", "deriveKey"]
        );
        return this.keyPair;
    }

    async exportPublicKey(): Promise<string> {
        if (!this.keyPair) {
            throw new Error("ECDH: Önce generateKeyPair() çağrılmalı");
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
                name: "ECDH",
                namedCurve: "P-256",
            },
            true,
            []
        );
    }

    async deriveAesKey(partnerPublicKey: CryptoKey): Promise<Uint8Array> {
        if (!this.keyPair) {
            throw new Error("ECDH: Önce generateKeyPair() çağrılmalı");
        }

        const sharedBits = await crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: partnerPublicKey,
            },
            this.keyPair.privateKey,
            256
        );

        return new Uint8Array(sharedBits).slice(0, 16);
    }

    async deriveAesKeyFromBase64(partnerPublicKeyBase64: string): Promise<Uint8Array> {
        const partnerKey = await this.importPublicKey(partnerPublicKeyBase64);
        return this.deriveAesKey(partnerKey);
    }

    aesKeyToHex(aesKey: Uint8Array): string {
        return Array.from(aesKey)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    hexToAesKey(hex: string): Uint8Array {
        if (hex.length !== 32) {
            throw new Error("ECDH: AES key hex 32 karakter olmalı (128-bit)");
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

export const ecdhKeyExchange = new EcdhKeyExchange();
