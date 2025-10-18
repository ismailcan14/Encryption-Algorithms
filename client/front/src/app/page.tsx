"use client";

import { useEffect, useRef, useState } from "react";
import { CaesarCipher } from "../../../cryption/algorithms/Caesar";
import { VigenereCipher } from "../../../cryption/algorithms/Vigenere"; //Vigenere sınıfını da projeye dahil ediyoruz (çoklu algoritma desteği için)

type OutMsg = { //mesaj yollarken ki tipimiz
  type: string;  //type alanı zorunlu
  room?: string; //oda
  alg?: string;//algoritma
  cipher?: string; //ve şifreli mesaj kısmı bos olabilir
  [k: string]: any; //vereceğimiz key alanı
};

type Algo = "caesar" | "vigenere"; //kullanacağımız algoritma isimleri (select kutusunda seçim yapacağız)

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

    let cipherText = ""; //göndereceğimiz şifreli metni burada oluşturacağız

    if (algo === "caesar") { //seçilen algoritma caesar ise sayısal anahtar bekliyoruz
      const kNum = Number(key); //metin kutusundan gelen değeri sayıya çevir
      if (!Number.isFinite(kNum)) { //geçerli sayı değilse uyar
        append("[warn] Key geçersiz (sayı olmalı)");
        return;
      }
      cipherText = caesarRef.current.encrypt(plain, kNum); //caesar ile şifrele
    } else {
      // vigenere
      const kStr = String(key ?? "").trim(); //vigenere için metin anahtar gerekli
      if (!kStr) { //boş anahtar kabul etmiyoruz
        append("[warn] Key geçersiz (boş olamaz)");
        return;
      }
      try {
        cipherText = vigenereRef.current.encrypt(plain, kStr); //vigenere ile şifrele
      } catch (err) {
        append("[warn] Vigenere anahtar hatası: " + String((err as Error)?.message ?? err)); //hata mesajını logla
        return;
      }
    }

    const out: OutMsg = {
      type: "chat",
      room,
      alg: algo, //mesajda hangi algoritmayı kullandığımızı da belirtiyoruz
      cipher: cipherText,
    };
    wsRef.current.send(JSON.stringify(out)); //şifreli mesajı gönder
    append(`[send] ${JSON.stringify(out)}`); //log a yaz
    setPlain(""); //gönderim sonrası metin kutusunu temizle
  };

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
