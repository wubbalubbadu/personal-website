// "Animalese": cute sped-up babble, one tiny vowel per letter, the way
// villagers talk in Animal Crossing. Fully synthesized (no game samples):
// a buzzy oscillator through two band-pass "formant" filters gives each
// blip a vowel colour. Muted until a page calls unlockAudio() from a tap,
// which is also what iOS Safari requires.
//
// Reusable on its own:
//   unlockAudio();                       // inside a click handler
//   const steps = timeline("hi there!");  // when each character appears
//   steps.forEach(s => setTimeout(() => playStep(s, VOICES.cat), s.at));

export type Voice = {
  /** Base pitch in Hz. */
  pitch: number;
  /** Multiplies the formant frequencies; above 1 sounds smaller. */
  formant: number;
  /** Random pitch wobble per blip, as a fraction (0.05 = 5%). */
  wobble: number;
  /** Blip length in ms. */
  length: number;
  wave: OscillatorType;
  volume: number;
};

export const VOICES = {
  cookie: { pitch: 330, formant: 1.15, wobble: 0.05, length: 62, wave: "sawtooth", volume: 0.5 },
  cat: { pitch: 520, formant: 1.35, wobble: 0.07, length: 52, wave: "sawtooth", volume: 0.42 },
} satisfies Record<string, Voice>;

type Vowel = "a" | "e" | "i" | "o" | "u";

// First and second formants (Hz) of each vowel.
const FORMANTS: Record<Vowel, [number, number]> = {
  a: [760, 1220],
  e: [520, 1850],
  i: [300, 2300],
  o: [560, 880],
  u: [330, 900],
};

// Each letter is "said" as the vowel in its English letter name:
// b is "bee", k is "kay", r is "ar", w is "double-u".
const LETTER_VOWEL: Record<string, Vowel> = {};
for (const [vowel, letters] of Object.entries({ i: "bcdegptvz", e: "ahjkflmnsx", a: "iyr", o: "o", u: "quw" }))
  for (const ch of letters) LETTER_VOWEL[ch] = vowel as Vowel;

export type Step = {
  /** Index of the character this step reveals. */
  index: number;
  /** ms from the start. */
  at: number;
  /** null for spaces and punctuation: reveal only, no sound. */
  vowel: Vowel | null;
  /** Pitch multiplier for this blip (questions rise, exclamations lift). */
  bend: number;
  /** Mandarin-ish tone contour for CJK characters: 1 flat, 2 up, 3 dip, 4 down. */
  tone: 0 | 1 | 2 | 3 | 4;
  /** Relative length. */
  stretch: number;
};

const CJK = /[぀-ヿ㐀-鿿가-힯]/;

/** When each character appears and what it sounds like. */
export function timeline(text: string, speed = 1): Step[] {
  const chars = Array.from(text);
  let at = 0;
  // Find the sentence-ending punctuation each character belongs to.
  const endings: string[] = [];
  let end = "";
  for (let i = chars.length - 1; i >= 0; i--) {
    if (/[.!?。！？]/.test(chars[i])) end = chars[i];
    endings[i] = end;
  }
  // How many characters before that punctuation, so questions rise at the end.
  const toEnd: number[] = [];
  let count = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    count = /[.!?。！？]/.test(chars[i]) ? 0 : count + 1;
    toEnd[i] = count;
  }
  const out: Step[] = [];
  chars.forEach((ch, i) => {
    const fromEnd = toEnd[i];
    const lower = ch.toLowerCase();
    let vowel: Vowel | null = LETTER_VOWEL[lower] ?? null;
    let tone: Step["tone"] = 0;
    let stretch = 1;
    if (!vowel && /\d/.test(ch)) vowel = (["i", "u", "u", "i", "o", "a", "i", "e", "e", "a"] as Vowel[])[+ch];
    if (!vowel && CJK.test(ch)) {
      const code = ch.codePointAt(0)!;
      vowel = (["a", "e", "i", "o", "u"] as Vowel[])[code % 5];
      tone = ((code % 4) + 1) as Step["tone"];
      stretch = 1.6;
    } else if (!vowel && /\p{L}/u.test(ch)) {
      vowel = (["a", "e", "i", "o", "u"] as Vowel[])[(ch.codePointAt(0) ?? 0) % 5];
    }
    const ending = endings[i];
    let bend = 1;
    if (ending === "?" || ending === "？") bend = 1 + Math.max(0, 4 - fromEnd) * 0.07;
    else if (ending === "!" || ending === "！") bend = 1.08;
    out.push({ index: i, at: Math.round(at), vowel, bend, tone, stretch });
    let gap = vowel ? 46 * stretch : 30;
    if (/[,，、]/.test(ch)) gap = 150;
    else if (/[.!?。！？…]/.test(ch)) gap = 240;
    else if (ch === " ") gap = 34;
    at += gap / speed;
  });
  return out;
}

let ctx: AudioContext | null = null;
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Call from a click or tap. Creates or resumes the shared AudioContext. */
export function unlockAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Plays one step's blip. Silent until audio was unlocked. */
export function playStep(step: Step, voice: Voice = VOICES.cookie) {
  if (!ctx || ctx.state !== "running" || !step.vowel) return;
  const now = ctx.currentTime;
  const len = (voice.length * step.stretch) / 1000;
  const f0 = voice.pitch * step.bend * (1 + (Math.random() * 2 - 1) * voice.wobble);

  const osc = ctx.createOscillator();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(f0, now);
  // Speech-like contour: a small fall, or a Mandarin-ish tone shape.
  if (step.tone === 2) osc.frequency.linearRampToValueAtTime(f0 * 1.25, now + len);
  else if (step.tone === 3) {
    osc.frequency.linearRampToValueAtTime(f0 * 0.85, now + len * 0.5);
    osc.frequency.linearRampToValueAtTime(f0 * 1.05, now + len);
  } else if (step.tone === 4) osc.frequency.linearRampToValueAtTime(f0 * 0.75, now + len);
  else if (step.tone === 1) osc.frequency.setValueAtTime(f0 * 1.08, now);
  else osc.frequency.linearRampToValueAtTime(f0 * (step.bend > 1.05 ? 1.06 : 0.9), now + len);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(voice.volume, now + 0.008);
  out.gain.setValueAtTime(voice.volume, now + len * 0.6);
  out.gain.exponentialRampToValueAtTime(0.0001, now + len);

  const [f1, f2] = FORMANTS[step.vowel];
  for (const [f, q, g] of [[f1, 7, 1], [f2, 10, 0.6]] as const) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f * voice.formant;
    bp.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = g;
    osc.connect(bp).connect(amp).connect(out);
  }
  out.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + len + 0.02);
}
