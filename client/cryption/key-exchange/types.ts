export type KeyExchangeState =
    | "idle"
    | "generating"
    | "waiting"
    | "exchanging"
    | "ready";

export interface KeyExchangeInfo {
    state: KeyExchangeState;
    myPublicKey?: string;
    partnerPublicKey?: string;
    sharedAesKeyHex?: string;
    error?: string;
}

export interface KeyExchangeMessage {
    type: "key-exchange";
    room: string;
    action: "public-key" | "encrypted-aes-key";
    publicKey?: string;
    encryptedAesKey?: string;
    sender: string;
}
