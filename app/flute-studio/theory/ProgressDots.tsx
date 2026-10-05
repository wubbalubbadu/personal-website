// A short row of dots that fill as an exercise goes on: progress without words (LESSONS.md, principle 8).
export default function ProgressDots({done,total,zh}:{done:number;total:number;zh:boolean}){
  return <span className="progress-dots" role="img" aria-label={zh?`已完成 ${done} / ${total}`:`${done} of ${total} done`}>
    {Array.from({length:total},(_,i)=><i key={i} className={i<done?'is-done':undefined}/>)}
  </span>;
}
