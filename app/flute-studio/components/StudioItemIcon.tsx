import type {ReactNode} from "react";
import type {ExerciseFocus} from "../../../content/exercise-catalog";
import type {MusicItem} from "../../../content/music-library";

/**
 * The studio's one icon vocabulary, shared by the Exercises hub and the
 * Library.
 *
 * Two things used to go wrong. Each exercise row picked its own glyph
 * (◎ ♪ ♭ ⁝ ♩ ◌ ≈ ○ ‥), so the icon column read as decoration rather than
 * information — two technique exercises could look less alike than a
 * technique one and a tone one. And the Library drew a completely
 * different set (♩ ♫ 𝄞 ★) for the same items, so "Scale Studio" wore one
 * mark on one page and another on the next.
 *
 * Now there is exactly one mark per *kind of thing*: one per practice
 * focus (technique / tone / breathing / articulation) and one per kind of
 * library piece, picked from its tags (see iconKindFor). An exercise resolves to
 * its focus icon wherever it appears, so it looks the same on both pages.
 */
export type StudioIconKind=ExerciseFocus|"simple"|"repertoire"|"etude"|"pop"|"excerpt";

const paths:Record<StudioIconKind,ReactNode>={
  // Technique — an ascending run of notes: fingers moving through a scale.
  technique:<><path d="M4 18h16"/><path d="M6.5 18v-4M11 18V9.5M15.5 18v-6.5M20 18V5"/></>,
  // Tone — one sustained note radiating: a long tone held and projected.
  tone:<><circle cx="8" cy="12" r="3"/><path d="M13.5 8.5a5 5 0 0 1 0 7M17 6a9 9 0 0 1 0 12"/></>,
  // Breathing — air drawn into an expanding ring.
  breathing:<><circle cx="12" cy="12" r="7.5"/><path d="M12 8.5v7M8.5 12h7"/></>,
  // Articulation — separated notes: a beam over staccato dots.
  articulation:<><path d="M4 6h16"/><path d="M6 6v7M12 6v7M18 6v7"/><circle cx="6" cy="17.5" r="1.2"/><circle cx="12" cy="17.5" r="1.2"/><circle cx="18" cy="17.5" r="1.2"/></>,
  // Simple tune: one clear melody note on a short staff.
  simple:<><path d="M3 17h18M3 12h18"/><circle cx="10" cy="14.5" r="3"/><path d="M13 14.5V5"/></>,
  // Repertoire — a piece to perform: a single note with a phrase mark.
  repertoire:<><circle cx="8" cy="17" r="3"/><path d="M11 17V5l8-2v12"/><circle cx="16" cy="15" r="3"/></>,
  // Etude — a study: stacked lines of a printed page.
  etude:<><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h4"/></>,
  // Pop — a track: a record. Deliberately NOT a star; the save control in
  // the same row is a star, and two stars per row read as one control
  // twice rather than "a song you can save".
  pop:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/></>,
  // Orchestral excerpt: a short bracketed passage rather than a full work.
  excerpt:<><path d="M5 4H3v16h2M19 4h2v16h-2"/><circle cx="9" cy="15" r="2.4"/><path d="M11.4 15V7M11.4 8h5M16.4 8v5"/><circle cx="14" cy="13" r="2.4"/></>,
};

/**
 * Library rows wear one icon, picked from their tags. Tags are free text, so
 * this matches loosely and in priority order (an orchestral excerpt tagged
 * "Classical" too should still read as an excerpt); anything unrecognised,
 * like "Folk", gets the plain melody note.
 */
const tagIcons:[RegExp,StudioIconKind][]=[[/excerpt/,"excerpt"],[/etude|étude|study/,"etude"],[/pop|film|anime|game|musical/,"pop"],[/classical|repertoire|baroque|romantic/,"repertoire"]];
export function iconKindFor(item:Pick<MusicItem,"tags">):StudioIconKind{
  const tags=item.tags.map(tag=>tag.toLowerCase());
  return tagIcons.find(([pattern])=>tags.some(tag=>pattern.test(tag)))?.[1]??"simple";
}

/**
 * `className` carries the tint (the caller owns the palette so the hub's
 * rows and the Library's rows can keep their own sizing), the glyph itself
 * is identical in both.
 */
export function StudioItemIcon({kind,className}:{kind:StudioIconKind;className:string}){
  return <span className={`${className} ${className}--${kind}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>
  </span>;
}
