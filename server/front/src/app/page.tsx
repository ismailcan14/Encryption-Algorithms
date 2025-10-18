"use client";

import { useEffect, useRef, useState } from "react";
import { CaesarCipher } from "../../../cryption/algorithms/Caesar";
import {VigenereCipher} from "../../../cryption/algorithms/Vigenere"

type OutMsg = {
  type: string;
  room?: string;
  alg?: string;
  cipher?: string;
  [k: string]: any;
};

type Algo = "caesar" | "vigenere";

export default function Page() {
  const [url, setUrl] = useState("ws://127.0.0.1:8765");
  const [room, setRoom] = useState("demo-1");
  const [algo, setAlgo] = useState<Algo>("caesar");
  const [key, setKey] = useState("3");
  const [plain, setPlain] = useState("");
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const caesarRef  = useRef(new CaesarCipher());
  const vigenereRef   = useRef(new VigenereCipher());

  const append = (line: string) => setLog((prev) => [...prev, line]);

  const connect = () => {
    if (connected || wsRef.current) return;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        append(`[open] ${url}`);
        const join = { type: "join", room };
        ws.send(JSON.stringify(join));
        append(`[send] ${JSON.stringify(join)}`);
      };

      ws.onmessage = (ev) => {
        append(`[recv] ${ev.data}`);
      };

      ws.onclose = () => {
        append("[close]");
        setConnected(false);
        wsRef.current = null;
      };

      ws.onerror = (e) => {
        append("[error] " + String(e));
      };
    } catch (e) {
      append("[connect error] " + String(e));
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  };

  const sendEncrypted = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append("[warn] WS açık değil");
      return;
    }
    let cipherText = "";
    if (algo === "caesar") {
      const kNum = Number(key);
      if (!Number.isFinite(kNum)) {
        append("[warn] Key geçersiz (sayı olmalı)");
        return;
      }
      cipherText = caesarRef.current.encrypt(plain, kNum);
    } else {
      // vigenere
      const kStr = String(key ?? "").trim();
      if (!kStr) {
        append("[warn] Key geçersiz (boş olamaz)");
        return;
      }
      try {
        cipherText = vigenereRef.current.encrypt(plain, kStr);
      } catch (err) {
        append("[warn] Vigenere anahtar hatası: " + String((err as Error)?.message ?? err));
        return;
      }
    }
     const out: OutMsg = {
      type: "chat",
      room,
      alg: algo,
      cipher: cipherText,
    };

    wsRef.current.send(JSON.stringify(out));
    append(`[send] ${JSON.stringify(out)}`);
    setPlain("");
  };

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

    return (
    <div style={{ fontFamily: "monospace", padding: 12 }}>
      <h1>Basit E2E: Şifrele & Gönder</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          WS URL:
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Oda:
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Algoritma:
          <select
            value={algo}
            onChange={(e) => setAlgo(e.target.value as Algo)}
            style={{ width: "100%" }}
          >
            <option value="caesar">caesar</option>
            <option value="vigenere">vigenere</option>
          </select>
        </label>

        <label>
          Key {algo === "caesar" ? "(sayı)" : "(metin)"}:
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={algo === "caesar" ? "Örn: 3" : "Örn: ANAHTAR"}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Mesaj (plain):
          <input
            value={plain}
            onChange={(e) => setPlain(e.target.value)}
            style={{ width: "100%" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendEncrypted();
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          {!connected ? (
            <button onClick={connect}>Bağlan</button>
          ) : (
            <button onClick={disconnect}>Kopar</button>
          )}
          <button onClick={sendEncrypted} disabled={!connected || !plain.trim()}>
            Gönder (şifreli)
          </button>
          
        </div>

        <div>
          <div>Durum: {connected ? "Açık" : "Kapalı"}</div>
        </div>

        <div>
          <div>Log:</div>
          <pre
            style={{
              background: "#111",
              color: "#ddd",
              padding: 8,
              minHeight: 160,
              whiteSpace: "pre-wrap",
            }}
          >
            {log.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}
