"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AlgoId, ChatItem, OutMsg, KeyExchangeInfo, KeyExchangeAlgorithm } from "./types";
import { ALGO_CONFIGS } from "./algosRegistry";
import { KeyInput } from "./KeyInput";
import { PigpenLegend } from "./PigpenLegend";
import { KeyExchangePanel } from "./KeyExchangePanel";
import { RsaKeyExchange } from "../../../cryption/key-exchange/RsaKeyExchange";
import { EcdhKeyExchange } from "../../../cryption/key-exchange/EcdhKeyExchange";
import { fileAesGcm } from "../../../cryption/algorithms/FileAesGcm";

import {
  Terminal, Shield, Lock, Unlock, Send, Paperclip,
  Wifi, WifiOff, FileText, Key, Server, RefreshCw, Download
} from "lucide-react";

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
  const logEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const append = (line: string) => {
    const time = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    setLog((prev) => [...prev, `[${time}] ${line}`]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          } else {
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
          }
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
      sender: msg.sender,
    };
    setMessages((prev) => [...prev, item]);
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
        sender: obj.sender,
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
        append(`[open] Baglanti basarili: ${url}`);
        const join: OutMsg = { type: "join", room };
        ws.send(JSON.stringify(join));
      };

      ws.onmessage = (ev) => {
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

          if (msg.sender === clientId) return;

          setMessages((prev) => [...prev, toChatItem(ev.data)]);
        } catch {
          setMessages((prev) => [...prev, toChatItem(ev.data)]);
        }
      };

      ws.onclose = () => {
        append("[close] Baglanti kesildi");
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
    append("[user] Manuel koparma islemi");
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
      append(`[key-exchange] Public key anons edildi.`);
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
      append(`[ui] Dosya hazir: ${file.name}`);
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
      append("[warn] WS baglantisi yok");
      return;
    }

    if (selectedFile) {
      if (keyExchange.state !== "ready") {
        append("[security] Dosya gonderimi icin guvenli el sıkısma (Key Exchange) zorunludur.");
        return;
      }

      try {
        append(`[crypto] Dosya sifreleniyor (AES-GCM)...`);
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

        const sentItem: ChatItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          raw: JSON.stringify(fileMsg),
          cipher: fileMsg.fileData || "",
          isFile: true,
          fileName: selectedFile.name,
          fileMime: selectedFile.type || "application/octet-stream",
          fileData: fileMsg.fileData,
          sender: clientId,
          plain: `GONDERILDI: ${selectedFile.name}`,
        };
        setMessages((prev) => [...prev, sentItem]);

        append(`[send] Sifreli dosya paketi iletildi.`);
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

        const sentItem: ChatItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          raw: JSON.stringify(out),
          cipher: cipherText,
          alg: algo,
          room,
          sender: clientId,
          plain: plain,
        };
        setMessages((prev) => [...prev, sentItem]);

        append(`[send] Mesaj sifrelendi ve gonderildi.`);
        setPlain("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        append("[warn] Sifreleme hatasi: " + msg);
      }
    }
  };

  const decryptOne = async (id: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;

        if (m.isFile && m.fileData) {
          return { ...m, plain: "DESIFRE EDILIYOR..." };
        }

        const algoId: AlgoId = m.alg || algo;
        const cfg = ALGO_CONFIGS[algoId];

        if (!cfg) {
          return { ...m, error: `Bilinmeyen Algoritma` };
        }

        try {
          const parsedKey = cfg.key.parse(key);
          const plain = cfg.cipher.decrypt(m.cipher, parsedKey);
          return { ...m, plain, error: undefined };
        } catch (e) {
          return { ...m, error: "Hatali Anahtar" };
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
            m.id === id ? { ...m, plain: `INDIRILDI: ${item.fileName}`, decryptedBlob: blob } : m
          )
        );
        append(`[file] Dosya basariyla desifre edildi.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, error: "Decrypt Hatasi" } : m))
        );
      }
    }
  };

  const algoCfg = ALGO_CONFIGS[algo];
  const isAesAlgo = algo === "aes_lib" || algo === "aes_manual";
  const canSend = connected && (plain.trim() || selectedFile);


  return (
    <div className="min-h-screen bg-slate-950 text-emerald-500 font-mono p-4 md:p-6 selection:bg-emerald-500/30">

      <header className="mb-6 border-b border-emerald-900/50 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-emerald-100">CIPHER<span className="text-emerald-500">OPS</span></h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">End-to-End Secure Channel</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs bg-slate-900 px-3 py-1 rounded border border-slate-800">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`} />
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {connected ? "SYSTEM ONLINE" : "DISCONNECTED"}
          </span>
          {connected && <span className="text-slate-600">| ID: {clientId}</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1800px] mx-auto">

        <div className="lg:col-span-3 space-y-4">

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-sm">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">NETWORK CONFIG</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">WEBSOCKET URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black border border-slate-700 text-slate-300 text-sm p-2 rounded focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">TARGET ROOM</label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full bg-black border border-slate-700 text-slate-300 text-sm p-2 rounded focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                onClick={connected ? disconnect : connect}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-bold transition-all ${connected
                  ? "bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-900/40"
                  : "bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 hover:bg-emerald-600/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  }`}
              >
                {connected ? <WifiOff size={16} /> : <Wifi size={16} />}
                {connected ? "TERMINATE LINK" : "ESTABLISH LINK"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-sm">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">CRYPTO MODULE</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="relative">
                <label className="text-xs text-slate-500 block mb-1">ALGORITHM</label>
                <select
                  value={algo}
                  onChange={(e) => setAlgo(e.target.value as AlgoId)}
                  className="w-full bg-black border border-slate-700 text-emerald-400 text-sm p-2 rounded appearance-none focus:border-emerald-500 outline-none"
                >
                  {Object.values(ALGO_CONFIGS).map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500">SESSION KEY</div>
                <div className="bg-black border border-slate-700 p-1 rounded">
                  <KeyInput config={algoCfg.key} value={key} onChange={setKey} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <KeyExchangePanel
                  keyExchange={keyExchange}
                  onStartKeyExchange={startKeyExchange}
                  onAlgorithmChange={handleAlgorithmChange}
                  connected={connected}
                  algo={algo}
                />
              </div>

              {isAesAlgo && keyExchange.state === "ready" && (
                <div className="flex items-center gap-2 text-xs bg-emerald-950/50 text-emerald-400 p-2 rounded border border-emerald-900/50">
                  <Lock size={12} />
                  <span>SECURE: AES KEY SYNCED via {keyExchange.algorithm.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col h-[600px] lg:h-[700px] bg-slate-900/20 border border-slate-800 rounded-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-black">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50">
                <Shield size={64} className="mb-4" strokeWidth={1} />
                <div className="text-sm tracking-widest">SECURE CHANNEL IDLE</div>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.sender === clientId;

              return (
                <div key={m.id} className={`flex flex-col gap-1 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                    <span>FROM: {m.sender || 'N/A'} {isMe ? '(ME)' : ''}</span>
                    <span>ALG: {m.alg || 'UNKNOWN'}</span>
                  </div>

                  <div className={`p-3 rounded-md border ${m.error ? 'border-red-900/50 bg-red-950/10' :
                    m.plain ? 'border-emerald-800/50 bg-emerald-950/20' :
                      'border-slate-700 bg-slate-900/80'
                    }`}>
                    {!m.plain && !m.error && (
                      <div className="font-mono text-xs text-slate-400 break-all opacity-70">
                        <div className="flex items-center gap-2 mb-1 text-slate-600 text-[10px] uppercase">
                          <Lock size={10} /> Ciphertext
                        </div>
                        {m.isFile ? `[ENCRYPTED FILE BLOB: ${m.fileName}]` : m.cipher}
                      </div>
                    )}

                    {m.plain && (
                      <div className="font-mono text-sm text-emerald-300 break-words mt-1">
                        <div className="flex items-center gap-2 mb-1 text-emerald-700 text-[10px] uppercase">
                          <Unlock size={10} /> Decrypted
                        </div>
                        {m.isFile ? (
                          <div className="flex items-center gap-2">
                            <FileText size={16} />
                            {m.plain}
                          </div>
                        ) : m.plain}
                      </div>
                    )}

                    {m.error && <div className="text-red-400 text-xs mt-1 font-bold">ERROR: {m.error}</div>}

                    {!m.plain && (
                      <button
                        onClick={() => decryptOne(m.id)}
                        className="mt-2 text-[10px] bg-slate-800 hover:bg-emerald-900 text-slate-300 hover:text-emerald-400 px-2 py-1 rounded transition-colors flex items-center gap-1 w-fit"
                      >
                        {m.isFile ? <Download size={12} /> : <RefreshCw size={12} />}
                        {m.isFile ? "DECRYPT & DOWNLOAD" : "DECRYPT MESSAGE"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 z-10">
            <div className="flex flex-col gap-3">

              {selectedFile && (
                <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-900/50 px-3 py-2 rounded text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <FileText size={14} />
                    <span>{selectedFile.name}</span>
                    <span className="opacity-50">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button onClick={clearFile} className="hover:text-red-400 transition-colors">X</button>
                </div>
              )}

              <div className="flex gap-3">
                <label className={`
                            flex items-center justify-center w-12 rounded cursor-pointer border transition-all
                            ${selectedFile ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}
                        `}>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                  <Paperclip size={20} />
                </label>

                <div className="flex-1 relative">
                  <input
                    value={plain}
                    onChange={(e) => setPlain(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                    placeholder={selectedFile ? "Ready to transmit file..." : "Enter payload..."}
                    disabled={!!selectedFile}
                    className="w-full h-12 bg-black border border-slate-700 rounded px-4 text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-all"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!canSend}
                  className={`
                                px-6 rounded font-bold tracking-wider flex items-center gap-2 transition-all
                                ${canSend
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                            `}
                >
                  <span>SEND</span>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col h-[600px] lg:h-[700px]">
          <div className="bg-black border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
            <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">SYS.LOG</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-700" />
                <div className="w-2 h-2 rounded-full bg-slate-700" />
              </div>
            </div>
            <div className="p-2 font-mono text-[10px] sm:text-xs overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {log.length === 0 && <span className="text-slate-600 italic">System ready... waiting for input.</span>}
              {[...log].reverse().map((line, i) => (
                <div key={i} className="mb-1 break-all">
                  <span className="text-slate-600 mr-2">{line.split(']')[0]}]</span>
                  <span className={
                    line.includes('error') ? 'text-red-400' :
                      line.includes('warn') ? 'text-amber-400' :
                        line.includes('send') ? 'text-blue-400' :
                          line.includes('recv') ? 'text-purple-400' :
                            line.includes('key-exchange') ? 'text-cyan-300' :
                              'text-slate-300'
                  }>{line.split(']').slice(1).join(']')}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {algo === "pigpen" && (
        <div className="mt-8 p-4 bg-white/5 rounded max-w-2xl mx-auto border border-white/10">
          <PigpenLegend />
        </div>
      )}

    </div>
  );
}