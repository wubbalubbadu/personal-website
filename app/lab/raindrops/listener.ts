/**
 * Sound in, notes out, on two clocks.
 *
 * Loudness is read every 128 samples (about 3ms), fast enough to see the
 * shape of an attack and an ending. Pitch needs a longer slice of sound, so
 * it is read about every 45ms while a note is sounding.
 *
 * Every measurement is relative: the quiet floor and the loud ceiling are
 * learned from the room and the player as they go, so the same note reads
 * the same with a closer mic or in a different room.
 */
import { detectPitch } from "../../flute-studio/lib/pitch";

/** What the page knows about one note. Updated every frame while it sounds. */
export type Note = {
  id: number;
  /** Median pitch so far, or null if none was heard clearly yet. */
  hz: number | null;
  /** 0 to 1: this note's loudest moment, measured down from the player's recent loudest. */
  volume: number;
  /** Onset to loudest moment in the first quarter second. Short = hard attack. */
  attackMs: number;
  /** How long it has sounded so far. */
  lengthMs: number;
  /** Null while sounding. Then: how long it took to die away. Small = abrupt, large = tapered. */
  endingMs: number | null;
};

type Sounding = {
  id: number;
  onsetMs: number;
  /** Loudest in the attack window. */
  peakDb: number;
  /** Every level reading in the attack window, to find when it first came near the peak. */
  rise: { t: number; db: number }[];
  loudestDb: number;
  /** Last time the level was within FULL_DB of the peak; the ending is measured from here. */
  lastFullMs: number;
  /** Last time the level was within BODY_DB of the peak. */
  lastStrongMs: number;
  /** Quietest level since the note was last strong, to spot a re-tongued note with no gap. */
  dipDb: number;
  pitches: number[];
  lastPitchMs: number;
};

const BLOCK = 128;
const PITCH_EVERY_MS = 45;
const PITCH_WINDOW = 2048;
const ATTACK_WINDOW_MS = 250;
/** The attack ends the first time the level comes this close to the peak; a held tone wobbles a little above it. */
const ATTACK_STEP_DB = 1;
/** Within this many dB of the peak still counts as the body of the note. */
const BODY_DB = 9;
/** The ending starts once the level leaves this close band around the peak. */
const FULL_DB = 4;
/** Volume 0 sits this far below the loudest recent playing; a flute's working range. */
const VOLUME_RANGE_DB = 30;
/** Shorter than this is a click or a bump, not a note. */
const MIN_NOTE_MS = 40;

