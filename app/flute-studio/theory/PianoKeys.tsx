'use client';
import type {KeyboardEvent} from 'react';

/**
 * The lessons' keyboard. White keys are 42 wide; a black key sits after C, D, F, G and A, as on a real piano. `low` and `high` are the MIDI numbers of the lowest and highest
 * WHITE keys shown. Letters go on white keys only; black keys are never labelled.
 * Its styles come from the `.sequence-keyboard` wrapper the caller provides (theory.css).
 */
export type KeyLight={midi:number;tone:'red'|'green'|'outline';/** Pulse once, to draw the eye to this key. */pulse?:boolean};
type Props={
  low:number;high:number;
  labels:boolean;
  /** Whether black keys can be tapped (lesson 1 keeps them as plain decoration). */
  blackPlayable:boolean;
  lit?:KeyLight[];
  /** A small arc over two keys (a half step). Passing it, even as null, reserves room above the keys. */
  arc?:[number,number]|null;
  onKey?:(midi:number)=>void;
  /** False when the keyboard is only a picture: not tappable, not focusable. */
  interactive?:boolean;
  zh:boolean;
};

const WHITE=[0,2,4,5,7,9,11],LETTER:Record<number,string>={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B'};
const hasBlackAfter=(midi:number)=>[0,2,5,7,9].includes(midi%12);
const NAMES:Record<number,string>={1:'C sharp or D flat',3:'D sharp or E flat',6:'F sharp or G flat',8:'G sharp or A flat',10:'A sharp or B flat'};
const NAMES_ZH:Record<number,string>={1:'升 C 或降 D',3:'升 D 或降 E',6:'升 F 或降 G',8:'升 G 或降 A',10:'升 A 或降 B'};
const toneClass=(tone?:KeyLight['tone'])=>tone==='red'?'is-key-active':tone==='green'?'is-key-right':tone==='outline'?'is-key-near':'';
const pulse=(lit:KeyLight[],midi:number)=>lit.find(l=>l.midi===midi)?.pulse?' is-key-pulse':'';

export default function PianoKeys({low,high,labels,blackPlayable,lit=[],arc,onKey,interactive=true,zh}:Props){
  const whites:number[]=[];
  for(let m=low;m<=high;m++)if(WHITE.includes(m%12))whites.push(m);
  const width=whites.length*42+14,tone=(midi:number)=>lit.find(l=>l.midi===midi)?.tone;
  const press=(midi:number)=>onKey?.(midi);
  const keyDown=(midi:number)=>(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();press(midi)}};
  const keyX=(midi:number)=>{
    const i=whites.indexOf(midi);
    if(i>=0)return i*42+27;
    const left=whites.indexOf(midi-1);
    return left*42+48;
  };
  const top=arc!==undefined?-26:0;
  return <svg viewBox={`0 ${top} ${width} ${105-top}`} role={interactive?'group':'img'} aria-label={zh?'钢琴键盘':'Piano keyboard'} style={interactive?undefined:{pointerEvents:'none'}}>
    {whites.map((midi,i)=><g key={midi} {...(interactive?{role:'button',tabIndex:0,onClick:()=>press(midi),onKeyDown:keyDown(midi)}:{'aria-hidden':true})} aria-label={`${LETTER[midi%12]}${Math.floor(midi/12)-1}`}>
      <rect x={i*42+7} y="2" width="41" height="98" rx="3" className={`${toneClass(tone(midi))||'white-key'}${pulse(lit,midi)}`}/>
      <text x={i*42+27} y="84">{labels?LETTER[midi%12]:''}</text>
    </g>)}
    {whites.map((midi,i)=>{
      const black=midi+1;
      if(!hasBlackAfter(midi)||i===whites.length-1)return null;
      const x=i*42+36,cls=`black-key ${toneClass(tone(black))}${pulse(lit,black)}`.trim();
      return blackPlayable&&interactive
        ?<g key={black} role="button" tabIndex={0} aria-label={zh?NAMES_ZH[black%12]:NAMES[black%12]} onClick={()=>press(black)} onKeyDown={keyDown(black)}><rect x={x} y="2" width="23" height="57" rx="2" className={cls}/></g>
        :<rect key={black} aria-hidden="true" x={x} y="2" width="23" height="57" rx="2" className={cls}/>;
    })}
    {arc&&<path className="piano-arc" aria-hidden="true" d={`M${keyX(arc[0])} -4Q${(keyX(arc[0])+keyX(arc[1]))/2} -26 ${keyX(arc[1])} -4`}/>}
  </svg>;
}
