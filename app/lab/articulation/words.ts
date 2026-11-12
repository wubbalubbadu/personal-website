/**
 * Every word the articulation tool shows, in English and Chinese, with the plain explanation of what each
 * measurement means. Kept apart from the engine (which only returns numbers and keys) so the teaching text can be
 * edited without touching the maths.
 */
import type {AttackWord, LengthWord, PhraseShape, ReleaseWord, StartKind} from "./engine";

type Pair = {en: string; zh: string};
const pick = (pair: Pair, zh: boolean) => (zh ? pair.zh : pair.en);

const LENGTH: Record<LengthWord, Pair> = {
  slurred: {en: "Slurred", zh: "连奏"},
  full: {en: "Full length", zh: "饱满"},
  detached: {en: "Detached", zh: "断开"},
  staccato: {en: "Staccato", zh: "断奏"},
  staccatissimo: {en: "Staccatissimo", zh: "极短断奏"},
};
const LENGTH_MEANS: Record<LengthWord, Pair> = {
  slurred: {en: "No break: the next note starts by changing pitch.", zh: "没有断开：下一个音靠换音高开始。"},
  full: {en: "Sounds for almost the whole beat before the next note.", zh: "几乎一直响到下一个音之前。"},
  detached: {en: "A small space before the next note.", zh: "和下一个音之间有一点空隙。"},
  staccato: {en: "Sounds for about half the time before the next note.", zh: "大约只响到下一个音之前一半的时间。"},
  staccatissimo: {en: "Sounds for less than a third of the time before the next note.", zh: "响的时间不到下一个音之前的三分之一。"},
};
const ATTACK: Record<AttackWord, Pair> = {
  none: {en: "No new attack", zh: "没有新的音头"},
  crisp: {en: "Crisp", zh: "干脆"},
  clean: {en: "Clean", zh: "清楚"},
  gentle: {en: "Gentle", zh: "柔和"},
  swelled: {en: "Swelled", zh: "渐起"},
};
const RELEASE: Record<ReleaseWord, Pair> = {
  stopped: {en: "Stopped", zh: "截止"},
  natural: {en: "Natural", zh: "自然"},
  tapered: {en: "Tapered", zh: "渐收"},
  joined: {en: "Joined", zh: "连到下一个音"},
};
const START: Record<StartKind, Pair> = {
  afterSilence: {en: "After silence", zh: "从静音开始"},
  tongued: {en: "Tongued", zh: "吐音"},
  slurred: {en: "Slurred in", zh: "连进来"},
};
const SHAPE: Record<PhraseShape, Pair> = {
  arch: {en: "Arch: grows, then fades", zh: "拱形：先渐强再渐弱"},
  grows: {en: "Grows", zh: "渐强"},
  fades: {en: "Fades", zh: "渐弱"},
  dips: {en: "Dips in the middle", zh: "中间变弱"},
  level: {en: "Level", zh: "平稳"},
};

export const lengthWord = (word: LengthWord, zh: boolean) => pick(LENGTH[word], zh);
export const lengthMeans = (word: LengthWord, zh: boolean) => pick(LENGTH_MEANS[word], zh);
export const attackWord = (word: AttackWord, zh: boolean) => pick(ATTACK[word], zh);
export const releaseWord = (word: ReleaseWord, zh: boolean) => pick(RELEASE[word], zh);
export const startWord = (kind: StartKind, zh: boolean) => pick(START[kind], zh);
export const shapeWord = (shape: PhraseShape, zh: boolean) => pick(SHAPE[shape], zh);

export const LENGTH_ORDER: LengthWord[] = ["slurred", "full", "detached", "staccato", "staccatissimo"];

/** What each measurement means, shown beside its number. */
export const MEANS = {
  attack: {
    en: "How long the note takes to grow from 10% to 90% of its peak. A firm tongue is fast; a breath attack or a swell is slow.",
    zh: "音从峰值的 10% 长到 90% 用的时间。舌头干脆就快，气起音或渐起就慢。",
  },
  length: {
    en: "How long the note really sounds (until it falls 12 dB below its peak), compared with the time until the next note starts.",
    zh: "音真正响了多久（直到比峰值低 12 dB），和到下一个音开始的时间相比。",
  },
  release: {
    en: "How the note ends: the time from falling below its held level until the sound is gone. Stopping the air or the tongue is fast; letting the air fade is slow.",
    zh: "音怎么结束：从低于持续音量到声音消失的时间。用气或舌头停住就快，让气息慢慢收就慢。",
  },
  held: {
    en: "Whether the loudness holds, grows or dies away across the middle of the note.",
    zh: "音的中段音量是保持、变强还是变弱。",
  },
  pitch: {
    en: "The note, how far from equal temperament, how long the pitch takes to settle after the start, and how much it wavers while held.",
    zh: "音名、和平均律差多少音分、开始后多久音准稳定、持续时摆动多少。",
  },
  tone: {
    en: "Brightness is where the sound's energy sits among the overtones (higher is brighter). Breath is how much of the sound is air noise rather than tone. Both are most useful compared between your own notes.",
    zh: "明亮度是声音能量落在泛音的哪里（越高越亮）。气声是声音里有多少是气流噪声而不是乐音。这两个数最适合拿你自己的音互相比较。",
  },
} satisfies Record<string, Pair>;

export const meaning = (key: keyof typeof MEANS, zh: boolean) => pick(MEANS[key], zh);
