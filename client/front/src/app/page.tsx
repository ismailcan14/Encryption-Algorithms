"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AlgoId, ChatItem, OutMsg, KeyExchangeInfo, KeyExchangeAlgorithm } from "./types";
import { ALGO_CONFIGS } from "./algosRegistry";
import { KeyInput } from "./KeyInput";
import { MessagesPanel } from "./MessagesPanel";
import { PigpenLegend } from "./PigpenLegend";
import { KeyExchangePanel } from "./KeyExchangePanel";
import { RsaKeyExchange } from "../../../cryption/key-exchange/RsaKeyExchange";
import { EcdhKeyExchange } from "../../../cryption/key-exchange/EcdhKeyExchange";
import { fileAesGcm } from "../../../cryption/algorithms/FileAesGcm";

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState("demo-1");
  const [plain, setPlain] = useState("");
  const [url, setUrl] = useState("ws://127.0.0.1:8765");
  const [algo, setAlgo] = useState<AlgoId>("aes_lib");
  const [key, setKey] = useState(ALGO_CONFIGS["aes_lib"].key.defaultValue);
  const [log, setLog] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [keyExchange, setKeyExchange] = useState<KeyExchangeInfo>({
    state: "idle",
    algorithm: "rsa",
  });
  const [clientId] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`);

  const wsRef = useRef<WebSocket | null>(null);
  const rsaRef = useRef<RsaKeyExchange>(new RsaKeyExchange());
  const ecdhRef = useRef<EcdhKeyExchange>(new EcdhKeyExchange());
  const partnerPublicKeyRef = useRef<CryptoKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setKeyExchange((prev) => ({ ...prev, algorithm: alg }));
    append(`[info] Key exchange algoritmasi: ${alg === "rsa" ? "RSA-2048" : "ECDH P-256"}`);
  }, []);

  const handleKeyExchangeMessage = useCallback(async (msg: OutMsg) => {
    if (msg.sender === clientId) return;

    try {
      const msgAlgorithm = msg.keyExchangeAlg as KeyExchangeAlgorithm || "rsa";

      if (msg.action === "public-key" && msg.publicKey) {
        append(`[key-exchange] Karsi tarafin ${msgAlgorithm === "rsa" ? "RSA" : "ECDH"} public keyi alindi`);

        setKeyExchange((prev) => ({
          ...prev,
          algorithm: msgAlgorithm,
          partnerPublicKey: msg.publicKey,
        }));

        if (msgAlgorithm === "rsa") {
          const partnerPubKey = await rsaRef.current.importPublicKey(msg.publicKey!);
          partnerPublicKeyRef.current = partnerPubKey;

          if (!rsaRef.current.hasKeyPair()) {
            append(`[key-exchange] RSA key pair olusturuluyor...`);
            await rsaRef.current.generateKeyPair();
            const myPublicKey = await rsaRef.current.exportPublicKey();

            const keyMsg: OutMsg = {
              type: "key-exchange",
              room,
              action: "public-key",
              publicKey: myPublicKey,
              keyExchangeAlg: "rsa",
              sender: clientId,
            };
            wsRef.current?.send(JSON.stringify(keyMsg));
            append(`[key-exchange] RSA public key gonderildi`);
          }

          const aesKey = rsaRef.current.generateRandomAesKey();
          const aesKeyHex = rsaRef.current.aesKeyToHex(aesKey);
          const encryptedAesKey = await rsaRef.current.encryptAesKey(aesKey, partnerPubKey);

          const aesMsg: OutMsg = {
            type: "key-exchange",
            room,
            action: "encrypted-aes-key",
            encryptedAesKey,
            keyExchangeAlg: "rsa",
            sender: clientId,
          };
          wsRef.current?.send(JSON.stringify(aesMsg));
          append(`[key-exchange] AES key sifrelendi ve gonderildi`);

          setKeyExchange((prev) => ({
            ...prev,
            state: "ready",
            sharedAesKeyHex: aesKeyHex,
          }));
          setKey(aesKeyHex);
          append(`[key-exchange] Guvenli baglanti kuruldu!`);
        } else {
          if (!ecdhRef.current.hasKeyPair()) {
            append(`[key-exchange] ECDH key pair olusturuluyor...`);
            await ecdhRef.current.generateKeyPair();
            const myPublicKey = await ecdhRef.current.exportPublicKey();

            const keyMsg: OutMsg = {
              type: "key-exchange",
              room,
              action: "public-key",
              publicKey: myPublicKey,
              keyExchangeAlg: "ecdh",
              sender: clientId,
            };
            wsRef.current?.send(JSON.stringify(keyMsg));
            append(`[key-exchange] ECDH public key gonderildi`);
          }

          const aesKeyBytes = await ecdhRef.current.deriveAesKeyFromBase64(msg.publicKey!);
          const aesKeyHex = ecdhRef.current.aesKeyToHex(aesKeyBytes);

          setKeyExchange((prev) => ({
            ...prev,
            state: "ready",
            sharedAesKeyHex: aesKeyHex,
          }));
          setKey(aesKeyHex);
          append(`[key-exchange] ECDH ile guvenli baglanti kuruldu!`);
        }
      } else if (msg.action === "encrypted-aes-key" && msg.encryptedAesKey) {
        if (keyExchange.state === "ready") return;

        append(`[key-exchange] Sifrelenmis AES key alindi`);

        const aesKeyBytes = await rsaRef.current.decryptAesKey(msg.encryptedAesKey);
        const aesKeyHex = rsaRef.current.aesKeyToHex(aesKeyBytes);

        setKeyExchange((prev) => ({
          ...prev,
          state: "ready",
          sharedAesKeyHex: aesKeyHex,
        }));
        setKey(aesKeyHex);
        append(`[key-exchange] Guvenli baglanti kuruldu!`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      append(`[key-exchange error] ${errMsg}`);
      setKeyExchange((prev) => ({ ...prev, error: errMsg }));
    }
  }, [clientId, room, keyExchange.sharedAesKeyHex, keyExchange.state]);

  const handleFileMessage = useCallback((msg: OutMsg, raw: string) => {
    if (msg.sender === clientId) return;

    const item: ChatItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      raw,
      cipher: msg.fileData || "",
      isFile: true,
      fileName: msg.fileName,
      fileMime: msg.fileMime,
      fileData: msg.fileData,
    };
    setMessages((prev) => [item, ...prev]);
    append(`[file] Sifreli dosya alindi: ${msg.fileName}`);
  }, [clientId]);

  const toChatItem = (raw: string): ChatItem => {
    try {
      const obj = JSON.parse(raw);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        raw,
        cipher: obj.cipher ?? "",
        alg: obj.alg,
        room: obj.room,
      };
    } catch {
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        raw,
        cipher: raw,
      };
    }
  };

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
        append(`[recv] ${ev.data.slice(0, 100)}...`);
        try {
          const msg = JSON.parse(ev.data) as OutMsg;

          if (msg.type === "key-exchange") {
            handleKeyExchangeMessage(msg);
            return;
          }

          if (msg.type === "file") {
            handleFileMessage(msg, ev.data);
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

      append(`[key-exchange] ${algorithm.toUpperCase()} key pair uretildi`);

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
      append(`[key-exchange] Public key gonderildi, bekleniyor...`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      append(`[key-exchange error] ${errMsg}`);
      setKeyExchange((prev) => ({ ...prev, state: "idle", error: errMsg }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      append(`[file] Dosya secildi: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append("[warn] WS acik degil");
      return;
    }

    if (selectedFile) {
      if (keyExchange.state !== "ready") {
        append("[warn] Dosya gondermek icin key exchange gerekli");
        return;
      }

      try {
        append(`[file] Dosya sifreleniyor: ${selectedFile.name}`);
        const fileBuffer = await selectedFile.arrayBuffer();
        const encrypted = await fileAesGcm.encrypt(fileBuffer, keyExchange.sharedAesKeyHex || key);

        const fileMsg: OutMsg = {
          type: "file",
          room,
          fileData: fileAesGcm.pack(encrypted),
          fileName: selectedFile.name,
          fileMime: selectedFile.type || "application/octet-stream",
          sender: clientId,
        };

        wsRef.current.send(JSON.stringify(fileMsg));
        append(`[file] Sifreli dosya gonderildi: ${selectedFile.name}`);
        clearFile();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        append(`[file error] ${msg}`);
      }
    } else if (plain.trim()) {
      const cfg = ALGO_CONFIGS[algo];

      try {
        const parsedKey = cfg.key.parse(key);
        const cipherText = cfg.cipher.encrypt(plain, parsedKey);

        const out: OutMsg = {
          type: "chat",
          room,
          alg: algo,
          cipher: cipherText,
          sender: clientId,
        };

        wsRef.current.send(JSON.stringify(out));
        append(`[send] Sifreli mesaj gonderildi`);
        setPlain("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        append("[warn] " + msg);
      }
    }
  };

  const decryptOne = async (id: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;

        if (m.isFile && m.fileData) {
          return { ...m, plain: "Dosya cozuluyor..." };
        }

        const algoId: AlgoId = m.alg || algo;
        const cfg = ALGO_CONFIGS[algoId];

        if (!cfg) {
          return { ...m, error: `Algoritma bulunamadi: ${m.alg ?? "bilinmiyor"}` };
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

    const item = messages.find((m) => m.id === id);
    if (item?.isFile && item.fileData) {
      try {
        const { iv, cipher } = fileAesGcm.unpack(item.fileData);
        const decrypted = await fileAesGcm.decrypt(cipher, iv, keyExchange.sharedAesKeyHex || key);
        const blob = new Blob([decrypted], { type: item.fileMime || "application/octet-stream" });

        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = item.fileName || "dosya";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, plain: `Dosya indirildi: ${item.fileName}`, decryptedBlob: blob } : m
          )
        );
        append(`[file] Dosya cozuldu: ${item.fileName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, error: msg } : m))
        );
        append(`[file error] ${msg}`);
      }
    }
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
  const canSend = connected && (plain.trim() || selectedFile);

  return (
    <div style={{ fontFamily: "monospace", padding: 12 }}>
      <h1>E2E Sifreli Mesajlasma</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 1100 }}>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
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
              <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: "100%" }} />
            </label>

            <label>
              Oda:
              <input value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: "100%" }} />
            </label>

            <label>
              Algoritma:
              <select value={algo} onChange={(e) => setAlgo(e.target.value as AlgoId)} style={{ width: "100%" }}>
                {Object.values(ALGO_CONFIGS).map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>{cfg.label}</option>
                ))}
              </select>
            </label>

            <KeyInput config={algoCfg.key} value={key} onChange={setKey} />

            {isAesAlgo && keyExchange.state === "ready" && (
              <div style={{ fontSize: 11, color: "#4ade80", background: "#0a2810", padding: "6px 10px", borderRadius: 4 }}>
                {keyExchange.algorithm === "rsa" ? "RSA" : "ECDH"} ile paylasilan AES anahtari kullaniliyor
              </div>
            )}

            <label>
              Mesaj:
              <input
                value={plain}
                onChange={(e) => setPlain(e.target.value)}
                style={{ width: "100%" }}
                placeholder={selectedFile ? "(Dosya secili)" : "Mesaj yazin..."}
                disabled={!!selectedFile}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              />
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{
                padding: "6px 12px",
                background: "#333",
                borderRadius: 4,
                cursor: "pointer",
                border: selectedFile ? "2px solid #059669" : "1px solid #555",
              }}>
                {selectedFile ? selectedFile.name : "Dosya Sec"}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: "none" }} />
              </label>
              {selectedFile && (
                <button
                  onClick={clearFile}
                  style={{ padding: "6px 10px", background: "#7f1d1d", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}
                >
                  X
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!connected ? (
                <button onClick={connect}>Baglan</button>
              ) : (
                <button onClick={disconnect}>Kopar</button>
              )}
              <button
                onClick={sendMessage}
                disabled={!canSend}
                style={{
                  padding: "8px 16px",
                  background: canSend ? (selectedFile ? "#059669" : "#2563eb") : "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {selectedFile ? "Dosya Gonder" : "Gonder"}
              </button>
            </div>

            <div>
              Durum: {connected ? "Acik" : "Kapali"}
              {connected && ` | ID: ${clientId}`}
            </div>

            <div>
              <div>Log:</div>
              <pre style={{ background: "#111", color: "#ddd", padding: 8, minHeight: 100, maxHeight: 140, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 11 }}>
                {log.slice(-15).join("\n")}
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