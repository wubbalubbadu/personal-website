import {MUSIC_GLYPHS} from './musicGlyphs';
import type {NoteValue} from './rhythmModel';
export const STEM_X = 12.7;
export const STEM_HEIGHT = 84;
export default function RhythmNote({value, beamed = false, focus = '', down = false}: {value: NoteValue; beamed?: boolean; focus?: string; down?: boolean}) {
  const head = value === 4 ? MUSIC_GLYPHS.whole : value === 2 ? MUSIC_GLYPHS.half : MUSIC_GLYPHS.filled;
  const flag = value === .5 ? (down ? MUSIC_GLYPHS.eighthDown : MUSIC_GLYPHS.eighthUp) : (down ? MUSIC_GLYPHS.sixteenthDown : MUSIC_GLYPHS.sixteenthUp);
  const stemX = down ? -STEM_X : STEM_X, endY = down ? STEM_HEIGHT : -STEM_HEIGHT;
  return <g>
    <path d={head.path} transform={`translate(${-head.width * .032} 0) scale(.064 -.064)`} fill={focus === 'head' ? '#b9362e' : 'currentColor'}/>
    {value !== 4 && <path d={`M${stemX} ${down ? 3 : -3}V${endY}`} stroke={focus === 'stem' ? '#b9362e' : 'currentColor'} strokeWidth="2" fill="none"/>}
    {value < 1 && !beamed && <path d={flag.path} transform={`translate(${stemX} ${endY}) scale(.064 -.064)`} fill={focus === 'flag' ? '#b9362e' : 'currentColor'}/>}
  </g>;
}
