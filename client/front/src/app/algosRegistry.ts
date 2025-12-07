import { CaesarCipher } from "../../../cryption/algorithms/Caesar";
import { VigenereCipher } from "../../../cryption/algorithms/Vigenere";
import { SubstitutionCipher } from "../../../cryption/algorithms/Substitution";
import { AffineCipher } from "../../../cryption/algorithms/Affine";
import { PlayfairCipher } from "../../../cryption/algorithms/Playfair";

import type { AlgoConfig, AlgoId } from "./types";
import {
  parseAffineKey,
  parseCaesarKey,
  parsePlayfairKey,
  parseSubstitutionKey,
  parseVigenereKey,
} from "./keyParsers";

const CAESAR = new CaesarCipher();
const VIGENERE = new VigenereCipher();
const SUBSTITUTION = new SubstitutionCipher();
const AFFINE = new AffineCipher();
const PLAYFAIR = new PlayfairCipher();

export const ALGO_CONFIGS: Record<AlgoId, AlgoConfig> = {
  caesar: {
    id: "caesar",
    label: "Caesar",
    cipher: CAESAR,
    key: {
      required: true,
      label: "Key (sayı)",
      placeholder: "Örn: 3",
      helpText: "Pozitif/negatif tam sayı kullanılabilir.",
      defaultValue: "3",
      parse: parseCaesarKey,
    },
  },
  vigenere: {
    id: "vigenere",
    label: "Vigenere",
    cipher: VIGENERE,
    key: {
      required: true,
      label: "Key (metin)",
      placeholder: "Örn: ANAHTAR",
      helpText: "Sadece metin, boş olamaz.",
      defaultValue: "ANAHTAR",
      parse: parseVigenereKey,
    },
  },
  substitution: {
    id: "substitution",
    label: "Substitution",
    cipher: SUBSTITUTION,
    key: {
      required: true,
      label: "Key (permütasyon veya JSON)",
      placeholder:
        'Örn (perm): QWERTYÜİOPĞAS...  |  Örn (JSON): {"A":"Q","B":"W",...}',
      helpText:
        "32 harflik AZ permütasyonu veya tüm harfleri içeren JSON map gir.",
      defaultValue: "",
      parse: parseSubstitutionKey,
    },
  },
  affine: {
    id: "affine",
    label: "Affine",
    cipher: AFFINE,
    key: {
      required: true,
      label: "Key (a,b)",
      placeholder: 'Örn: 5 8  |  5,8  |  {"a":5,"b":8}',
      helpText: "a ve 32 aralarında asal olmalı (a tek olmalı).",
      defaultValue: "5 8",
      parse: parseAffineKey,
    },
  },
  playfair: {
    id: "playfair",
    label: "Playfair",
    cipher: PLAYFAIR,
    key: {
      required: true,
      label: "Key (metin)",
      placeholder: "Örn: GIZLIANAHTAR",
      helpText: "Boş olamaz, metin olarak kullanılır.",
      defaultValue: "GIZLIANAHTAR",
      parse: parsePlayfairKey,
    },
  },
};
