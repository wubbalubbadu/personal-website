import './count-in-pulse.css';
/** Audio-clock driven, zero-based beat. Hidden state keeps its layout space. */
export default function CountInPulse({beat,total=4,active=true,zh=false,groups=[]}:{beat:number;total?:number;active?:boolean;zh?:boolean;groups?:boolean[]}){
  return <div className="count-in-pulse" style={{visibility:active?'visible':'hidden'}} role="status" aria-hidden={!active} aria-label={active?(zh?`预备拍 ${beat+1}，共 ${total} 拍`:`Count in, beat ${beat+1} of ${total}`):undefined}>
    {Array.from({length:total},(_,i)=><i key={i} className={`${i===beat?'current':i<beat?'done':''}${groups[i]?' is-group':''}`}/>)}
  </div>;
}