const toDb = (rms: number) => 20 * Math.log10(rms + 1e-9);

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export class NoteListener {
  onUpdate: (note: Note) => void = () => {};
  onEnd: (note: Note) => void = () => {};
  /** Latest level in dB, for a meter. */
  level = -100;

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer = new Float32Array(4096);
  private lastTime = 0;
  private floorDb = -70;
  private loudDb = -20;
  private note: Sounding | null = null;
  private nextId = 1;
  private stopSource: (() => void) | null = null;

  private async ready() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.buffer.length;
    }
    await this.ctx.resume();
    this.lastTime = this.ctx.currentTime;
    return { ctx: this.ctx, analyser: this.analyser! };
  }

  async useMic() {
    this.stop();
    const { ctx, analyser } = await this.ready();
    // The browser's voice-call processing would fight us: auto gain flattens
    // loudness and noise suppression eats soft attacks and tapered endings.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    this.stopSource = () => {
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    };
  }

  /** Plays a recording out loud and listens to it the same way as the mic. */
  async useRecording(file: File, onFinished: () => void) {
    this.stop();
    const { ctx, analyser } = await this.ready();
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    source.connect(ctx.destination);
    audio.onended = () => {
      this.stop();
      onFinished();
    };
    this.stopSource = () => {
      audio.onended = null;
      audio.pause();
      source.disconnect();
      URL.revokeObjectURL(url);
    };
    await audio.play();
  }

  stop() {
    this.stopSource?.();
    this.stopSource = null;
    if (this.note) this.finish(this.lastTime * 1000);
  }

  /** Call once per animation frame. Reads every sample that arrived since the last call. */
  tick() {
    const { ctx, analyser, buffer } = this;
    if (!ctx || !analyser || !this.stopSource) return;
    const rate = ctx.sampleRate;
    let fresh = Math.round((ctx.currentTime - this.lastTime) * rate);
    if (fresh > buffer.length) {
      // The tab was hidden and the gap is longer than the buffer: start over from now.
      fresh = buffer.length;
      this.lastTime = ctx.currentTime - fresh / rate;
    }
    const used = Math.floor(fresh / BLOCK) * BLOCK;
    if (!used) return;
    analyser.getFloatTimeDomainData(buffer);

    const start = buffer.length - fresh;
    for (let b = 0; b < used; b += BLOCK) {
      let sum = 0;
      for (let i = start + b; i < start + b + BLOCK; i++) sum += buffer[i] * buffer[i];
      this.step(toDb(Math.sqrt(sum / BLOCK)), (this.lastTime + (b + BLOCK) / rate) * 1000);
    }
    this.lastTime += used / rate;

    const note = this.note;
    const now = this.lastTime * 1000;
    if (note && now - note.lastPitchMs >= PITCH_EVERY_MS) {
      note.lastPitchMs = now;
      const frame = detectPitch(buffer.subarray(buffer.length - PITCH_WINDOW), rate, 0.001);
      if (frame) note.pitches.push(frame.hz);
    }
    if (this.note) this.onUpdate(this.snapshot(this.note, now, null));
  }

  private step(db: number, t: number) {
    this.level = db;
    const note = this.note;
    // Loud reference jumps up to anything louder, then relaxes slowly, so
    // volume stays relative to how loud the player has been lately.
    this.loudDb = db > this.loudDb ? db : Math.max(this.floorDb + 20, this.loudDb - 0.0015);

    if (!note) {
      // Noise floor drops at once to anything quieter and creeps back up
      // slowly. Frozen during notes, or a long note would lift it past itself.
      // Digital silence (the buffer before sound arrives) is not a room.
      if (db > -100) this.floorDb = db < this.floorDb ? db : this.floorDb + 0.003;
      if (db > this.gate() + 6) this.begin(db, t);
      return;
    }

    if (t - note.onsetMs < ATTACK_WINDOW_MS) {
      note.rise.push({ t, db });
      note.peakDb = Math.max(note.peakDb, db);
    }
    note.loudestDb = Math.max(note.loudestDb, db);
    if (db > note.peakDb - FULL_DB) note.lastFullMs = t;
    if (db > note.peakDb - BODY_DB) {
      note.lastStrongMs = t;
      note.dipDb = db;
    } else if (db < note.dipDb) {
      note.dipDb = db;
    }

    const retongued = note.dipDb < note.peakDb - BODY_DB && db > note.dipDb + 8;
    if (db < this.gate() || retongued) {
      this.finish(t);
      if (retongued) this.begin(db, t);
    }
  }

  private gate() {
    return Math.max(this.floorDb + 10, -65);
  }

  private begin(db: number, t: number) {
    this.note = {
      id: this.nextId++,
      onsetMs: t,
      peakDb: db,
      rise: [{ t, db }],
      loudestDb: db,
      lastFullMs: t,
      lastStrongMs: t,
      dipDb: db,
      pitches: [],
      lastPitchMs: -Infinity,
    };
  }

  private finish(t: number) {
    const note = this.note!;
    this.note = null;
    if (t - note.onsetMs < MIN_NOTE_MS) return;
    this.onEnd(this.snapshot(note, t, t - note.lastFullMs));
  }

  private snapshot(note: Sounding, t: number, endingMs: number | null): Note {
    return {
      id: note.id,
      hz: note.pitches.length ? median(note.pitches) : null,
      volume: Math.min(1, Math.max(0, 1 - (this.loudDb - note.loudestDb) / VOLUME_RANGE_DB)),
      attackMs: (note.rise.find((r) => r.db >= note.peakDb - ATTACK_STEP_DB)?.t ?? note.onsetMs) - note.onsetMs,
      lengthMs: t - note.onsetMs,
      endingMs,
    };
  }
}
