import type { AlgoId, ChatItem } from "./types";

export const toChatItem = (raw: string): ChatItem => {
  try {
    const obj = JSON.parse(raw);
    const cipher = typeof obj.cipher === "string" ? obj.cipher : raw;
    return {
      id: crypto.randomUUID(),
      raw,
      cipher,
      alg: obj.alg as AlgoId | undefined,
      room: obj.room,
    };
  } catch {
    return { id: crypto.randomUUID(), raw, cipher: raw };
  }
};
