import type { ChatItem } from "./types";
import { PigpenText } from "./PigpenText";
type MessagesPanelProps = {
  messages: ChatItem[];
  onDecrypt: (id: string) => void;
};

export function MessagesPanel({ messages, onDecrypt }: MessagesPanelProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>Gelen Mesajlar (üstte en yeni):</div>
      <div
        style={{
          border: "1px solid #333",
          borderRadius: 8,
          padding: 8,
          minHeight: 320,
          maxHeight: 520,
          overflowY: "auto",
          background: "#0b0b0b",
          color: "#e6e6e6",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Henüz mesaj yok…</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "grid",
                gap: 4,
                padding: 8,
                borderBottom: "1px solid #222",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 600 }}>Cipher:</div>
                <button
                  onClick={() => onDecrypt(m.id)}
                  style={{ padding: "4px 10px" }}
                >
                  Çöz
                </button>
              </div>

              <div
                style={{
                  background: "#141414",
                  padding: 8,
                  borderRadius: 6,
                  wordBreak: "break-word",
                  fontFamily: "monospace",
                }}
                title={m.raw}
              >
                {m.alg === "pigpen" ? (
                  <PigpenText text={m.cipher} />
                ) : (
                  m.cipher
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                {m.alg && <span>alg: {m.alg}</span>}
                {m.room && <span>room: {m.room}</span>}
              </div>

              {m.plain && (
                <div>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>Plain:</div>
                  <div
                    style={{
                      background: "#111a0f",
                      padding: 8,
                      borderRadius: 6,
                      wordBreak: "break-word",
                      fontFamily: "monospace",
                    }}
                  >
                    {m.plain}
                  </div>
                </div>
              )}

              {m.error && (
                <div style={{ color: "#ff6b6b", fontSize: 12 }}>
                  Hata: {m.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
