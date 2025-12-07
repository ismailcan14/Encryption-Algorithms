"use client";

import React, { useEffect, useRef, useState } from "react";
import type { AlgoId, ChatItem, OutMsg } from "./types";
import { ALGO_CONFIGS } from "./algosRegistry";
import { KeyInput } from "./KeyInput";
import { toChatItem } from "./chatUtils";
import { MessagesPanel } from "./MessagesPanel";

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState("demo-1");
  const [plain, setPlain] = useState("");
  const [url, setUrl] = useState("ws://127.0.0.1:8765");
  const [algo, setAlgo] = useState<AlgoId>("caesar");
  const [key, setKey] = useState(ALGO_CONFIGS["caesar"].key.defaultValue);
  const [log, setLog] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  const append = (line: string) => {
    setLog((prev) => [...prev, line]);
  };

  useEffect(() => {
    const cfg = ALGO_CONFIGS[algo];
    setKey(cfg.key.defaultValue);
  }, [algo]);

  const connect = () => {
    if (connected || wsRef.current) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        append(`[open] ${url}`);
        const join: OutMsg = { type: "join", room };
        ws.send(JSON.stringify(join));
        append(`[send] ${JSON.stringify(join)}`);
      };

      ws.onmessage = (ev) => {
        append(`[recv] ${ev.data}`);
        setMessages((prev) => [toChatItem(ev.data), ...prev]);
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

    const cfg = ALGO_CONFIGS[algo];

    try {
      const parsedKey = cfg.key.parse(key);
      const cipherText = cfg.cipher.encrypt(plain, parsedKey);

      const out: OutMsg = {
        type: "chat",
        room,
        alg: algo,
        cipher: cipherText,
      };

      wsRef.current.send(JSON.stringify(out));
      append(`[send] ${JSON.stringify(out)}`);
      setPlain("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      append("[warn] " + msg);
    }
  };

  const decryptOne = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;

        const algoId: AlgoId = m.alg || algo;
        const cfg = ALGO_CONFIGS[algoId];

        if (!cfg) {
          return {
            ...m,
            error: `Algoritma bulunamadı: ${m.alg ?? "bilinmiyor"}`,
          };
        }

        try {
          const parsedKey = cfg.key.parse(key);
          const plain = cfg.cipher.decrypt(m.cipher, parsedKey);
          return { ...m, plain, error: undefined };
        } catch (e) {
          const emsg = e instanceof Error ? e.message : String(e);
          return { ...m, error: emsg };
        }
      })
    );
  };

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const algoCfg = ALGO_CONFIGS[algo];

  return (
    <div style={{ fontFamily: "monospace", padding: 12 }}>
      <h1>Basit E2E: Şifrele &amp; Gönder</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 920 }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
          }}
        >
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
                onChange={(e) => setAlgo(e.target.value as AlgoId)}
                style={{ width: "100%" }}
              >
                {Object.values(ALGO_CONFIGS).map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </label>

            <KeyInput config={algoCfg.key} value={key} onChange={setKey} />

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
              <button
                onClick={sendEncrypted}
                disabled={!connected || !plain.trim()}
              >
                Gönder (şifreli)
              </button>
            </div>

            <div>Durum: {connected ? "Açık" : "Kapalı"}</div>

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
          <MessagesPanel messages={messages} onDecrypt={decryptOne} />
        </div>
      </div>
    </div>
  );
}
