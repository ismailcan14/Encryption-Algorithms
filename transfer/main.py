#WireShark : 
#websocket.opcode == 1 //sadece chat mesajlarını gösterecek (ping/pong veya handshake hariç).
#tcp.port == 8765 //bu porta gelen tüm istekleri gösterir.
#tcp.port == 8765 && websocket //SADECE PORTTAKİ WS MESAJLARI GÖRÜNÜR.

import asyncio
import json
import websockets

ROOMS: dict[str, set[websockets.WebSocketServerProtocol]] = {} #burada ROOMS adında bir sözlük tanımlıyoruz. room-1:(ws1,ws2)
#sözlük key olarak string bir ifade örneğin room-1,room-2 şeklinde olacak
#value olarak ise ws nesneleri tutuluyor. yani odaya giren her kullanıcı için bir ws nesnesi.
#value da set kullandık çünkü set aynı kayıtları engeller. benzersiz elemanlar tutar.
#Liste kullansaydık hem aynı nesneler girebilirdi hem de aramalarda daha yavaş çalışırdı.

async def handler(ws: websockets.WebSocketServerProtocol):
    #her yeni client bağlandığında çalışan fonksiyonumuz. parametre olarak bağlanan kişinin ws nesnesini tutar.
    room_id = None #gelen bağlantı nesnesi hiç bir odaya bağlı değil.
    try:
        async for raw in ws: #bağlantı açık oldukça mesajları dinleyen kısım.
            try:
                msg = json.loads(raw) #gelen json türündeki mesajı sözlük haline getirir. 
                #örnek:'{"room":"demo","user":"can"}' jsonunu {"room": "demo", "user": "can"} 'e çevirir.
            except json.JSONDecodeError: #client mesajı hatalı yolladıysa örneğin aradaki vilgülü unuttuysa hata oluşur.
                continue#except hatayı yakalar ve döngünün bu adımı continue ile atlanır.

            #odaya katılım
            if msg.get("type") == "join": # gelen mesaj isteği tipi join ise 
                room_id = msg.get("room") #room_id değişkenine mesajdaki room keyinin valuesu atılır.
                if not room_id: #eğer "room" keyi boş ise room_id de boş olur ve istemciye hata mesajı yollarız.
                    # JSON'u ağda kaçışsız (UTF-8) göndermek için ensure_ascii=False kullanıyoruz
                    await ws.send(json.dumps({"type": "system", "ok": False, "error": "room_required"}, ensure_ascii=False))
                    continue #bu adımı atlıyoruz
                ROOMS.setdefault(room_id, set()).add(ws)
                #room_id=deneme olsun setdefault fonksiyonu ROOMS sözlüğünde deneme adında bir oda var mı diye bakar
                #eğer deneme odası varsa o odanın mevcut set i döner örneğin {ws1,ws2} ve add.(ws) ile yeni bağlantıyı ekleriz
                #eğer deneme odası yoksa yeni oda oluşturulur ve boş set e ws eklenir.
                await ws.send(json.dumps({"type": "system", "ok": True, "room": room_id}, ensure_ascii=False)) #ws e dönüş mesajı (UTF-8)
                continue#adımı atla

            #YAYINLAMA
            room = msg.get("room") #gelen mesaj isteği örnek : {"room": "deneme", "text": "selam"}
            if not room or room not in ROOMS: # istekte room bilgisi yoksa veya room bilgisi ROOMS sözlüğünde yoksa
                continue #bu adımı atla
             
            dead = [] #istemcileri geçici olarak tutmak için kullanılan bir liste

            for peer in ROOMS[room]: #odadaki tüm ws bağlantılarını peer temsili ile döngüye sokuyoruz
                try:
                    # Ağ üzerinde doğrudan Türkçe karakter görmek için ensure_ascii=False
                    await peer.send(json.dumps(msg, ensure_ascii=False)) #py sözlüğünü json formatında stringe çevirip bağlantıya(peer) yolluyoruz.
                except Exception:
                    dead.append(peer) # peer.send(json.dumps(msg) sırasında bir hata oluşursa bağlantı listeye eklenir(ölü)
            for d in dead:
                ROOMS[room].discard(d) #ölü listesindeki her bağlantı odadan çıkartılır. discard varsa çıkarır yoksa atlar
    #odadan cıkarma
    finally:#try except finally yapısında hata olsa da olmasa da çalışan kısım.
    #amacı ise Bağlantı artık yok, o zaman odadan çıkarmayı unutma
        if room_id and ws in ROOMS.get(room_id, set()): #oda var mı ? varsa bağlantı da odanın içinde mi ?
            ROOMS[room_id].remove(ws) #o bağlantıyı odadan kaldır.
            if not ROOMS[room_id]: #ROOMS sözlüğünde room_id keyinde hiç bağlantı yoksa 
                ROOMS.pop(room_id, None) #odayı da sil

async def main(): #sunucuyu başlatmak için kullandıgımız ana fonksiyon
    host, port = "0.0.0.0", 8765 #sunucu nerede calısacak ?
    print(f"WS transfer listening at ws://{host}:{port}") #konsol bilgilendirme mesajı
    async with websockets.serve(handler, host, port, ping_interval=120, ping_timeout=120, close_timeout=5):
        #websockets.serve() fonksiyonu bir WebSocket sunucusu oluşturur.

        #handler : her yeni bağlantı geldiğinde çalışacak fonksiyon
        #host,port : dinlenecek adresler
        #ping_interval=20 : 20 saniyede bir ping atması
        #ping_timeout=20 : pongu bekleme süresi
        #close_timeout=5 :  bağlantı kapatılırken maksimum 5 saniye bekler sonrasında zorla kapatır.
        await asyncio.Future() #sonsuza kadar bekletiyoruz burada :) aksi halde sunucu hemen kapanırdı.
        #burada asyncip.Future() ile bir nesne bekliyoruz ama hiç gelmeecek :( .

if __name__ == "__main__": #dosya python main.py seklinde dogrudan calıstırılırsa asagıdakı kodu çalıştırır.
#ancak  main.py nin başka bir yerde import edilmemesi gerekiyor.
#python main.py dediğimizde python __name__ değişkeni dosyanın adını alır. Eğer bu dosya başka bir yerde import edilmiş ise
#o dosyanın adını alır.
    asyncio.run(main())  #main asenkron oldugu ıcın bu sekılde cagırıyoruz. asyncio bir event loop oluşturup içerisinde main i 
    #calistirir.
