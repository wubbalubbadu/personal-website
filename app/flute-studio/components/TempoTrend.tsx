"use client";
import {ReaderPopover} from "./ReaderPopover";
import {useTempoHistory,tempoPoints,hasTrend,type TempoPoint} from "../lib/tempoHistory";
import "./tempo-trend.css";

/** "Sep 30" / "9月30日" for a local "YYYY-MM-DD". */
export function shortDay(day:string,zh:boolean){
  const [y,m,d]=day.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString(zh?"zh-CN":"en-US",{month:"short",day:"numeric"});
}

/**
 * A tempo over the weeks (COMPONENTS.md): one line in the tempo pill's blue, a dot per practised day, spaced by date,
 * the first and latest numbers written at the ends. No axes or grid: it answers "am I getting faster", nothing more.
 * `small` is the inline version for a list row.
 */
export function TempoTrend({points,zh,small=false}:{points:TempoPoint[];zh:boolean;small?:boolean}){
  if(points.length<2)return null;
  const width=small?96:300,height=small?26:84,padX=small?3:22,padY=small?4:16;
  const span=Math.max(1,dayIndex(points.at(-1)!.day)-dayIndex(points[0].day));
  const low=Math.min(...points.map(p=>p.bpm)),high=Math.max(...points.map(p=>p.bpm)),range=Math.max(1,high-low);
  const at=(p:TempoPoint)=>({x:padX+(dayIndex(p.day)-dayIndex(points[0].day))/span*(width-2*padX),y:high===low?height/2:padY+(high-p.bpm)/range*(height-2*padY)});
  const xy=points.map(at),first=points[0],last=points.at(-1)!;
  const label=zh?`${shortDay(first.day,zh)} 为 ${first.bpm}，最近为 ${last.bpm}`:`${first.bpm} on ${shortDay(first.day,zh)}, ${last.bpm} most recently`;
  return <svg className={small?"tempo-trend tempo-trend--small":"tempo-trend"} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
    <polyline points={xy.map(p=>`${p.x},${p.y}`).join(" ")}/>
    {!small&&xy.map((p,i)=><circle key={points[i].day} cx={p.x} cy={p.y} r={i===xy.length-1?3.5:2.5}/>)}
    {small&&<circle cx={xy.at(-1)!.x} cy={xy.at(-1)!.y} r={2.5}/>}
    {!small&&<><text x={xy[0].x} y={xy[0].y-7} textAnchor="middle">{first.bpm}</text><text className="tempo-trend__last" x={xy.at(-1)!.x} y={xy.at(-1)!.y-7} textAnchor="middle">{last.bpm}</text></>}
  </svg>;
}
function dayIndex(day:string){const [y,m,d]=day.split("-").map(Number);return Math.round(new Date(y,m-1,d).getTime()/86400000)}

/** The words under a trend: how far you have come, warmly, and how it got recorded. */
export function trendCaption(points:TempoPoint[],zh:boolean){
  const first=points[0],last=points.at(-1)!,since=shortDay(first.day,zh);
  const best=Math.max(...points.map(p=>p.bpm));
  const headline=last.bpm>first.bpm
    ?(zh?`从 ${since} 的 ${first.bpm} 到现在的 ${last.bpm}，一点点快起来了。`:`From ${first.bpm} on ${since} to ${last.bpm} now. It is coming along.`)
    :(zh?`${since} 以来，你练到的最快速度是 ${best}。`:`Since ${since} your best has been ${best}.`);
  const how=zh?"每天记下你的最快速度：计一次数，或跟着播放练一会儿，就会自动记下。":"Each day keeps your fastest tempo. Counting a rep, or playing along for a little while, saves it for you.";
  return {headline,how};
}

/**
 * The tempo pill's history button (only once there are two days to compare) and its popover with the trend.
 * `historyKey` is the thing's tempo-history key, the same as its RepPill key.
 */
export function TempoHistoryButton({historyKey,title,zh}:{historyKey:string;title:string;zh:boolean}){
  const points=tempoPoints(useTempoHistory()[historyKey]);
  if(!hasTrend(points))return null;
  const {headline,how}=trendCaption(points,zh);
  return <ReaderPopover className="tempo-pill__trend has-tip" label={zh?`${title}：速度变化`:`${title}: tempo over the weeks`} panelClassName="tempo-trend-panel"
    trigger={<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2 12.5 6 8l3 2.5L14 4"/><path d="M10.5 4H14v3.5"/></svg>}>
    <div className="tempo-trend-panel__body">
      <TempoTrend points={points} zh={zh}/>
      <p className="tempo-trend-panel__dates"><span>{shortDay(points[0].day,zh)}</span><span>{shortDay(points.at(-1)!.day,zh)}</span></p>
      <p className="tempo-trend-panel__headline">{headline}</p>
      <p className="tempo-trend-panel__how">{how}</p>
    </div>
  </ReaderPopover>;
}

/** The same trend as a section of a settings popover (the reader's tempo ▾ menu): only once there are two days. */
export function TempoTrendSection({historyKey,zh}:{historyKey:string;zh:boolean}){
  const points=tempoPoints(useTempoHistory()[historyKey]);
  if(!hasTrend(points))return null;
  const {headline,how}=trendCaption(points,zh);
  return <div className="reader-setting-row tempo-trend-section"><div className="reader-row-head"><span>{zh?"速度变化":"Your tempo over the weeks"}</span></div>
    <div className="tempo-trend-panel__body">
      <TempoTrend points={points} zh={zh}/>
      <p className="tempo-trend-panel__dates"><span>{shortDay(points[0].day,zh)}</span><span>{shortDay(points.at(-1)!.day,zh)}</span></p>
      <p className="tempo-trend-panel__headline">{headline}</p>
      <p className="tempo-trend-panel__how">{how}</p>
    </div>
  </div>;
}
