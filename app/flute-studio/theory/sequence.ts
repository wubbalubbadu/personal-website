export type Clef = 'treble';
export type DiagramNote={id:string;position:number;x:number;clef:Clef;ghost?:boolean;delay?:number};
export function notationPitch(position:number){
  const d=30+position, names=['C','D','E','F','G','A','B'], offsets=[0,2,4,5,7,9,11];
  const index=((d%7)+7)%7,octave=Math.floor(d/7);
  return {name:names[index],octave,midi:12*(octave+1)+offsets[index]};
}
export function sceneNotes(step:number):DiagramNote[]{
  const note=(position:number,x:number,clef:Clef='treble',ghost=false,delay=0):DiagramNote=>({id:`${clef}-${position}`,position,x,clef,ghost,delay});
  if(step===3)return [note(0,330),note(1,550)];
  if(step>=4&&step<=6)return Array.from({length:8},(_,i)=>note(i,200+i*65,'treble',false,i*550));
  if(step>=10&&step<=17){
    const count=step===10?1:step===11?2:step===12?3:step===13?4:10;
    const notes=Array.from({length:count},(_,i)=>note(step>=14?i:i+2,190+i*61,'treble',false,step===14&&i>=4?(i-4)*180:0));
    if(step>=15)notes.push(note(10,828,'treble',step<17));
    return notes;
  }
  if(step===18)return [2,1,0,-1,-2].map((p,i)=>note(p,240+i*132,'treble',false,i*140));
  if(step===19)return [note(-2,360),note(5,640)];
  return [];
}
