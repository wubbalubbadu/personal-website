// The room's music (Nov 17): the desk radio's lo-fi songs, and one song for
// each project on the laptop. Files go in public/audio/room/. Haylie picks the
// songs; until a slot has a file it stays silent (the radio says so).

export type Track = { title: string; src: string };

/** The radio's songs, in order. "Next song" steps through them and wraps. */
export const RADIO_TRACKS: Track[] = [
  // { title: "Song name · Artist", src: "/audio/room/radio-1.mp3" },
];

/** A project's own song while it's on the laptop's screen, by project slug
 *  (the slugs in app/lib/projects.ts). A project with none is quiet. */
export const PROJECT_MUSIC: Partial<Record<string, string>> = {
  // "cookie-flute-studio": "/audio/room/cookie-flute-studio.mp3",
  // "learning-log": "/audio/room/learning-log.mp3",
  // market: "/audio/room/market.mp3",
  // skuy: "/audio/room/skuy.mp3",
};

/** How loud the music sits under the cat's voice, 0 to 1. */
export const MUSIC_LEVEL = 0.35;
