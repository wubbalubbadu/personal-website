'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FluteDiagram } from '../components/FluteDiagram';
import { fluteKeys, type FluteKeyId } from '../../../content/fingerings/keys';
import { trills, trillPitches, movingKeys, trillRegisters, trillRegisterFor, sourceForTrill, type Trill } from '../../../content/fingerings/trills';
import { useLanguage } from '../i18n/LanguageContext';
import TrillNotation from './TrillNotation';
import '../fingerings/fingerings.css';
import './trills.css';

function Pitch({ value }: { value: string }) { return <>{value.slice(0,-1)}<sub>{value.slice(-1)}</sub></>; }
function TrillRow({ trill, zh }: { trill: Trill; zh: boolean }) {
  const [variant, setVariant] = useState(0);
  const fingering = variant ? trill.alternatives![variant-1] : trill;
  const [playing, setPlaying] = useState(false);
  const [upper, setUpper] = useState(false);
  const [inspected, setInspected] = useState<FluteKeyId | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { setReduced(media.matches); if (media.matches) setPlaying(false); };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setUpper(value => !value), 650);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', hide); };
  }, [playing]);
  const moving = movingKeys(fingering);
  const down = upper ? fingering.upperKeys : fingering.lowerKeys;
  const key = fluteKeys.find(k => k.id === inspected);
  const names = moving.map(id => { const key = fluteKeys.find(k => k.id === id)!; return zh ? key.zh : key.label; }).join(zh ? '、' : ', ');
  return <section className="trill-row" aria-label={zh ? (trill.interval === 1 ? '半音颤音' : '全音颤音') : (trill.interval === 1 ? 'Half-step trill' : 'Whole-step trill')}>
    <div className="trill-row__score"><TrillNotation base={trill.base} upper={trill.upper}/></div>
    <div className="trill-row__detail">
      <p className="trill-row__interval">{zh ? (trill.interval === 1 ? '半音' : '全音') : (trill.interval === 1 ? 'Half step' : 'Whole step')}</p>
      <h2><Pitch value={trill.base}/><span className="trill-row__between"> ↔ </span><Pitch value={trill.upper}/></h2>
      {!trill.unavailable && <div className="trill-row__controls">
        <button type="button" className="trill-row__animate" onClick={() => { setUpper(false); setPlaying(!playing); }} disabled={reduced} aria-pressed={playing}>{playing ? (zh ? '暂停' : 'Pause') : (zh ? '演示' : 'Animate')}</button>
        <div className="trill-row__states" role="group" aria-label={zh ? '查看单个指法' : 'Inspect each fingering'}>
          {[false,true].map(state => <button type="button" key={String(state)} aria-pressed={upper === state} onClick={() => { setPlaying(false); setUpper(state); }}><Pitch value={state ? trill.upper : trill.base}/></button>)}
        </div>
      </div>}
      {trill.alternatives && <details className="trill-row__alternatives"><summary>{zh ? '其他指法' : 'Other fingerings'}</summary>
        <div className="fingering-chart__variants" role="group" aria-label={zh ? '指法版本' : 'Fingering version'}>{[zh ? '主要指法' : 'Primary', ...trill.alternatives.map(v => zh ? v.zhLabel : v.label)].map((name,i) => <button type="button" key={name} className={variant === i ? 'selected' : ''} aria-pressed={variant === i} onClick={() => {setVariant(i);setPlaying(false);setUpper(false);setInspected(null);}}>{name}</button>)}</div>
      </details>}
      {fingering.requires && <p className="fingering-chart__requires">{fingering.requires === 'b-foot' ? (zh ? '需要 B 尾管' : 'Requires B foot') : (zh ? 'C 尾管版本' : 'C-foot version')}</p>}
      {fingering.harmonic && <p className="fingering-chart__requires">{zh ? '泛音指法' : 'Harmonic fingering'}</p>}
      {reduced && !trill.unavailable && <p className="trill-row__hint">{zh ? '减少动态效果已开启，请点选音名查看。' : 'Reduced motion: select either note to inspect.'}</p>}
    </div>
    <div className="trill-row__fingering">
      {trill.unavailable ? <p className="trill-row__unavailable">{zh ? trill.zhUnavailable : trill.unavailable}</p> : <>
        <FluteDiagram pressed={down} moving={moving} inspectable onInspect={setInspected} hasBFoot={fingering.requires !== "c-foot"} className="trill-diagram"/>
        {fingering.note && <p className="trill-row__hint">{zh ? fingering.zhNote : fingering.note}</p>}
        <p className="trill-row__movement">{zh ? '交替按下与放开：' : 'Press and release: '}{names}{moving.length > 1 ? (zh ? '（同时）' : ' together') : ''}.</p>
        <p className="trill-row__key-name" aria-live="polite">{key ? `${zh ? key.zh : key.label}${moving.includes(key.id) ? (zh ? ' · 颤动键' : ' · Moving key') : ''}` : (zh ? '悬停或点选按键，查看名称。' : 'Hover or tap a key for its name.')}</p>
      </>}
    </div>
  </section>;
}
export default function TrillChart() {
  const { lang } = useLanguage(); const zh = lang === 'zh';
  const query = useSearchParams();
  const requested = query.get('note') ?? '';
  const [selection, setSelection] = useState<string | null>(null);
  const pitch = selection ?? (trillPitches.includes(requested) ? requested : 'D4');
  return <main className="fingering-chart trill-chart"><div className="fingering-chart__content">
    <header className="fingering-chart__header">
      <p>{zh ? '练习工具' : 'Practice tools'}</p><h1>{zh ? '颤音指法表' : 'Trill chart'}</h1>
      <p className="fingering-chart__intro">{zh ? '选择本音，对照半音与全音颤音。红色标记需要交替按放的键；实心表示按下，空心表示放开。' : 'Choose a base note. Compare half-step and whole-step trills. Red keys move; filled means pressed, outlined means released.'}</p>
      <Link className="fingering-chart__sibling" href={`/flute-studio/fingerings?note=${encodeURIComponent(pitch)}`}>{zh ? '指法表' : 'Fingering chart'} →</Link>
    </header>
    <div className="trill-chart__results">{trills.filter(t => t.base === pitch).map(t => <TrillRow key={`${pitch}-${t.interval}`} trill={t} zh={zh}/>)}</div>
    <div className="trill-chart__registers">{trillRegisters.map(register => <section key={register.id} className="fingering-chart__register trill-chart__selector" aria-label={zh ? register.zh : register.en}>
      <h3>{zh ? register.zh : register.en}</h3>
      <div className="fingering-chart__notes">{trillPitches.filter(p => trillRegisterFor(p).id === register.id).map(p => <button type="button" key={p} className={p === pitch ? 'selected' : ''} aria-pressed={p === pitch} onClick={() => setSelection(p)}><Pitch value={p}/></button>)}</div>
    </section>)}</div>

    <p className="fingering-chart__note">{zh ? '收录 B₃ 至 G₇ 的半音与全音颤音。未收录或需要特殊技巧的组合已明确标注；高音区的音准和响应因乐器而异。' : 'Half-step and whole-step trills from B₃ through G₇. Missing fingerings and special techniques are marked. Upper-register tuning and response vary by instrument.'} <a href={sourceForTrill(pitch)} target="_blank" rel="noreferrer">{zh ? '参考：Woodwind Fingering Guide' : 'Source: Woodwind Fingering Guide'}</a></p>
  </div></main>;
}
