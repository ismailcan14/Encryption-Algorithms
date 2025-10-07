import asyncio
import json
import websockets

ROOMS: dict[str, set[websockets.WebSocketServerProtocol]] = {}

async def handler(ws: websockets.WebSocketServerProtocol):
    room_id = None
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            #odaya katılım
            if msg.get("type") == "join":
                room_id = msg.get("room")
                if not room_id:
                    await ws.send(json.dumps({"type": "system", "ok": False, "error": "room_required"}))
                    continue
                ROOMS.setdefault(room_id, set()).add(ws)
                await ws.send(json.dumps({"type": "system", "ok": True, "room": room_id}))
                continue

            #YAYINLAMA
            room = msg.get("room")
            if not room or room not in ROOMS:
                continue
            
            dead = []

            for peer in ROOMS[room]:
                try:
                    await peer.send(json.dumps(msg))
                except Exception:
                    dead.append(peer)
            for d in dead:
                ROOMS[room].discard(d)

    finally:
        #odadan cıkarma
        if room_id and ws in ROOMS.get(room_id, set()):
            ROOMS[room_id].remove(ws)
            if not ROOMS[room_id]:
                ROOMS.pop(room_id, None)

async def main():
    host, port = "0.0.0.0", 8765
    print(f"WS transfer listening at ws://{host}:{port}")
    async with websockets.serve(handler, host, port, ping_interval=20, ping_timeout=20, close_timeout=5):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
