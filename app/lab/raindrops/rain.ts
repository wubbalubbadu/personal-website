/**
 * Raindrops: how each played note becomes a drop on a dark pond.
 *
 * This file is the mapping, the "visual score" in miniature: every musical measurement from the articulation engine
 * is turned into one visual quality, and each choice is written down here so it can be argued with and changed.
 *
 * | Music (from the engine)            | Drop                                                                 |
 * |------------------------------------|----------------------------------------------------------------------|
 * | Pitch class (C, C♯, D...)          | Angle around the pond, C at the top, going clockwise in semitones     |
 * | Register (how high)                | Distance from the centre: low notes near the middle, high at the rim |
 * | Peak loudness                      | Size of the drop and how far its rings travel                         |
 * | Attack (crisp to swelled)          | Sharpness: a crisp attack splashes a crown; a soft one swells a glow  |
 * | How long it sounds                 | How long new rings keep coming                                        |
 * | Ending (stopped, natural, tapered) | How the rings fade: cut off, settle, or dissolve slowly               |
 * | Slurred into the next note         | A thread of light to the next drop instead of a fade                  |
 * | Breath noise                       | Mist around the rings                                                 |
 * | Pitch wavering (vibrato)           | Rings that shimmer instead of staying round                           |
 * | Phrase shape                       | The colour of the water while the phrase lasts                        |
 *
 * Why a circle of pitch classes: scales become shapes. A whole-tone scale (Syrinx has whole-tone passages) lands on
 * six points evenly spaced, a hexagon; a chromatic run walks all the way round; a pentatonic figure leaves gaps.
 *
 * Pure functions only (no DOM), apart from `drawPond`, which takes a canvas context.
 */
import type {Analysis, Note, PhraseShape} from "../articulation/engine";

export type EndStyle = "cut" | "settle" | "dissolve" | "thread";

export type Drop = {
  index: number;
  /** When it lands, ms from the start of the take. */
  at: number;
  /** Position in the pond, -1 to 1 on both axes (0, 0 is the centre). */
  x: number;
  y: number;
  /** 0 to 1. */
  size: number;
  /** 0 (no new attack: a slur) to 1 (the crispest tongue). */
  sharpness: number;
  /** How long the note sounds, ms: rings keep coming for this long. */
  soundMs: number;
  /** How long the rings take to fade after the sound ends, ms. */
  fadeMs: number;
  end: EndStyle;
  /** Index of the next drop, when this note slurs into it. */
  threadTo: number | null;
  /** 0 to 1. */
  mist: number;
  /** 0 to 1. */
  shimmer: number;
  /** The phrase colour, as a hue in degrees. */
  hue: number;
  /** The note's name for the optional labels, or null. */
  label: string | null;
};

/** The pond's colour while a phrase of each shape plays: warm when it grows, cool when it fades. */
export const SHAPE_HUE: Record<PhraseShape, number> = {arch: 340, grows: 32, fades: 195, dips: 265, level: 215};

/** The flute's range for placing drops: B3 at the centre's edge, D7 at the rim. */
const LOW_MIDI = 59, HIGH_MIDI = 98;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Where a pitch lands: angle from its pitch class, distance from its register. */
export function place(midi: number): {x: number; y: number} {
  const angle = ((((midi % 12) + 12) % 12) / 12) * Math.PI * 2 - Math.PI / 2;
  const radius = 0.16 + 0.72 * clamp01((midi - LOW_MIDI) / (HIGH_MIDI - LOW_MIDI));
  return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius};
}

/** A note with no steady pitch still lands somewhere stable: near the centre, at an angle from its index. */
function placeUnpitched(index: number) {
  const angle = index * 2.399963; // the golden angle, so neighbours spread out
  return {x: Math.cos(angle) * 0.08, y: Math.sin(angle) * 0.08};
}

export function dropFor(note: Note, phraseShape: PhraseShape, label: string | null): Drop {
  const {x, y} = note.midi === null ? placeUnpitched(note.index) : place(note.midi);
  const sharpness = note.attack === "none" ? 0 : clamp01(1 - (note.attackMs - 8) / 150);
  const end: EndStyle = note.release === "joined" ? "thread" : note.release === "stopped" ? "cut" : note.release === "natural" ? "settle" : "dissolve";
  const fadeMs = end === "cut" ? 260 : end === "settle" ? 900 : end === "thread" ? 700 : Math.min(4200, 1100 + note.releaseMs * 6);
  return {
    index: note.index,
    at: note.startMs,
    x, y,
    // Peak loudness is dB below the loudest moment of the take: 0 is the loudest, -30 is quiet.
    size: 0.22 + 0.78 * clamp01((note.peakDb + 30) / 30),
    sharpness,
    soundMs: Math.max(40, note.soundedMs),
    fadeMs,
    end,
    threadTo: end === "thread" ? note.index + 1 : null,
    mist: clamp01(((note.breathiness ?? 0) + (note.attackNoise ?? 0) * 0.5) / 0.35),
    shimmer: clamp01((note.wobbleCents ?? 0) / 30),
    hue: SHAPE_HUE[phraseShape],
    label,
  };
}

