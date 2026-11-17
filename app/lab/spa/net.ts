// Who else is here. Only events travel (someone arrived, is walking to a
// point, did a verb), never a stream of positions; every browser animates the
// walk itself. For now the "network" is other tabs of this browser, through a
// BroadcastChannel. A real server (one small relay per room, for example a
// Cloudflare Durable Object) would implement the same Transport and nothing
// else in the game would change.
import type { VerbId } from "./avatar";

export type Flags = { cucumbers?: boolean; nap?: boolean; float?: boolean };

export type Msg =
  /** Hello and heartbeat: enough to draw this person from scratch. */
  | { t: "hi"; id: string; seed: number; x: number; z: number; born: number; spot: string | null; flags: Flags; bot?: boolean }
  | { t: "go"; id: string; x: number; z: number }
  | { t: "spot"; id: string; spot: string }
  | { t: "verb"; id: string; verb: VerbId }
  | { t: "flag"; id: string; flags: Flags }
  | { t: "bye"; id: string };

export type Transport = {
  send(m: Msg): void;
  close(): void;
};

/** Other tabs of the same browser, same room name. */
export function tabTransport(room: string, onMessage: (m: Msg) => void): Transport | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const ch = new BroadcastChannel(`spa:${room}`);
  ch.onmessage = (e) => onMessage(e.data as Msg);
  return {
    send: (m) => ch.postMessage(m),
    close: () => ch.close(),
  };
}
