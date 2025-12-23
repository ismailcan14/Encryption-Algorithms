"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AlgoId, ChatItem, OutMsg, KeyExchangeInfo, KeyExchangeAlgorithm } from "./types";
import { ALGO_CONFIGS } from "./algosRegistry";
import { KeyInput } from "./KeyInput";
import { toChatItem } from "./chatUtils";
import { MessagesPanel } from "./MessagesPanel";
import { PigpenLegend } from "./PigpenLegend";
import { KeyExchangePanel } from "./KeyExchangePanel";
import { RsaKeyExchange } from "../../../cryption/key-exchange/RsaKeyExchange";
import { EcdhKeyExchange } from "../../../cryption/key-exchange/EcdhKeyExchange";

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState("demo-1");
  const [plain, setPlain] = useState("");
  const [url, setUrl] = useState("ws://127.0.0.1:8765");
  const [algo, setAlgo] = useState<AlgoId>("aes_lib");
  const [key, setKey] = useState(ALGO_CONFIGS["aes_lib"].key.defaultValue);
  const [log, setLog] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatItem[]>([]);

  const [keyExchange, setKeyExchange] = useState<KeyExchangeInfo>({
    state: "idle",
    algorithm: "rsa",
  });
  const [clientId] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`);

  const wsRef = useRef<WebSocket | null>(null);
  const rsaRef = useRef<RsaKeyExchange>(new RsaKeyExchange());
  const ecdhRef = useRef<EcdhKeyExchange>(new EcdhKeyExchange());
  const partnerPublicKeyRef = useRef<CryptoKey | null>(null);

  const append = (line: string) => {
    setLog((prev) => [...prev, line]);
  };

  useEffect(() => {
    const cfg = ALGO_CONFIGS[algo];
    if ((algo === "aes_lib" || algo === "aes_manual") && keyExchange.sharedAesKeyHex) {
      setKey(keyExchange.sharedAesKeyHex);
    } else {
      setKey(cfg.key.defaultValue);
    }
  }, [algo, keyExchange.sharedAesKeyHex]);

  const handleAlgorithmChange = useCallback((alg: KeyExchangeAlgorithm) => {
    setKeyExchange((prev) => ({
      ...prev,
      algorithm: alg,
    }));
    append(`[info] Key exchange algoritmasi: ${alg === "rsa" ? "RSA-2048" : "ECDH P-256"}`);
  }, []);

  const handleKeyExchangeMessage = useCallback(async (msg: OutMsg) => {
    if (msg.sender === clientId) return;

    try {
      const msgAlgorithm = msg.keyExchangeAlg as KeyExchangeAlgorithm || "rsa";

      if (msg.action === "public-key" && msg.publicKey) {
        append(`[key-exchange] Karsi tarafin ${msgAlgorithm === "rsa" ? "RSA" : "ECDH"} public key'i alindi`);

        setKeyExchange((prev) => ({
          ...prev,
          algorithm: msgAlgorithm,
          partnerPublicKey: msg.publicKey,
        }));

        if (msgAlgorithm === "rsa") {
          const partnerPubKey = await rsaRef.current.importPublicKey(msg.publicKey!);
          partnerPublicKeyRef.current = partnerPubKey;

          if (rsaRef.current.hasKeyPair() && !keyExchange.sharedAesKeyHex) {
            const aesKey = rsaRef.current.generateRandomAesKey();
            const aesKeyHex = rsaRef.current.aesKeyToHex(aesKey);
            const encryptedAesKey = await rsaRef.current.encryptAesKey(aesKey, partnerPubKey);

            const keyMsg: OutMsg = {
              type: "key-exchange",
              room,
              action: "encrypted-aes-key",
              encryptedAesKey,
              keyExchangeAlg: "rsa",
              sender: clientId,
            };
            wsRef.current?.send(JSON.stringify(keyMsg));
            append(`[key-exchange] RSA ile sifrelenmis AES key gonderildi`);

            setKeyExchange((prev) => ({
              ...prev,
              state: "ready",
              sharedAesKeyHex: aesKeyHex,
            }));
            setKey(aesKeyHex);
          }
        } else {
          if (ecdhRef.current.hasKeyPair()) {
            const aesKeyBytes = await ecdhRef.current.deriveAesKeyFromBase64(msg.publicKey!);
            const aesKeyHex = ecdhRef.current.aesKeyToHex(aesKeyBytes);

            setKeyExchange((prev) => ({
              ...prev,
              state: "ready",
              sharedAesKeyHex: aesKeyHex,
            }));
            setKey(aesKeyHex);
            append(`[key-exchange] ECDH ile AES anahtari turetildi`);
          }
        }
      } else if (msg.action === "encrypted-aes-key" && msg.encryptedAesKey) {
        append(`[key-exchange] RSA ile sifrelenmis AES key alindi`);

        const aesKeyBytes = await rsaRef.current.decryptAesKey(msg.encryptedAesKey);
        const aesKeyHex = rsaRef.current.aesKeyToHex(aesKeyBytes);

        setKeyExchange((prev) => ({
          ...prev,
          state: "ready",
          sharedAesKeyHex: aesKeyHex,
        }));
        setKey(aesKeyHex);
        append(`[key-exchange] RSA ile guvenli baglanti kuruldu`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      append(`[key-exchange error] ${errMsg}`);
      setKeyExchange((prev) => ({ ...prev, error: errMsg }));
    }
  }, [clientId, room, keyExchange.sharedAesKeyHex]);

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
        try {
          const msg = JSON.parse(ev.data) as OutMsg;

          if (msg.type === "key-exchange") {
            handleKeyExchangeMessage(msg);
            return;
          }

          setMessages((prev) => [toChatItem(ev.data), ...prev]);
        } catch {
          setMessages((prev) => [toChatItem(ev.data), ...prev]);
        }
      };

      ws.onclose = () => {
        append("[close]");
        setConnected(false);
        wsRef.current = null;
        setKeyExchange({ state: "idle", algorithm: keyExchange.algorithm });
        partnerPublicKeyRef.current = null;
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
    setKeyExchange({ state: "idle", algorithm: keyExchange.algorithm });
    partnerPublicKeyRef.current = null;
  };

  const startKeyExchange = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append("[warn] WS acik degil");
      return;
    }

    const algorithm = keyExchange.algorithm;

    try {
      setKeyExchange((prev) => ({ ...prev, state: "generating" }));
      append(`[key-exchange] ${algorithm === "rsa" ? "RSA-2048" : "ECDH P-256"} key pair uretiliyor...`);

      let myPublicKey: string;

      if (algorithm === "rsa") {
        await rsaRef.current.generateKeyPair();
        myPublicKey = await rsaRef.current.exportPublicKey();
      } else {
        await ecdhRef.current.generateKeyPair();
        myPublicKey = await ecdhRef.current.exportPublicKey();
      }

      append(`[key-exchange] ${algorithm.toUpperCase()} key pair uretildi, public key paylasiliyor...`);

      const keyMsg: OutMsg = {
        type: "key-exchange",
        room,
        action: "public-key",
        publicKey: myPublicKey,
        keyExchangeAlg: algorithm,
        sender: clientId,
      };
      wsRef.current.send(JSON.stringify(keyMsg));

      setKeyExchange((prev) => ({
        ...prev,
        state: "waiting",
        myPublicKey,
      }));
      append(`[key-exchange] ${algorithm.toUpperCase()} public key gonderildi, karsi taraf bekleniyor...`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      append(`[key-exchange error] ${errMsg}`);
      setKeyExchange((prev) => ({ ...prev, state: "idle", error: errMsg }));
    }
  };

  const sendEncrypted = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append("[warn] WS acik degil");
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
            error: `Algoritma bulunamadi: ${m.alg ?? "bilinmiyor"}`,
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
      } catch { }
    };
  }, []);

  const algoCfg = ALGO_CONFIGS[algo];
  const isAesAlgo = algo === "aes_lib" || algo === "aes_manual";

  return (
    <div style={{ fontFamily: "monospace", padding: 12 }}>
      <h1>E2E Sifreli Mesajlasma (RSA/ECDH + AES)</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 1000 }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <KeyExchangePanel
              keyExchange={keyExchange}
              onStartKeyExchange={startKeyExchange}
              onAlgorithmChange={handleAlgorithmChange}
              connected={connected}
              algo={algo}
            />

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

            <KeyInput
              config={algoCfg.key}
              value={key}
              onChange={setKey}
            />

            {isAesAlgo && keyExchange.state === "ready" && (
              <div style={{
                fontSize: 11,
                color: "#4ade80",
                background: "#0a2810",
                padding: "6px 10px",
                borderRadius: 4,
              }}>
                {keyExchange.algorithm === "rsa" ? "RSA" : "ECDH"} ile paylasilan AES anahtari kullaniliyor
              </div>
            )}

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
                <button onClick={connect}>Baglan</button>
              ) : (
                <button onClick={disconnect}>Kopar</button>
              )}
              <button
                onClick={sendEncrypted}
                disabled={!connected || !plain.trim()}
              >
                Gonder (sifreli)
              </button>
            </div>

            <div>
              Durum: {connected ? "Acik" : "Kapali"}
              {connected && ` | ID: ${clientId}`}
            </div>

            <div>
              <div>Log:</div>
              <pre
                style={{
                  background: "#111",
                  color: "#ddd",
                  padding: 8,
                  minHeight: 160,
                  maxHeight: 200,
                  overflow: "auto",
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

      {algo === "pigpen" && (
        <div style={{ marginTop: 16, maxWidth: 920 }}>
          <PigpenLegend />
        </div>
      )}
    </div>
  );
}