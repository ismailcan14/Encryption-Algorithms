export interface FileData {
    iv: string;
    cipher: string;
}

export class FileAesGcm {
    readonly name = "file-aes-gcm";

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

    private hexToArrayBuffer(hex: string): ArrayBuffer {
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes.buffer;
    }

    async encrypt(data: ArrayBuffer, keyHex: string): Promise<FileData> {
        const aesKey = await crypto.subtle.importKey(
            "raw",
            this.hexToArrayBuffer(keyHex),
            { name: "AES-GCM" },
            false,
            ["encrypt"]
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            data
        );

        return {
            iv: this.arrayBufferToBase64(iv.buffer),
            cipher: this.arrayBufferToBase64(encrypted),
        };
    }

    async decrypt(cipher: string, ivBase64: string, keyHex: string): Promise<ArrayBuffer> {
        const aesKey = await crypto.subtle.importKey(
            "raw",
            this.hexToArrayBuffer(keyHex),
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        const iv = new Uint8Array(this.base64ToArrayBuffer(ivBase64));
        const cipherBytes = this.base64ToArrayBuffer(cipher);

        return await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            cipherBytes
        );
    }

    pack(data: FileData): string {
        return `${data.iv}:${data.cipher}`;
    }

    unpack(packed: string): FileData {
        const [iv, cipher] = packed.split(":");
        return { iv, cipher };
    }
}

export const fileAesGcm = new FileAesGcm();
