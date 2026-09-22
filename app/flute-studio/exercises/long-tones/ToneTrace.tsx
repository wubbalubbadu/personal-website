'use client';
import { centsFromMidi } from '../../lib/pitch';
import { toneSummary, type ToneAttempt } from '../../lib/toneSession';

const W = 900, H = 200;
const y = (c: number, span: number) => H / 2 - c / span * (H / 2 - 14);
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(0)}`;
export function ToneTrace({attempts, zh=false}: {attempts: ToneAttempt[]; zh?:boolean}) {
  if (!attempts.length) return <div className="tone-analysis-empty">{zh?'吹奏后，音准轨迹将显示在这里。':'Your pitch trace will appear here as you play.'}</div>;
  const first = attempts[0].startedAt;
  const end = Math.max(...attempts.map(a=>a.endedAt ?? a.frames.at(-1)?.at ?? a.startedAt));
  const duration = Math.max(4000, Math.ceil((end-first)/4000)*4000);
  const allCents = attempts.flatMap(a=>a.frames.map(f=>Math.abs(centsFromMidi(f.hz,a.target.midi))));
  const span = Math.max(50, Math.ceil(Math.max(0,...allCents)/50)*50);
  const x = (at:number) => (at-first)/duration*W;
  const latest = attempts.at(-1)!;
  const summary = toneSummary(latest);
  const gradeLabel = summary.grade === 'uncertain' ? (zh?'数据不足':'Not enough reliable data')
    : summary.grade === 'green' ? (zh?'音准较稳':'Pitch stayed close')
    : summary.grade === 'amber' ? (zh?'建议检查':'Worth reviewing') : (zh?'值得关注':'Needs attention');
  return <section className="tone-analysis" aria-label={zh?'音准分析':'Pitch analysis'}>
    <div className="tone-analysis-heading"><strong>{zh?'音准轨迹':'Pitch over time'}</strong><span>{zh?'相对谱面音高':'Relative to written pitch'}</span></div>
    <div className="tone-plot-wrap">
      <div className="tone-axis"><span>+{span}¢</span><span>0</span><span>−{span}¢</span></div>
      <svg className="tone-plot" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={zh?'横轴为秒，纵轴为音分':'Pitch deviation in cents over elapsed seconds'}>
        <rect x="0" y={y(10,span)} width={W} height={y(-10,span)-y(10,span)} className="tone-plot-band"/>
        <line x1="0" y1={H/2} x2={W} y2={H/2} className="tone-plot-zero"/>
        {attempts.map(a=>{
          let last = -Infinity;
          const d = a.frames.map(f=>{const move=f.at-last>140;last=f.at;return `${move?'M':'L'}${x(f.at).toFixed(2)},${y(centsFromMidi(f.hz,a.target.midi),span).toFixed(2)}`}).join(' ');
          return <g key={a.id}><line x1={x(a.startedAt)} x2={x(a.startedAt)} y1="0" y2={H} className="tone-plot-divider"/><path d={d} className="tone-plot-line"/></g>;
        })}
      </svg>
    </div>
    <div className="tone-time-axis">{[0,1,2,3,4].map(n=><span key={n}>{(duration*n/4000).toFixed(0)}s</span>)}</div>
    <p className={`tone-result-label grade-${summary.grade}`}>{gradeLabel}</p>
    <div className="tone-analysis-stats"><span><b>{latest.target.pitch}</b> {((summary.duration)/1000).toFixed(1)}s</span><span>{zh?'中心':'Center'} <b>{signed(summary.center)}¢</b></span><span>{zh?'末尾变化':'Ending change'} <b>{signed(summary.drift)}¢</b></span>{!summary.reliable&&<span>{zh?'数据较少':'Limited data'}</span>}</div>
    <div className="tone-trace-legend">{attempts.map(a=><span key={a.id}>{a.target.pitch} <b>{(toneSummary(a).duration/1000).toFixed(1)}s</b></span>)}</div>
  </section>;
}