export function dropsFor(analysis: Analysis, name: (midi: number) => string): Drop[] {
  const shapeOf = new Map(analysis.phrases.map(p => [p.index, p.shape]));
  return analysis.notes.map(note => dropFor(note, shapeOf.get(note.phrase) ?? "level", note.midi === null ? null : name(note.midi)));
}

/** How visible a drop is at time t (ms): 0 before it lands and after it has faded. */
export function presence(drop: Drop, t: number): number {
  const age = t - drop.at;
  if (age < 0) return 0;
  if (age <= drop.soundMs) return 1;
  const after = (age - drop.soundMs) / drop.fadeMs;
  if (after >= 1) return 0;
  // Cut: drops away fast at first. Dissolve: lingers, then goes. Settle and thread: in between.
  return drop.end === "cut" ? (1 - after) ** 3 : drop.end === "dissolve" ? 1 - after ** 2 : 1 - after;
}

/** Every drop visible at time t is one whose landing has passed and whose fade has not finished. */
export const lastsUntil = (drop: Drop) => drop.at + drop.soundMs + drop.fadeMs;

// ---------------------------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------------------------

/** A small deterministic random sequence per drop, so mist and splashes look the same on every frame. */
function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export type PondOptions = {labels: boolean; circle: boolean};

/**
 * Draws the pond at time t (ms). Everything is a function of t, so playback, scrubbing and video export all draw
 * the same picture for the same moment.
 */
