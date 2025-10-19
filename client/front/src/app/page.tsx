"use client";

import { useEffect, useRef, useState } from "react";
import { CaesarCipher } from "../../../cryption/algorithms/Caesar";
import { VigenereCipher } from "../../../cryption/algorithms/Vigenere"; //Vigenere sınıfını da projeye dahil ediyoruz (çoklu algoritma desteği için)
import { SubstitutionCipher } from "../../../cryption/algorithms/Substitution"; //***

// Substitution eklemeyle birlikte sade registry kullanacağız //***

type OutMsg = { //mesaj yollarken ki tipimiz
  type: string;  //type alanı zorunlu
  room?: string; //oda
  alg?: string;//algoritma
  cipher?: string; //ve şifreli mesaj kısmı bos olabilir
  [k: string]: any; //vereceğimiz key alanı
};

type Algo = "caesar" | "vigenere" | "substitution"; //kullanacağımız algoritma isimleri (select kutusunda seçim yapacağız) //***

// --- Chat item tipi: gelen ham veri + çıkarılmış cipher + çözülen plain --- //***
type ChatItem = { id: string; raw: string; cipher: string; alg?: string; room?: string; plain?: string; error?: string }; //***

export default function Page()
{
const [connected,setConnected]=useState(false);
const [room,setRoom]=useState("demo-1");//katılacagın oda id si
const [plain,setPlain]=useState("");//düz metin
const [url,setUrl]=useState("ws://127.0.0.1:8765"); //sunucu adresi
const [key,setKey]=useState("3"); //algoritmada kullanacagımız key
const [log,setLog]=useState<string[]>([]); //ekranda gösterilecek metinlerin dizisi
const [algo,setAlgo]=useState<Algo>("caesar"); //seçili algoritmayı saklıyoruz (varsayılan caesar)

  const wsRef=useRef<WebSocket|null>(null);
  //burada React ın useRef hookunu kullandık çünkü WebSocket ten 1 adet nesne olusturuyoruz ve sayfa yenıden render edilse bile
  //nesnemiz korunuyor. wsRef.current ile de değerni oluşturabiliyoruz.
  //kısaca diyoruz ki wsRef in WebSocket türünde bir referansı var ancak şuan boş. wsRef.curren ileri WS nesnesi tutacak.
const caesarRef=useRef(new CaesarCipher()); //CaesarCipher sınıfından bir nesne oluşturduk (şifreleme/çözme için)
const vigenereRef=useRef(new VigenereCipher()); //VigenereCipher sınıfından da bir nesne oluşturduk (çoklu algoritma için)
  //aynı şekilde de burada da CaesarCipher sınıfından bir nesne oluşturduk. bu nesne ile şifreleme ve şifre çözmeyi kullanacağız.
  //useRef() kullandıgımız için nesne proje sonlanana kadar bizimle kalacak.
const substRef=useRef(new SubstitutionCipher()); //***

// ---- Key Parsers (algoritma başına anahtar doğrulama/parsing) ---- //***
const parseCaesarKey = (raw: unknown) => { //***
  const k = Number(raw); //***
  if (!Number.isFinite(k)) throw new Error("Key geçersiz (sayı olmalı)"); //***
  return k; //***
}; //***

const parseVigenereKey = (raw: unknown) => { //***
  const s = String(raw ?? "").trim(); //***
  if (!s) throw new Error("Key geçersiz (boş olamaz)"); //***
  return s; //***
}; //***

const parseSubstitutionKey = (raw: unknown) => { 
  const txt = String(raw ?? "").trim(); //***
  if (!txt) throw new Error("Key geçersiz (boş olamaz)"); 
  if (txt.startsWith("{")) {
    try { 
      return JSON.parse(txt); // SubstitutionCipher, object map'ı zaten doğrular. //***
    } catch { 
      throw new Error("JSON key parse edilemedi"); //***
    } 
  } 
  return txt; // 32-harf permütasyon string //***
}; 

// ---- Algoritma Registry (tek akış için) ---- //***
const registry: Record<
  Algo,
  {
    ref: React.MutableRefObject<{ encrypt: (p: string, k: any) => string; decrypt: (c: string, k: any) => string }>; //***
    parseKey: (raw: unknown) => unknown;
  }
> = { 
  caesar: { ref: caesarRef, parseKey: parseCaesarKey },
  vigenere: { ref: vigenereRef, parseKey: parseVigenereKey }, 
  substitution: { ref: substRef, parseKey: parseSubstitutionKey }, 
}; 

// --- Chat listesi (gelen mesajlar) --- //***
const [messages, setMessages] = useState<ChatItem[]>([]); //***

// --- Gelen ws mesajını ChatItem'a dönüştür --- //***
const toChatItem = (raw: string): ChatItem => { //***
  try { //***
    const obj = JSON.parse(raw); //***
    const cipher = typeof obj.cipher === "string" ? obj.cipher : raw; //***
    return { id: crypto.randomUUID(), raw, cipher, alg: obj.alg, room: obj.room }; //***
  } catch { //***
    // JSON değilse raw = cipher kabul //***
    return { id: crypto.randomUUID(), raw, cipher: raw }; //***
  } //***
}; //***

  const connect = () => { //bağlan butonuna basınca çalışacak fonksiyon
    if (connected || wsRef.current) return; //bağlıysan veya ws nesnesi varsa atla!
    try {
      const ws = new WebSocket(url); //yeni bir ws nesnesi oluşturup
      wsRef.current = ws; //wsRef referansına bu nesneyi atıyoruz.
      //yukarıda belirttiğimiz gibi wsRef boş bir WebSocket nesnesi tutan bir konteynır gibiydi.

      ws.onopen = () => { //mesaj atabilecek duruma gelince 
        setConnected(true); //bağlantıyı true yap
        append(`[open] ${url}`); //log a url açık şeklinde metin ekledik  
        const join = { type: "join", room: room };  //join adlı js objesini olusturuyoruz
        ws.send(JSON.stringify(join)); //js objesini string hale getirip ws bağlantısına yollar
        append(`[send] ${JSON.stringify(join)}`); //log a bir satır ekliyoruz.
      };

      ws.onmessage = (ev) => { //sunucudan mesaj geldiğinde
        append(`[recv] ${ev.data}`); //mesajı log a at
        setMessages((prev) => [toChatItem(ev.data), ...prev]); // en üste ekle //***
      };

      ws.onclose = () => { //bağlantı kapatıldıgında
        append("[close]"); //log a close mesajı ekleme
        setConnected(false); //connected false
        wsRef.current = null; //wsRef i null a getiriyoruz.
      };

      ws.onerror = (e) => { //hata durumları
        append("[error] " + String(e));
      };
    } catch (e) {
      append("[connect error] " + String(e));
    }
  };

  const disconnect = () => { //bağlantı kapatma
    wsRef.current?.close(); //bağlantıdan çıkma
    wsRef.current = null; //null yapıyoruz
    setConnected(false); //connected stateini false ypaıyoruz
  };

  //şifre çözme
  const sendEncrypted = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append("[warn] WS açık değil");
      return;
    }

    // — Sade tek akış: parse → encrypt → gönder — //***
    try { //***
      const { ref, parseKey } = registry[algo]; //***
      const parsedKey = parseKey(key); //***
      const cipherText = ref.current.encrypt(plain, parsedKey); //***

      const out: OutMsg = { //***
        type: "chat", //***
        room, //***
        alg: algo, //mesajda hangi algoritmayı kullandığımızı da belirtiyoruz
        cipher: cipherText, //***
      }; //***
      wsRef.current.send(JSON.stringify(out)); //şifreli mesajı gönder
      append(`[send] ${JSON.stringify(out)}`); //log a yaz
      setPlain(""); //gönderim sonrası metin kutusunu temizle
    } catch (err) { //***
      const msg = err instanceof Error ? err.message : String(err); //***
      append("[warn] " + msg); //***
    } //***
  };

  // --- Tek bir mesajı çöz (seçili algo + key ile) --- //***
  const decryptOne = (id: string) => { //***
    try { //***
      const { ref, parseKey } = registry[algo]; //***
      const parsedKey = parseKey(key); //***
      setMessages((prev) => //***
        prev.map((m) => { //***
          if (m.id !== id) return m; //***
          try { //***
            const plain = ref.current.decrypt(m.cipher, parsedKey); //***
            return { ...m, plain, error: undefined }; //***
          } catch (e) { //***
            const emsg = e instanceof Error ? e.message : String(e); //***
            return { ...m, error: emsg }; //***
          } //***
        }) //***
      ); //***
    } catch (e) { //***
      const emsg = e instanceof Error ? e.message : String(e); //***
      append("[warn] " + emsg); //***
    } //***
  }; //***

  const append=(line:string)=>{
    setLog((prev)=>[...prev,line]) 
  }

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

      <div style={{ display: "grid", gap: 8, maxWidth: 920 }}> {/* genişlik artırıldı //*** */}
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}> {/* iki kolonlu düzen //*** */}
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
                <option value="substitution">substitution</option> {/* *** */}
              </select>
            </label>

            <label>
              Key {algo === "caesar" ? "(sayı)" : algo === "vigenere" ? "(metin)" : "(32-harf permütasyon veya JSON map)"}: {/* *** */}
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={algo === "caesar" ? "Örn: 3" : algo === "vigenere" ? "Örn: ANAHTAR" : 'Örn (perm): QWERTYÜİOPĞAS...  |  Örn (JSON): {"A":"Q","B":"W",...}'} //***
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

          {/* Sağ kolon: Chat listesi */} {/* *** */}
          <div style={{ display: "grid", gap: 8 }}> {/* *** */}
            <div>Gelen Mesajlar (üstte en yeni):</div> {/* *** */}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 600 }}>Cipher:</div>
                      <button onClick={() => decryptOne(m.id)} style={{ padding: "4px 10px" }}>
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
                      {m.cipher}
                    </div>

                    <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.8 }}>
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
        </div>
      </div>
    </div>
  );
}
