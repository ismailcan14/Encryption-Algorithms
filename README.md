# Encryption Algorithms - Şifreleme Algoritmaları

Uçtan uca şifreli mesajlaşma ve dosya paylaşımı uygulaması.

## 🛡️ Özellikler

- **15+ Şifreleme Algoritması:** AES, DES, RSA, Caesar, Vigenère, Hill, Playfair ve daha fazlası
- **Kütüphane & Manuel Implementasyon:** Hem kütüphane tabanlı hem de sıfırdan yazılmış algoritmalar
- **Performans Ölçümü:** Her şifreleme/çözme işleminin süresi (ms) terminalde görüntülenir
- **Güvenli Anahtar Değişimi:** RSA-2048 ve ECDH P-256 desteği
- **Dosya Şifreleme:** AES-GCM ile dosya transferi
- **Gerçek Zamanlı İletişim:** WebSocket tabanlı chat sistemi

## 🚀 Kurulum

### Sunucu
```bash
cd server
python server.py
```

### İstemci
```bash
cd client/front
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

## 📊 Performans Çıktısı

Terminal'de şifreleme performansı şu formatta görüntülenir:

```
[ŞİFRELEME] Algoritma: aes_lib | Tür: Kütüphane Tabanlı | Giriş: 12 kar | Çıkış: 44 kar | Süre: 0.500 ms
[ŞİFRE ÇÖZME] Algoritma: des_manual | Tür: Manuel | Giriş: 32 kar | Çıkış: 9 kar | Süre: 1.200 ms
```

## 🔐 Desteklenen Algoritmalar

| Algoritma | Tür | Açıklama |
|-----------|-----|----------|
| AES (Library) | Simetrik | Web Crypto API |
| AES (Manuel) | Simetrik | Sıfırdan implementasyon |
| DES (Library) | Simetrik | CryptoJS |
| DES (Manuel) | Simetrik | Sıfırdan implementasyon |
| RSA | Asimetrik | Anahtar değişimi |
| ECDH | Asimetrik | Eliptik eğri anahtar değişimi |
| Caesar | Klasik | Kaydırma şifresi |
| Vigenère | Klasik | Polialfabetik şifre |
| Hill | Klasik | Matris tabanlı |
| Playfair | Klasik | Digraf şifresi |
| Affine | Klasik | Matematiksel şifre |
| Rail Fence | Transpozisyon | Zigzag deseni |
| Columnar | Transpozisyon | Sütun bazlı |

## 📁 Proje Yapısı

```
├── client/
│   ├── cryption/         # Şifreleme algoritmaları
│   │   ├── algorithms/   # AES, DES, Caesar, vb.
│   │   └── key-exchange/ # RSA, ECDH
│   └── front/            # Next.js frontend
└── server/               # Python WebSocket sunucusu
```

## 👥 Geliştiriciler

İsmail Can Öztürk