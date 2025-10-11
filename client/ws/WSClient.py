import asyncio, json, websockets

class MiniWS:
    def __init__(self, url, room): #constructor metod
        self.url=url #port
        self.room = room #oda id 
        self.ws = None #ws nesnesi
        self.connected = False #bağlandı mı ?
        self.messages = [] #mesajlar

    async def connect(self):
        self.ws = await websockets.connect(self.url) #url e bağlan
        self.connected = True #bağlandı
        await self.ws.send(json.dumps({"type":"join","room":self.room})) #ilk mesaj type json olmalı
        asyncio.create_task(self._listen()) #mesaj dinlemeyi başlat

    async def _listen(self): #gelen mesajları dinle
        async for raw in self.ws: 
            d = json.loads(raw) #sunucudan gelen mesajı parse lar ve bir dict elde eder
            if d.get("type") != "system": #sözlükte ki type türü system değil ise:
                self.messages.append(d) #gelen mesajı messages listesine gönderir.

    async def send(self, obj):
        await self.ws.send(json.dumps(obj)) #ws bağlantısına mesaj gönderme

    async def close(self): #bağlantı kapatma
        await self.ws.close()
        self.connected = False
