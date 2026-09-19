'use client';
import { useEffect, useRef, useState } from 'react';

const letters = 'CDEFGAB';
function parsePitch(value: string) {
  const match = /^([A-G])([♯♭]?)(\d)$/.exec(value);
  if (!match) throw new Error(`Invalid written pitch: ${value}`);
  const [,letter,accidental,octave] = match;
  return { key: `${letter.toLowerCase()}/${octave}`, accidental: accidental === '♯' ? '#' : accidental === '♭' ? 'b' : 'n', step: Number(octave)*7 + letters.indexOf(letter) };
}
/** One engraving implementation for the chart, embouchure, tool dock and trills. */
export function EngravedNote({ pitch, auxiliary, notation = 'quarter', width = 170, label }: {
  pitch: string; auxiliary?: string; notation?: 'quarter' | 'whole'; width?: number; label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const container = host.current!;
    import('vexflow').then(({default: Vex}) => {
      if (cancelled) return;
      const VF = Vex.Flow;
      const base = parsePitch(pitch), cuePitch = auxiliary ? parsePitch(auxiliary) : null;
      // Reserve room for ledger lines and the trill mark above high notes.
      const extra = Math.max(0, Math.max(base.step, cuePitch?.step ?? 0) - 38) * 5;
      const height = 165 + extra;
      container.replaceChildren();
      const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
      const engravingWidth = auxiliary ? 220 : 170;
      renderer.resize(engravingWidth, height);
      const context = renderer.getContext();
      const ink = getComputedStyle(container).color;
      context.setFillStyle(ink); context.setStrokeStyle(ink);
      const stave = new VF.Stave(8, 36 + extra, engravingWidth - 16);
      stave.addClef('treble').setContext(context).draw();
      const note = new VF.StaveNote({ keys: [base.key], duration: auxiliary ? 'h' : notation === 'whole' ? 'w' : 'q', stem_direction: base.step >= 34 ? -1 : 1 });
      if (base.accidental !== 'n') note.addAccidental(0, new VF.Accidental(base.accidental));
      if (cuePitch) {
        const cue = new VF.GraceNote({keys:[cuePitch.key],duration:'q',slash:false});
        cue.addAccidental(0, new VF.Accidental(cuePitch.accidental));
        note.addModifier(0, new VF.GraceNoteGroup([cue], false));
        note.addModifier(0, new VF.Ornament('tr').setPosition(VF.Modifier.Position.ABOVE));
      }
      const voice = new VF.Voice({num_beats: auxiliary ? 2 : notation === 'whole' ? 4 : 1, beat_value:4}).addTickables([note]);
      new VF.Formatter().joinVoices([voice]).formatToStave([voice],stave);
      voice.draw(context,stave);
      const svg = container.querySelector('svg');
      svg?.setAttribute('viewBox',`0 0 ${engravingWidth} ${height}`);
      svg?.setAttribute('aria-hidden','true');
      if (svg) { svg.style.width='100%'; svg.style.height='auto'; svg.style.display='block'; }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; container.replaceChildren(); };
  }, [pitch,auxiliary,notation]);
  return <div role="img" aria-label={label ?? (auxiliary ? `${pitch} trill to ${auxiliary}; small auxiliary note before the main note` : `${pitch} on the treble staff`)} style={{width,maxWidth:'100%'}}>
    <div ref={host}/>{failed && <span>Notation unavailable</span>}
  </div>;
}
