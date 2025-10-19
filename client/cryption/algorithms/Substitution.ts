import { Cipher } from "../type";
import { AZ, idx } from "../alph";

type KeyMap = Record<string, string>;

function normalizeMap(map: KeyMap): KeyMap {
  const out: KeyMap = {};
  for (const k of Object.keys(map)) {
    const K = k.toLocaleUpperCase("tr");
    const V = String(map[k]).toLocaleUpperCase("tr");
    if (idx(K) >= 0 && idx(V) >= 0) out[K] = V;
  }
  return out;
}

function invertMap(map: KeyMap): KeyMap {
  const inv: KeyMap = {};
  for (const k of Object.keys(map)) inv[map[k]] = k;
  return inv;
}


function parseKeyToMap(key: unknown): KeyMap {
  if (typeof key === "object" && key !== null) {
    const m = normalizeMap(key as KeyMap);
    if (AZ.split("").every((ch) => m[ch])) return m;
    throw new Error("Substitution: JSON key map eksik veya geçersiz (tüm AZ harfleri yok).");
  }

  const s = String(key ?? "").toLocaleUpperCase("tr").replace(/\s+/g, "");
  if (s.length !== AZ.length) {
    throw new Error(`Substitution: key uzunluğu ${AZ.length} olmalı (AZ ile birebir).`);
  }

  const seen = new Set<string>();
  for (const ch of s) {
    if (idx(ch) < 0) throw new Error(`Substitution: geçersiz harf: '${ch}'`);
    if (seen.has(ch)) throw new Error(`Substitution: tekrar eden harf: '${ch}'`);
    seen.add(ch);
  }

  const map: KeyMap = {};
  for (let i = 0; i < AZ.length; i++) map[AZ[i]] = s[i];
  return map;
}

export class SubstitutionCipher implements Cipher {
  readonly name = "substitution";

  encrypt(plain: string, key: unknown): string {
    const map = parseKeyToMap(key);
    let out = "";
    for (const ch of plain) {
      const i = idx(ch);
      if (i < 0) {
        out += ch; 
      } else {
        const upper = AZ[i];
        const enc = map[upper];
        const isLower = ch !== ch.toLocaleUpperCase("tr");
        out += isLower ? enc.toLocaleLowerCase("tr") : enc;
      }
    }
    return out;
  }

  decrypt(cipher: string, key: unknown): string {
    const direct = parseKeyToMap(key);
    const inv = invertMap(direct); 
    let out = "";
    for (const ch of cipher) {
      const i = idx(ch);
      if (i < 0) {
        out += ch;
      } else {
        const upper = AZ[i];
        const dec = inv[upper];
        const isLower = ch !== ch.toLocaleUpperCase("tr");
        out += isLower ? dec.toLocaleLowerCase("tr") : dec;
      }
    }
    return out;
  }
}
