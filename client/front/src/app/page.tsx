"use client";

import { useEffect, useRef, useState } from "react";
import { CaesarCipher } from "../../../cryption/algorithms/Caesar";

type OutMsg = { //mesaj yollarken ki tipimiz
  type: string;  //type alanı zorunlu
  room?: string; //oda
  alg?: string;//algoritma
  cipher?: string; //ve şifreli mesaj kısmı bos olabilir
  [k: string]: any; //vereceğimiz key alanı
};

export default function Page()
{
const [connected,setConnected]=useState(false);
const [room,setRoom]=useState("demo-1");//katılacagın oda id si
const [plain,setPlain]=useState("");//düz metin
const [url,setUrl]=useState("ws://127.0.0.1:8765"); //sunucu adresi
const [key,setKey]=useState("3"); //algoritmada kullanacagımız key
const [log,setLog]=useState<String[]>([]); //ekranda gösterilecek metinlerin dizisi

  const wsRef=useRef<WebSocket|null>(null);
  //burada React ın useRef hookunu kullandık çünkü WebSocket ten 1 adet nesne olusturuyoruz ve sayfa yenıden render edilse bile
  //nesnemiz korunuyor. wsRef.current ile de değerni oluşturabiliyoruz.
  //kısaca diyoruz ki wsRef in WebSocket türünde bir referansı var ancak şuan boş. wsRef.curren ileri WS nesnesi tutacak.
const cipher=useRef(new CaesarCipher());
  //aynı şekilde de burada da CaesarCipher sınıfından bir nesne oluşturduk. bu nesne ile şifreleme ve şifre çözmeyi kullanacağız.
  //useRef() kullandıgımız için nesne proje sonlanana kadar bizimle kalacak.

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

    const cipherText = cipher.current.encrypt(plain, key);
    const out: OutMsg = {
      type: "chat",
      room,
      alg: "caesar",
      cipher: cipherText,
    };
    wsRef.current.send(JSON.stringify(out));
    append(`[send] ${JSON.stringify(out)}`);
    setPlain(""); 
  };

  const append=(line:string)=>{
    setLog((prev)=>[...prev,line]) //log a veri ekleyen yardımcı
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
          <select value="caesar" disabled style={{ width: "100%" }}>
            <option value="caesar">caesar</option>
          </select>
        </label>

        <label>
          Key (sayı):
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
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
