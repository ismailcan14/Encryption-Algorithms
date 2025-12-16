import { CaesarCipher } from "../../../cryption/algorithms/Caesar";
import { VigenereCipher } from "../../../cryption/algorithms/Vigenere";
import { SubstitutionCipher } from "../../../cryption/algorithms/Substitution";
import { AffineCipher } from "../../../cryption/algorithms/Affine";
import { PlayfairCipher } from "../../../cryption/algorithms/Playfair";
import { RailFenceCipher } from "../../../cryption/algorithms/RailFence";
import { RouteCipher } from "../../../cryption/algorithms/RouteCipher";
import { ColumnarTranspositionCipher } from "../../../cryption/algorithms/ColumnarTransposition";
import { PolybiusCipher } from "../../../cryption/algorithms/Polybius";
import { PigpenCipher } from "../../../cryption/algorithms/Pigpen";
import { HillCipher } from "../../../cryption/algorithms/Hill";
import { DesLibCipher } from "../../../cryption/algorithms/DesLib";

import type { AlgoConfig, AlgoId } from "./types";
import {
  parseAffineKey,
  parseCaesarKey,
  parsePlayfairKey,
  parseSubstitutionKey,
  parseVigenereKey,
  parseRailFenceKey,
  parseRouteKey,
  parseColumnarKey,
  parsePolybiusKey,
  parsePigpenKey,
  parseHillKey,
  parseDesLibKey,
} from "./keyParsers";

const CAESAR = new CaesarCipher();
const VIGENERE = new VigenereCipher();
const SUBSTITUTION = new SubstitutionCipher();
const AFFINE = new AffineCipher();
const PLAYFAIR = new PlayfairCipher();
const RAILFENCE = new RailFenceCipher();
const ROUTE = new RouteCipher();
const COLUMNAR = new ColumnarTranspositionCipher();
const POLYBIUS = new PolybiusCipher();
const PIGPEN = new PigpenCipher();
const HILL = new HillCipher();
const DES_LIB = new DesLibCipher();


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
  railfence: {
    id: "railfence",
    label: "Rail Fence",
    cipher: RAILFENCE,
    key: {
      required: true,
      label: "Key (ray sayısı)",
      placeholder: "Örn: 3",
      helpText: "En az 2, tamsayı ray sayısı.",
      defaultValue: "3",
      parse: parseRailFenceKey,
    },
  },
  route: {
    id: "route",
    label: "Route Cipher",
    cipher: ROUTE,
    key: {
      required: true,
      label: "Key (sütun sayısı)",
      placeholder: "Örn: 4",
      helpText: "En az 2, tamsayı sütun sayısı.",
      defaultValue: "4",
      parse: parseRouteKey,
    },
  },
  columnar: {
    id: "columnar",
    label: "Columnar Transposition",
    cipher: COLUMNAR,
    key: {
      required: true,
      label: "Key (kelime)",
      placeholder: "Örn: ANAHTAR",
      helpText: "En az 2 karakterli bir kelime. Harf sırasına göre sütunlar karılır.",
      defaultValue: "ANAHTAR",
      parse: parseColumnarKey,
    },
  },
   polybius: {
    id: "polybius",
    label: "Polybius",
    cipher: POLYBIUS,
    key: {
      required: true, 
      label: "Key (opsiyonel kelime)",
      placeholder: "Örn: GIZLI (boş da bırakılabilir)",
      helpText:
        "İsteğe bağlı anahtar. Boş ise AZ sırasına göre 4x8 tablo kullanılır.",
      defaultValue: "",
      parse: parsePolybiusKey,
    },
  },
    pigpen: {
    id: "pigpen",
    label: "PigPen",
    cipher: PIGPEN,
    key: {
      required: false,
      label: "Key (kullanılmıyor)",
      placeholder: "",
      helpText: "PigPen klasik, keysiz görsel substitution olarak kullanılıyor.",
      defaultValue: "",
      parse: parsePigpenKey,
    },
  },
  hill: {
  id: "hill",
  label: "Hill (2x2)",
  cipher: HILL,
  key: {
    required: true,
    label: "Key (2x2 matris)",
    placeholder: 'Örn: 3 3 2 5  |  [3,3,2,5]  |  [[3,3],[2,5]]',
    helpText:
      "Determinantın 32 ile aralarında asal olması gerekir (örnek: [[3,3],[2,5]]).",
    defaultValue: "3 3 2 5",
    parse: parseHillKey,
  },
},
  des_lib: {
    id: "des_lib",
    label: "DES (lib)",
    cipher: DES_LIB,
    key: {
      required: true,
      label: "Key (8 char veya 16 hex)",
      placeholder: "Örn: 12345678  |  133457799BBCDFF1",
      helpText:
        "8 karakterlik metin veya 16 karakterlik hex key kullanabilirsin.",
      defaultValue: "12345678",
      parse: parseDesLibKey,
    },
  },
};
