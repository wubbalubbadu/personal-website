# Soak: real multiplayer, a draft

Notes only. Nothing here is wired, installed or deployed. Today the "network" is other tabs of the same browser (`app/lab/spa/net.ts`, a BroadcastChannel). This is what replacing it with a real server would take.

## The idea in one line

One tiny relay per room. It keeps a list of who is connected and forwards every message to everyone else in that room. It never simulates anything.

## Why this is cheap

The game already sends events, not positions:

| Message | When | Size |
|---|---|---|
| `hi` | on arrival, then every 2 s as a heartbeat | about 120 bytes |
| `go` | each click on the floor (4 per second while holding WASD) | about 50 bytes |
| `spot` | sitting, lying or soaking somewhere | about 40 bytes |
| `verb` | a verb button | about 40 bytes |
| `flag` | cucumbers, nap, float on or off | about 50 bytes |
| `bye` | leaving | about 25 bytes |

Twenty people in a room is roughly 20 heartbeats every 2 seconds plus the odd click. A sitting person costs one heartbeat and nothing else.

## Shape on Cloudflare (she already deploys there)

- A **Durable Object** class `SpaRoom`, one instance per room name (`main-0`, `main-1`...). Durable Objects are Cloudflare's "one small stateful server per key", which is exactly a room.
- The Pages site upgrades `GET /api/spa/room/:name` to a WebSocket and hands it to the room's object.
- Use the WebSocket Hibernation API so an idle room costs nothing while people just sit.

```ts
// DRAFT, not in the build. Would live in the worker, not in app/.
export class SpaRoom {
  constructor(private state: DurableObjectState) {}

  async fetch(req: Request) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    if (this.state.getWebSockets().length >= 24) return new Response("room full", { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(from: WebSocket, data: string | ArrayBuffer) {
    if (typeof data !== "string" || data.length > 400) return; // nothing legitimate is bigger
    for (const ws of this.state.getWebSockets()) if (ws !== from) ws.send(data);
  }

  webSocketClose(ws: WebSocket) {
    // the others notice within 7 s when the heartbeats stop; a "bye" from the server would be faster
  }
}
```

Client side, the only change is a second `Transport` next to `tabTransport`:

```ts
export function socketTransport(url: string, onMessage: (m: Msg) => void): Transport {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return { send: (m) => ws.readyState === 1 && ws.send(JSON.stringify(m)), close: () => ws.close() };
}
```

## Decisions to make before building it

1. **Room size.** The temple uses small rooms per region. 12 to 16 people feels full in this space (there are 21 places to sit). Past that, open `main-1`.
2. **Who runs the bots.** Today the oldest tab runs them. With a server the simplest honest answer is: bots only fill a room while fewer than about 4 real people are in it, and the oldest client still runs them.
3. **Trust.** A client could send nonsense (teleport, spam verbs). The relay should drop messages that are too big or too frequent (for example more than 10 per second per socket). Since there is no chat and no free text, the worst a troll can do is wave a lot.
4. **Names.** Names come from the seed, so nobody can type one. Keep it that way: no moderation needed.
5. **Cost.** Durable Objects need the Workers Paid plan (5 USD a month at the time of writing; check current pricing). PartyKit is the same thing with nicer tooling and also runs on Cloudflare.

## What I would not build yet

Accounts, persistence, friends, private rooms. None of them help answer "do I want to come back tomorrow?"
