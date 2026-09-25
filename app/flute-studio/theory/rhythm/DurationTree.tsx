import type {CSSProperties} from 'react';
import RhythmNote from './RhythmNote';
import {VALUES} from './rhythmModel';
export default function DurationTree({depth, selected, active, onSelect, zh}: {depth:number; selected:number; active:number; onSelect:(row:number)=>void; zh:boolean}) {
  const names = zh ? ['全音符','二分音符','四分音符','八分音符','十六分音符'] : ['Whole notes','Half notes','Quarter notes','Eighth notes','Sixteenth notes'];
  return <svg className="rhythm-tree" viewBox="0 0 1080 420" aria-label={zh?'音符时值关系图':'Note duration tree'}>
    {VALUES.slice(0, depth + 1).map((value, row) => {
      const count = 2 ** row, y = 52 + row * 84, scale = .75;
      return <g key={row} className="duration-tree-row" style={{'--row':row} as CSSProperties}>
        {row > 0 && Array.from({length:count / 2}, (_, parent) => {
          const left = 90 + (parent * 2 + .5) * 900 / count, right = left + 900 / count;
          return <path key={parent} className="duration-tree-branch" d={`M${(left+right)/2} ${y-75}V${y-68}M${left} ${y-63}V${y-68}H${right}V${y-63}`} fill="none" stroke="#b9362e" strokeWidth="1.6"/>;
        })}
        <g role="button" tabIndex={0} aria-label={`${zh?'听':'Listen to'} ${names[row]}`} onClick={() => onSelect(row)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(row)}}}>
          <rect x="55" y={y-60} width="970" height="78" rx="8" fill="transparent"/>
          {Array.from({length:count}, (_, i) => <g key={i} className="duration-tree-note" transform={`translate(${90+(i+.5)*900/count} ${y}) scale(${scale})`} color={selected===row&&active===i?'#b9362e':'#191919'}><RhythmNote value={value}/></g>)}
        </g>
      </g>;
    })}
  </svg>;
}
