export const parseCaesarKey = (raw: string): number => {
  const k = Number(raw);
  if (!Number.isFinite(k)) throw new Error("Caesar: key sayı olmalı");
  return k;
};

export const parseVigenereKey = (raw: string): string => {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error("Vigenere: key boş olamaz");
  return s;
};

export const parseSubstitutionKey = (raw: string): unknown => {
  const txt = String(raw ?? "").trim();
  if (!txt) throw new Error("Substitution: key boş olamaz");

  if (txt.startsWith("{")) {
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error("Substitution: JSON key parse edilemedi");
    }
  }
  return txt; 
};

export const parseAffineKey = (raw: string): unknown => {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error("Affine: key boş olamaz");

  if (s.startsWith("{")) {
    try {
      return JSON.parse(s); 
    } catch {
      throw new Error("Affine: JSON key parse edilemedi");
    }
  }
  return s; 
};

export const parsePlayfairKey = (raw: string): string => {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error("Playfair: key boş olamaz");
  return s;
};
