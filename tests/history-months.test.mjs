import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModule} from './helpers/ts-module.mjs';

// The pure half of lib/historyMonths.ts: grouping by local month, taking one month out, the words for a month.
// Its store modules are stubbed: only their key names are imported.
const m=await import(tsModule('app/flute-studio/lib/historyMonths.ts',{stubs:{
  '../practice-data':'export const sessionsKey="cookie:practice-sessions:v1";',
  './repLog':'export const REP_LOG_KEY="cookie:practice-reps:v1";',
  './tempoHistory':'export const TEMPO_HISTORY_KEY="cookie:tempo-history:v1";',
  './pitchHistory':'export const PITCH_HISTORY_KEY="cookie:pitch-history";export const PITCH_UPDATED="cookie:pitch-updated";',
}}));

const local=(y,mo,d,h=12,mi=0)=>new Date(y,mo-1,d,h,mi).getTime();
const session=(start,minutes=10)=>({startedAt:new Date(start).toISOString(),endedAt:new Date(start+minutes*60000).toISOString(),durationSeconds:minutes*60});

test('monthOf uses local time at both edges of a month', ()=>{
  assert.equal(m.monthOf(local(2026,10,31,23,59)),'2026-10');
  assert.equal(m.monthOf(local(2026,11,1,0,0)),'2026-11');
  assert.equal(m.monthOf(local(2026,12,31,23,59)),'2026-12');
  assert.equal(m.monthOf(local(2027,1,1,0,0)),'2027-01');
});

test('practice months: newest first, sessions, minutes, rep days and tempo days counted', ()=>{
  const rows=m.summarizeMonths('practice',{
    sessions:[session(local(2026,12,31,23,50),30),session(local(2027,1,2),15),session(local(2027,1,3),45)],
    reps:{'2026-12-30':{a:{reps:{x:3,y:2}}},'2027-01-02':{a:{reps:{x:1}}},'not-a-day':{a:{reps:{x:9}}}},
    tempos:{a:{days:{'2027-01-02':80,'2027-01-05':84}},b:{days:{'2027-01-02':60}}},
  });
  assert.deepEqual(rows.map(r=>r.month),['2027-01','2026-12']);
  const [jan,dec]=rows;
  assert.equal(jan.sessions,2);assert.equal(jan.minutes,60);
  assert.equal(dec.sessions,1);assert.equal(dec.minutes,30);
  assert.equal(dec.repDays,1);assert.equal(dec.reps,5);
  assert.equal(jan.repDays,1);assert.equal(jan.reps,1);
  // Jan 2 has two tempo lines but counts as one day.
  assert.equal(jan.tempoDays,2);
});

test('pitch months count notes and pitch lines', ()=>{
  const rows=m.summarizeMonths('pitch',{pitch:[{at:local(2026,11,3)},{at:local(2026,11,9)},{at:local(2026,10,1)}],traces:{'69':[{at:local(2026,11,3)}],'70':[{at:local(2026,10,2)},{}]}});
  assert.deepEqual(rows.map(r=>[r.month,r.notes,r.traces]),[['2026-11',2,1],['2026-10',1,1]]);
});

test('withoutMonth removes only that month and keeps the rest of every store', ()=>{
  const stores={
    sessions:[session(local(2026,10,5)),session(local(2026,11,5))],
    reps:{'2026-10-05':{a:{reps:{x:1}}},'2026-11-05':{a:{reps:{x:1}}}},
    tempos:{a:{days:{'2026-10-05':80,'2026-11-05':84}},b:{days:{'2026-10-06':60}}},
  };
  const out=m.withoutMonth('practice',stores,'2026-10');
  assert.equal(out.sessions.length,1);assert.equal(m.monthOf(Date.parse(out.sessions[0].startedAt)),'2026-11');
  assert.deepEqual(Object.keys(out.reps),['2026-11-05']);
  assert.deepEqual(out.tempos.a.days,{'2026-11-05':84});
  // A tempo line with nothing left goes entirely.
  assert.equal('b' in out.tempos,false);
  // The input is not changed.
  assert.equal(stores.sessions.length,2);
});

test('withoutMonth hands back the same object for a store it did not touch', ()=>{
  const stores={sessions:[session(local(2026,11,5))],reps:{'2026-11-05':{a:{reps:{x:1}}}},tempos:{}};
  const out=m.withoutMonth('practice',stores,'2026-10');
  assert.equal(out.sessions,stores.sessions);assert.equal(out.reps,stores.reps);assert.equal(out.tempos,stores.tempos);
});

test('withoutMonth keeps what came after `before`', ()=>{
  const cleared=local(2026,11,10);
  const out=m.withoutMonth('pitch',{pitch:[{at:local(2026,11,9)},{at:local(2026,11,20)}]},'2026-11',cleared);
  assert.deepEqual(out.pitch.map(p=>p.at),[local(2026,11,20)]);
});

test('undated entries are never removed', ()=>{
  const out=m.withoutMonth('pitch',{pitch:[{},{at:'x'},{at:local(2026,11,9)}],traces:{'69':[{},{at:local(2026,11,9)}]}},'2026-11');
  assert.equal(out.pitch.length,2);
  assert.equal(out.traces['69'].length,1);
});

test('the words for a month', ()=>{
  const row={month:'2026-10',sessions:12,minutes:200,repDays:1,reps:4,tempoDays:0,notes:0,traces:0};
  assert.equal(m.monthSummary(row),'12 sessions, 3 h 20 min, 1 day of repetitions');
  assert.equal(m.monthSummary(row,true),'12 次练习、3 小时 20 分钟、1 天的重复次数');
  assert.equal(m.formatMinutes(0.2),'');assert.equal(m.formatMinutes(45),'45 min');assert.equal(m.formatMinutes(120),'2 h');
  assert.equal(m.monthLabel('2026-10'),'October 2026');
  assert.match(m.monthLabel('2027-01',true),/2027.*1/);
  for(const text of [m.monthSummary(row),m.monthSummary(row,true)])assert.doesNotMatch(text,/[–—]/);
});
