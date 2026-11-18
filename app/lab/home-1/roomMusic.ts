// Plays the room's music: the desk radio, and a project's own song while it's
// on the laptop (which pauses the radio and hands back to it after). Each
// player runs through the cat's shared AudioContext, so the level and the
// fades also work on an iPhone (Safari ignores <audio>.volume).
import { unlockAudio } from "../../components/ps1-mascot/animalese";
import { MUSIC_LEVEL, PROJECT_MUSIC, RADIO_TRACKS } from "../_kit/radio";

const FADE = 0.6; // seconds

type Player = { el: HTMLAudioElement; gain: GainNode | null };

export function createRoomMusic() {
  let radioOn = false;
  let index = 0;
  let muted = false;
  let project: string | null = null; // the slug on the laptop, while zoomed in

  const make = (): Player => {
    const el = new Audio();
    el.preload = "none";
    return { el, gain: null };
  };
  const radio = make();
  const song = make();
  song.el.loop = true;
  // a song that ends hands on to the next one
  radio.el.addEventListener("ended", () => {
    index = (index + 1) % RADIO_TRACKS.length;
    radio.el.src = RADIO_TRACKS[index].src;
    if (audible("radio")) void radio.el.play().catch(() => {});
  });

  /** Joins a player to the shared context the first time it plays. */
  const wire = (p: Player) => {
    const ctx = unlockAudio();
    if (!ctx || p.gain) return ctx;
    p.gain = ctx.createGain();
    p.gain.gain.value = 0;
    ctx.createMediaElementSource(p.el).connect(p.gain).connect(ctx.destination);
    return ctx;
  };
  const fadeIn = (p: Player) => {
    const ctx = wire(p);
    if (!p.el.src) return;
    void p.el.play().catch(() => {});
    if (ctx && p.gain) {
      p.gain.gain.cancelScheduledValues(ctx.currentTime);
      p.gain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, FADE / 3);
    } else p.el.volume = MUSIC_LEVEL;
  };
  const fadeOut = (p: Player) => {
    const ctx = unlockAudio();
    if (ctx && p.gain) {
      p.gain.gain.cancelScheduledValues(ctx.currentTime);
      p.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    }
    window.setTimeout(() => {
      // only if nothing turned it back up meanwhile
      if (!p.gain || p.gain.gain.value < 0.02) p.el.pause();
    }, FADE * 1000 + 100);
  };

  /** Which player should be heard right now. */
  const audible = (who: "radio" | "song") => {
    if (muted) return false;
    const projectSrc = project ? PROJECT_MUSIC[project] : undefined;
    if (who === "song") return Boolean(projectSrc);
    return radioOn && !projectSrc;
  };
  const sync = () => {
    (audible("radio") ? fadeIn : fadeOut)(radio);
    (audible("song") ? fadeIn : fadeOut)(song);
  };

  return {
    /** Whether the radio has any songs yet. */
    hasSongs: () => RADIO_TRACKS.length > 0,
    isOn: () => radioOn,
    index: () => index,
    /** The song on now (or about to be), for the cat to name. */
    current: () => RADIO_TRACKS[index],
    /** Turns the radio on at the song it was on. */
    on() {
      if (!RADIO_TRACKS.length) return;
      radioOn = true;
      if (!radio.el.src) radio.el.src = RADIO_TRACKS[index].src;
      sync();
    },
    next() {
      if (!RADIO_TRACKS.length) return;
      index = (index + 1) % RADIO_TRACKS.length;
      radio.el.src = RADIO_TRACKS[index].src;
      radioOn = true;
      sync();
    },
    off() {
      radioOn = false;
      sync();
    },
    /** The laptop is showing this project (null: stepped away from the laptop). */
    showProject(slug: string | null) {
      if (slug === project) return;
      project = slug;
      const src = slug ? PROJECT_MUSIC[slug] : undefined;
      if (src && !song.el.src.endsWith(src)) {
        song.el.src = src;
        song.el.currentTime = 0;
      }
      sync();
    },
    /** Follows the page's sound switch. */
    setMuted(m: boolean) {
      muted = m;
      sync();
    },
    dispose() {
      radio.el.pause();
      song.el.pause();
    },
  };
}

export type RoomMusic = ReturnType<typeof createRoomMusic>;
