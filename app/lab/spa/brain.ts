// What a bot does with its evening: pick somewhere, go there, do a thing or
// two, move on. Bots send exactly the commands a real person would, so the
// same code path serves the crowd and the network.
import { SPOTS, type Spot, type SpotKind, type Zone } from "./nav";
import type { VerbId } from "./avatar";

export type BotView = {
  x: number;
  z: number;
  zone: Zone;
  spot: Spot | null;
  moving: boolean;
  verbing: boolean;
  floating: boolean;
  cucumbers: boolean;
  napping: boolean;
  /** How far the player is, in metres. */
  nearSelf: number;
};

export type BotAct = {
  goSpot(s: Spot): void;
  goTo(x: number, z: number): void;
  verb(v: VerbId): void;
  flag(f: { cucumbers?: boolean; nap?: boolean; float?: boolean }): void;
  /** Step onto the boat and go home. */
  leave(): void;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Brain {
  private wait = rand(1, 9);
  private stay = rand(15, 60);
  private verbIn = rand(3, 9);
  private errand: "snack" | "home" | null = null;
  private visit = rand(240, 1500); // seconds before they've had enough and head home (4 to 25 minutes, so the room never empties at once)
  private react = -1;
  private greeted = 0;
  private cameFrom: SpotKind | null = null;

  /** Someone poured water on the stones. */
  onSteam() {
    this.react = rand(0.9, 2.4);
  }

  tick(dt: number, me: BotView, act: BotAct) {
    this.greeted -= dt;
    this.visit -= dt;
    if (me.moving || me.verbing) return;

    if (this.react > 0) {
      this.react -= dt;
      if (this.react <= 0 && me.zone === "sauna") act.verb("sigh");
      return;
    }
    // a small hello when you walk up
    if (me.nearSelf < 1.7 && this.greeted <= 0 && !me.napping && !me.cucumbers && !me.floating) {
      this.greeted = 40;
      act.verb("wave");
      return;
    }

    if (me.spot) {
      this.stay -= dt;
      this.verbIn -= dt;
      if (this.stay <= 0) {
        this.cameFrom = me.spot.kind;
        this.next(act);
        return;
      }
      if (this.verbIn > 0) return;
      this.verbIn = rand(6, 16);
      const r = Math.random();
      switch (me.spot.kind) {
        case "mat":
          if (r < 0.3) act.flag({ cucumbers: !me.cucumbers });
          else if (r < 0.6) act.flag({ nap: !me.napping });
          break;
        case "bench":
          if (r < 0.3) act.verb("pour");
          else if (r < 0.5) act.verb("fan");
          else if (r < 0.7) act.verb("sigh");
          break;
        case "soak":
          if (me.floating) {
            if (r < 0.5) act.flag({ float: false });
          } else if (r < 0.45) act.verb("sigh");
          else if (r < 0.62) act.flag({ float: true });
          break;
        case "plunge":
          if (r < 0.6) act.verb("dunk");
          break;
      }
      return;
    }

    if (this.errand === "home") {
      act.leave();
      return;
    }
    if (this.errand === "snack") {
      this.errand = null;
      this.wait = rand(4, 7);
      act.verb(Math.random() < 0.5 ? "egg" : "milk");
      return;
    }
    if (me.zone === "plunge" && Math.random() < 0.004) {
      act.verb("bucket");
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) this.next(act);
  }

  private next(act: BotAct) {
    const r = Math.random() * 10.5;
    // habits, not rules: most people cool off after the sauna and warm up after the plunge
    const habit: SpotKind | null = this.cameFrom === "bench" && Math.random() < 0.55 ? "plunge" : this.cameFrom === "plunge" && Math.random() < 0.5 ? (Math.random() < 0.6 ? "soak" : "mat") : null;
    this.cameFrom = null;
    const kind: SpotKind | "snack" | "stroll" = habit ?? (r < 3 ? "soak" : r < 5 ? "bench" : r < 7.5 ? "mat" : r < 8.5 ? "plunge" : r < 9.7 ? "snack" : "stroll");
    this.verbIn = rand(4, 10);
    if (kind === "snack") {
      this.errand = "snack";
      this.wait = 0.4;
      act.goTo(rand(0.5, 2.6), rand(-2.1, -1.7));
      return;
    }
    if (this.visit <= 0 && !habit) {
      // enough for today: walk out along the dock
      this.errand = "home";
      this.wait = 0.4;
      act.goTo(-1, 10.4);
      return;
    }
    if (kind === "stroll") {
      this.wait = rand(5, 12);
      if (Math.random() < 0.5) act.goTo(rand(5.2, 14.4), rand(2, 6));
      else act.goTo(rand(-7.5, 4.4), rand(4.4, 5.5));
      return;
    }
    const free = SPOTS.filter((s) => s.kind === kind && !s.taken);
    if (!free.length) {
      this.wait = rand(2, 5);
      return;
    }
    this.stay = kind === "plunge" ? rand(8, 18) : rand(28, 75);
    act.goSpot(free[(Math.random() * free.length) | 0]);
  }
}
