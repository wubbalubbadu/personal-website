import {noteName} from './poses';

export default function StaffNote({midi}:{midi:number}) {
  const degree=[0,0,1,1,2,3,3,4,4,5,5,6][midi%12];
  const octave=Math.floor(midi/12)-1;
  // E4 is the bottom treble staff line. Each diatonic step is half a space.
  const step=(octave-4)*7+degree-2;
  const y=120-step*6;
  const ledger:number[]=[];
  for(let n=-2;n>=step;n-=2)ledger.push(120-n*6);
  for(let n=10;n<=step;n+=2)ledger.push(120-n*6);
  const sharp=[1,3,6,8,10].includes(midi%12);
  return <svg viewBox="0 0 200 154" width="200" role="img" aria-label={`${noteName(midi)} on treble staff`} style={{maxWidth:'100%',overflow:'visible'}}>
    {[0,1,2,3,4].map(n=><line key={n} x1="14" x2="185" y1={120-n*12} y2={120-n*12} stroke="currentColor" strokeWidth="1"/>)}
    <text x="19" y="117" fontSize="64" fontFamily="serif">𝄞</text>
    {ledger.map(v=><line key={v} x1="108" x2="142" y1={v} y2={v} stroke="currentColor" strokeWidth="1.3"/>)}
    {sharp&&<text x="91" y={y+7} fontSize="23">♯</text>}
    <ellipse cx="125" cy={y} rx="9" ry="6" transform={`rotate(-18 125 ${y})`} fill="currentColor"/>
    <line x1={step>=4?117:133} x2={step>=4?117:133} y1={y} y2={y+(step>=4?35:-35)} stroke="currentColor" strokeWidth="1.5"/>
  </svg>;
}
