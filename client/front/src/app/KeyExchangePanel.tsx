"use client";

import React from "react";
import type { KeyExchangeInfo, KeyExchangeAlgorithm } from "./types";

interface KeyExchangePanelProps {
    keyExchange: KeyExchangeInfo;
    onStartKeyExchange: () => void;
    onAlgorithmChange: (alg: KeyExchangeAlgorithm) => void;
    connected: boolean;
    algo: string;
}

const stateLabels: Record<KeyExchangeInfo["state"], string> = {
    idle: "Hazir degil",
    generating: "Key pair uretiliyor...",
    waiting: "Karsi taraf bekleniyor...",
    exchanging: "AES anahtari paylasiliyor...",
    ready: "Guvenli baglanti kuruldu!",
};

const algorithmLabels: Record<KeyExchangeAlgorithm, { name: string; desc: string }> = {
    rsa: { name: "RSA-2048", desc: "Klasik, yaygin kullanim" },
    ecdh: { name: "ECDH P-256", desc: "Hizli, kucuk anahtar" },
};

export function KeyExchangePanel({
    keyExchange,
    onStartKeyExchange,
    onAlgorithmChange,
    connected,
    algo,
}: KeyExchangePanelProps) {
    const isAesAlgo = algo === "aes_lib" || algo === "aes_manual";
    const canStartExchange = connected && isAesAlgo && keyExchange.state === "idle";
    const isReady = keyExchange.state === "ready";
    const isInProgress = keyExchange.state !== "idle" && keyExchange.state !== "ready";

    return (
        <div
            style={{
                border: "1px solid #444",
                borderRadius: 8,
                padding: 12,
                background: isReady ? "#0a2810" : "#1a1a1a",
                marginBottom: 12,
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                Anahtar Degisimi
                {isAesAlgo && (
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>
                        (AES icin)
                    </span>
                )}
            </div>

            {!isAesAlgo && (
                <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
                    Key exchange sadece AES algoritmalari icin gecerlidir.
                    Lutfen AES (lib) veya AES (manual) secin.
                </div>
            )}

            {isAesAlgo && (
                <>
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
                            Key Exchange Algoritmasi:
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {(["rsa", "ecdh"] as KeyExchangeAlgorithm[]).map((alg) => (
                                <button
                                    key={alg}
                                    onClick={() => onAlgorithmChange(alg)}
                                    disabled={isInProgress || isReady}
                                    style={{
                                        padding: "8px 14px",
                                        background: keyExchange.algorithm === alg
                                            ? (alg === "rsa" ? "#1e40af" : "#047857")
                                            : "#2a2a2a",
                                        color: keyExchange.algorithm === alg ? "#fff" : "#aaa",
                                        border: keyExchange.algorithm === alg
                                            ? `2px solid ${alg === "rsa" ? "#3b82f6" : "#10b981"}`
                                            : "1px solid #444",
                                        borderRadius: 6,
                                        cursor: isInProgress || isReady ? "not-allowed" : "pointer",
                                        opacity: isInProgress || isReady ? 0.6 : 1,
                                        flex: 1,
                                        textAlign: "left",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                        {algorithmLabels[alg].name}
                                    </div>
                                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                        {algorithmLabels[alg].desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span
                    style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        background: isReady ? "#1a4a1a" : "#2a2a2a",
                        fontSize: 13,
                    }}
                >
                    {stateLabels[keyExchange.state]}
                    {isReady && (
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                            ({keyExchange.algorithm === "rsa" ? "RSA" : "ECDH"})
                        </span>
                    )}
                </span>

                {canStartExchange && (
                    <button
                        onClick={onStartKeyExchange}
                        style={{
                            padding: "6px 14px",
                            background: keyExchange.algorithm === "rsa" ? "#2563eb" : "#059669",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontWeight: 500,
                        }}
                    >
                        {keyExchange.algorithm === "rsa" ? "RSA" : "ECDH"} ile Baslat
                    </button>
                )}
            </div>

            {keyExchange.sharedAesKeyHex && (
                <div style={{ fontSize: 11, marginTop: 8 }}>
                    <span style={{ color: "#888" }}>Paylasilan AES Key: </span>
                    <code
                        style={{
                            background: "#0a2810",
                            padding: "2px 6px",
                            borderRadius: 3,
                            color: "#4ade80",
                            fontFamily: "monospace",
                        }}
                    >
                        {keyExchange.sharedAesKeyHex.slice(0, 8)}...{keyExchange.sharedAesKeyHex.slice(-8)}
                    </code>
                </div>
            )}

            {keyExchange.error && (
                <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>
                    {keyExchange.error}
                </div>
            )}

            {keyExchange.myPublicKey && (
                <details style={{ marginTop: 8, fontSize: 11 }}>
                    <summary style={{ cursor: "pointer", color: "#888" }}>
                        Public Key ({keyExchange.algorithm === "rsa" ? "RSA" : "ECDH"})
                    </summary>
                    <pre
                        style={{
                            background: "#111",
                            padding: 8,
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 80,
                            fontSize: 10,
                            marginTop: 4,
                        }}
                    >
                        {keyExchange.myPublicKey}
                    </pre>
                </details>
            )}
        </div>
    );
}