export function drawPond(ctx: CanvasRenderingContext2D, width: number, height: number, drops: Drop[], analysis: Analysis, t: number, options: PondOptions) {
  const cx = width / 2, cy = height / 2, unit = Math.min(width, height) * 0.46;
  const px = (v: number) => cx + v * unit, py = (v: number) => cy + v * unit;

  // Water: near black, tinted by the phrase being played and brighter as that phrase gets louder.
  const phrase = analysis.phrases.find(p => t >= p.startMs && t <= p.endMs + 600);
  let glow = 0, hue = 220;
  if (phrase) {
    hue = SHAPE_HUE[phrase.shape];
    const points = phrase.contour;
    let level = points[0]?.db ?? -30;
    for (let k = 1; k < points.length; k++) {
      if (points[k].at >= t) {
        const a = points[k - 1], b = points[k], f = clamp01((t - a.at) / Math.max(1, b.at - a.at));
        level = a.db + (b.db - a.db) * f;
        break;
      }
      level = points[k].db;
    }
    const fadeOut = t > phrase.endMs ? 1 - (t - phrase.endMs) / 600 : 1;
    glow = clamp01((level + 30) / 30) * fadeOut;
  }
  const water = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.75);
  water.addColorStop(0, `hsl(${hue} 32% ${7 + glow * 9}%)`);
  water.addColorStop(1, "hsl(225 30% 3%)");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, width, height);

  if (options.circle) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (const r of [0.16, 0.52, 0.88]) { ctx.beginPath(); ctx.arc(cx, cy, r * unit, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = `${Math.round(unit * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const names = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
    names.forEach((name, k) => {
      const angle = (k / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(name, cx + Math.cos(angle) * unit * 0.97, cy + Math.sin(angle) * unit * 0.97);
    });
    ctx.restore();
  }

  const line = unit / 420; // line widths scale with the pond, so a saved 1080 px video and a small screen look alike

  // Constellation: every note of the phrase being played stays as a faint point, joined in order, until the phrase
  // has ended. This is what turns a scale into a shape (a whole-tone run builds a hexagon) after the drops fade.
  if (phrase) {
    const members = drops.filter(d => analysis.notes[d.index]?.phrase === phrase.index && d.at <= t);
    const fade = t > phrase.endMs ? clamp01(1 - (t - phrase.endMs) / 2500) : 1;
    if (members.length && fade > 0) {
      ctx.save();
      ctx.strokeStyle = `hsla(${hue} 50% 80% / ${0.14 * fade})`;
      ctx.lineWidth = line * 1.2;
      ctx.beginPath();
      members.forEach((d, k) => (k ? ctx.lineTo(px(d.x), py(d.y)) : ctx.moveTo(px(d.x), py(d.y))));
      ctx.stroke();
      ctx.fillStyle = `hsla(${hue} 50% 85% / ${0.35 * fade})`;
      for (const d of members) { ctx.beginPath(); ctx.arc(px(d.x), py(d.y), line * (2 + d.size * 2.5), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const drop of drops) {
    const seen = presence(drop, t);
    if (seen <= 0) continue;
    const age = t - drop.at;
    const x = px(drop.x), y = py(drop.y);
    const reach = unit * (0.1 + drop.size * 0.32);
    const random = seeded(drop.index + 1);
    const light = (alpha: number) => `hsla(${drop.hue} 60% 86% / ${alpha})`;

    // Thread: a slur draws a line of light to the next drop while the note sounds.
    if (drop.threadTo !== null) {
      const next = drops[drop.threadTo];
      if (next) {
        const grow = clamp01(age / drop.soundMs);
        ctx.strokeStyle = light(0.32 * seen);
        ctx.lineWidth = line * (1 + drop.size * 2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (px(next.x) - x) * grow, y + (py(next.y) - y) * grow);
        ctx.stroke();
      }
    }

    // Rings: one every ~190 ms while the note sounds, each spreading out and fading over 1.6 s (longer when the note
    // dissolves, so the rings outlast the sound the way a tapered ending does).
    const every = 190, life = drop.end === "dissolve" ? Math.max(1600, drop.fadeMs * 0.9) : 1600;
    for (let born = 0; born <= Math.min(age, drop.soundMs); born += every) {
      const ringAge = age - born;
      if (ringAge > life) continue;
      const progress = ringAge / life;
      const radius = reach * (0.08 + progress * (born === 0 ? 1 : 0.8));
      const alpha = (1 - progress) ** 1.5 * seen * (born === 0 ? 1 : 0.6);
      // Softer attacks draw wider, dimmer first rings; crisp ones a fine bright line.
      const width = line * (born === 0 ? 1.2 + (1 - drop.sharpness) * 5 : 1 + drop.size * 1.5);
      ctx.strokeStyle = light(alpha * (born === 0 ? 0.55 + drop.sharpness * 0.45 : 1));
      ctx.lineWidth = width;
      ctx.beginPath();
      if (drop.shimmer > 0.05) {
        const steps = 64, phase = (t / 1000) * 5.5 * Math.PI * 2;
        for (let s = 0; s <= steps; s++) {
          const angle = (s / steps) * Math.PI * 2;
          const r = radius * (1 + drop.shimmer * 0.05 * Math.sin(angle * 6 + phase + born));
          if (s) ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
          else ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
      } else ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The landing: a crisp attack throws up a crown of droplets; a soft one swells a glow instead.
    if (drop.sharpness > 0.35 && age < 260) {
      const f = age / 260, count = 7 + Math.round(drop.sharpness * 7);
      ctx.fillStyle = light((1 - f) * drop.sharpness);
      for (let k = 0; k < count; k++) {
        const angle = random() * Math.PI * 2, distance = reach * (0.05 + f * (0.18 + random() * 0.2) * drop.sharpness);
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, line * (1.2 + drop.size * 2.2 * (1 - f)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const swell = drop.sharpness > 0.35 ? 1 : clamp01(age / 220);
    const core = reach * (0.05 + 0.05 * drop.size) * (0.6 + 0.4 * swell);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, core * 3);
    halo.addColorStop(0, light(0.85 * seen * (age <= drop.soundMs ? 1 : 0.6)));
    halo.addColorStop(1, light(0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, core * 3, 0, Math.PI * 2);
    ctx.fill();

    // Mist: breath noise as fine specks drifting around the drop.
    if (drop.mist > 0.08) {
      const specks = Math.round(drop.mist * 40);
      ctx.fillStyle = light(0.22 * seen * drop.mist);
      for (let k = 0; k < specks; k++) {
        const angle = random() * Math.PI * 2, distance = reach * (0.15 + random() * 0.7) * (0.6 + 0.4 * clamp01(age / 600));
        ctx.fillRect(x + Math.cos(angle + age / 4000) * distance, y + Math.sin(angle + age / 4000) * distance, line * 1.6, line * 1.6);
      }
    }

    if (options.labels && drop.label) {
      ctx.fillStyle = `rgba(255,255,255,${0.55 * seen})`;
      ctx.font = `${Math.round(unit * 0.04)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(drop.label, x, y - core * 3 - 4);
    }
  }
  ctx.restore();
}

/**
 * For a blind test (study guide, unit 9): every drop still lands when its note starts, but which note gets which look
 * is shuffled among the notes. Where it lands, its size, splash, how long it rings, how it fades, mist and shimmer all
 * move together to another note. If viewers cannot tell this from the real mapping, the mapping is not carrying the
 * music; if they can, it is. The same seed always gives the same shuffle, so a test can be repeated.
 */
export function shuffleLooks(drops: Drop[], seed = 1): Drop[] {
  const order = drops.map((_, k) => k);
  const random = seeded(seed);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return drops.map((drop, k) => {
    const look = drops[order[k]];
    return {
      ...drop,
      x: look.x, y: look.y, size: look.size, sharpness: look.sharpness, soundMs: look.soundMs, fadeMs: look.fadeMs,
      end: look.end === "thread" ? "settle" : look.end, threadTo: null, mist: look.mist, shimmer: look.shimmer, label: look.label,
    };
  });
}
