import type { Cipher } from "../../../cryption/type";

export type AlgoId = "caesar" | "vigenere" | "substitution" | "affine" | "playfair" | "railfence" | "route" | "columnar" | "polybius" | "pigpen" | "hill" | "des_lib" | "des_manual" | "aes_lib" | "aes_manual";

export type MessageType = "join" | "chat" | "key-exchange" | "system";

export type KeyExchangeAction = "public-key" | "encrypted-aes-key" | "request-key";

export type OutMsg = {
  type: MessageType | string;
  room?: string;
  alg?: AlgoId;
  cipher?: string;
  action?: KeyExchangeAction;
  publicKey?: string;
  encryptedAesKey?: string;
  sender?: string;
  [k: string]: string | AlgoId | KeyExchangeAction | undefined;
};

export type ChatItem = {
  id: string;
  raw: string;
  cipher: string;
  alg?: AlgoId;
  room?: string;
  plain?: string;
  error?: string;
};

export type AlgoKeyConfig = {
  required: boolean;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue: string;
  parse: (raw: string) => unknown;
};

export type AlgoConfig = {
  id: AlgoId;
  label: string;
  cipher: Cipher;
  key: AlgoKeyConfig;
};

export type KeyExchangeState =
  | "idle"
  | "generating"
  | "waiting"
  | "exchanging"
  | "ready";

export type KeyExchangeAlgorithm = "rsa" | "ecdh";

export interface KeyExchangeInfo {
  state: KeyExchangeState;
  algorithm: KeyExchangeAlgorithm;
  myPublicKey?: string;
  partnerPublicKey?: string;
  sharedAesKeyHex?: string;
  error?: string;
}
