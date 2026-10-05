import {tallyGroups} from "../lib/tallyLog";

/** Tally marks as drawn on paper: four upright sticks and a fifth across them. */
export default function TallySticks({count}:{count:number}){
  const groups=tallyGroups(count);
  if(!groups.length)return <div className="tally-sticks tally-sticks--empty" aria-hidden="true"/>;
  return <div className="tally-sticks" role="img" aria-label={`${count}`}>
    {groups.map((group,index)=><svg key={index} viewBox="0 0 34 30" width="34" height="30" aria-hidden="true">
      {Array.from({length:Math.min(4,group.sticks)},(_,stick)=><line key={stick} x1={5+stick*8} x2={5+stick*8} y1="3" y2="27"/>)}
      {group.crossed&&<line x1="1" x2="33" y1="24" y2="6"/>}
    </svg>)}
  </div>;
}
