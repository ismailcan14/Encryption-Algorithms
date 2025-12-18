import type { Cipher } from "../../../cryption/type";

export type AlgoId = "caesar" | "vigenere" | "substitution" | "affine" | "playfair" | "railfence" | "route"  | "columnar" | "polybius"| "pigpen" | "hill" | "des_lib" | "des_manual" | "aes_lib";

export type OutMsg = {
  type: string;
  room?: string;
  alg?: AlgoId;
  cipher?: string;
  [k: string]: any;
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
