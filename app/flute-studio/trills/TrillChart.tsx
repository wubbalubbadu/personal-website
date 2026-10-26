'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FluteDiagram } from '../components/FluteDiagram';
import { useTouchScreen } from '../lib/pencilMode';
import { fluteKeys, type FluteKeyId } from '../../../content/fingerings/keys';
import { fluteFingerings, midiForPitch } from '../../../content/fingerings/flute';
import { trills, trillPitches, movingKeys, trillRegisters, trillRegisterFor, sourceForTrill, type Trill } from '../../../content/fingerings/trills';
import { useLanguage } from '../i18n/LanguageContext';
import { NotePicker, PitchName, nearestSameName, staffStep } from '../fingerings/NotePicker';
import TrillNotation from './TrillNotation';
import '../fingerings/fingerings.css';
import './trills.css';

/**
 * The trill chart. The same frame as the fingering chart: the trills on one
 * note, then an octave switch and that octave's notes. Wider screens show the
 * half-step and whole-step trills side by side; a phone shows one, chosen by
 * a switch, so the notation can be large and nothing scrolls.
 */
const SHORT: [string, string][] = [['First', '第一'], ['Second', '第二'], ['Third', '第三'], ['Fourth', '第四']];
const intervalName = (interval: 1 | 2, zh: boolean) => zh ? (interval === 1 ? '半音' : '全音') : (interval === 1 ? 'Half step' : 'Whole step');

function TrillRow({ trill, zh, highestStep, phoneHidden }: { trill: Trill; zh: boolean; highestStep: number; phoneHidden: boolean }) {
  // Phones and iPads can't hover, so the hint only says tap there.
  const touch = useTouchScreen();
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
  return <section className="trill-row" data-phone-hidden={phoneHidden || undefined} aria-label={zh ? `${intervalName(trill.interval, zh)}颤音` : `${intervalName(trill.interval, zh)} trill`}>
    <TrillNotation base={trill.base} upper={trill.upper} highestStep={highestStep}/>
    <div className="trill-row__detail">
      <p className="trill-row__interval">{intervalName(trill.interval, zh)}</p>
      <h2><PitchName value={trill.base}/><span className="trill-row__between"> ↔ </span><PitchName value={trill.upper}/></h2>
      {!trill.unavailable && <div className="trill-row__controls">
        <button type="button" className="trill-row__animate" onClick={() => { setUpper(false); setPlaying(!playing); }} disabled={reduced} aria-pressed={playing}>{playing ? (zh ? '暂停' : 'Pause') : (zh ? '演示' : 'Animate')}</button>
        <div className="view-switch trill-row__states" role="group" aria-label={zh ? '查看单个指法' : 'Inspect each fingering'}>
          {[false,true].map(state => <button type="button" key={String(state)} aria-pressed={upper === state} onClick={() => { setPlaying(false); setUpper(state); }}><PitchName value={state ? trill.upper : trill.base}/></button>)}
        </div>
      </div>}
      {trill.alternatives && <div className="chart-choices" role="group" aria-label={zh ? '指法版本' : 'Fingering version'}>
        {[zh ? '主要指法' : 'Primary', ...trill.alternatives.map(v => zh ? v.zhLabel : v.label)].map((name,i) => <button type="button" key={name} aria-pressed={variant === i} onClick={() => {setVariant(i);setPlaying(false);setUpper(false);setInspected(null);}}>{name}</button>)}
      </div>}
      {fingering.requires && <p className="chart-now__requires">{fingering.requires === 'b-foot' ? (zh ? '需要 B 尾管' : 'Needs a B foot') : (zh ? 'C 尾管版本' : 'C-foot version')}</p>}
      {fingering.harmonic && <p className="chart-now__requires">{zh ? '泛音指法' : 'Harmonic fingering'}</p>}
      {reduced && !trill.unavailable && <p className="trill-row__hint">{zh ? '减少动态效果已开启，请点选音名查看。' : 'Reduced motion: select either note to inspect.'}</p>}
    </div>
    <div className="trill-row__fingering">
      {trill.unavailable ? <p className="trill-row__unavailable">{zh ? trill.zhUnavailable : trill.unavailable}</p> : <>
        <FluteDiagram pressed={down} moving={moving} inspectable onInspect={setInspected} hasBFoot={fingering.requires !== "c-foot"} className="trill-diagram"/>
        <p className="trill-row__movement">{zh ? '交替按下与放开：' : 'Press and release: '}{names}{moving.length > 1 ? (zh ? '（同时）' : ' together') : ''}.</p>
        {fingering.note && <p className="trill-row__hint">{zh ? fingering.zhNote : fingering.note}</p>}
        <p className="trill-row__key-name" aria-live="polite">{key ? `${zh ? key.zh : key.label}${moving.includes(key.id) ? (zh ? ' · 颤动键' : ' · Moving key') : ''}` : (touch ? (zh ? '点选按键，查看名称。' : 'Tap a key for its name.') : (zh ? '悬停或点选按键，查看名称。' : 'Hover or tap a key for its name.'))}</p>
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
  // Phones: which of the two trills is shown.
  const [shownInterval, setShownInterval] = useState<1 | 2>(1);
  const register = trillRegisterFor(pitch);
  const octaveNotes = trillPitches.filter(p => trillRegisterFor(p).id === register.id);
  const octaveTrills = trills.filter(t => trillRegisterFor(t.base).id === register.id);
  const highest = Math.max(...octaveTrills.flatMap(t => [staffStep(t.base), staffStep(t.upper)]));
  const shown = trills.filter(t => t.base === pitch);
  const phoneInterval = shown.some(t => t.interval === shownInterval) ? shownInterval : shown[0]?.interval;
  const midi = midiForPitch(pitch);
  const fingeringNote = fluteFingerings.find(n => midiForPitch(n.pitch) === midi);
  // Another octave shows the same note there, or the octave's lowest.
  const pickOctave = (id: string) => {
    const notes = trillPitches.filter(p => String(trillRegisterFor(p).id) === id);
    setSelection(nearestSameName(notes, pitch));
  };

  return <main className="fingering-chart trill-chart"><div className="fingering-chart__content">
    <header className="fingering-chart__header">
      <h1>{zh ? '颤音指法表' : 'Trill chart'}</h1>
    </header>
    <section className="trill-now" aria-live="polite">
      {shown.length > 1 && <div className="view-switch trill-now__intervals" role="group" aria-label={zh ? '颤音音程' : 'Trill interval'}>
        {shown.map(t => <button type="button" key={t.interval} aria-pressed={t.interval === phoneInterval} onClick={() => setShownInterval(t.interval)}>{intervalName(t.interval, zh)}</button>)}
      </div>}
      <div className="trill-now__rows">
        {shown.map(t => <TrillRow key={`${pitch}-${t.interval}`} trill={t} zh={zh} highestStep={highest} phoneHidden={t.interval !== phoneInterval}/>)}
      </div>
      {fingeringNote && <Link className="chart-now__sibling" href={`/flute-studio/fingerings?note=${encodeURIComponent(fingeringNote.pitch)}`}>
        {zh ? <><PitchName value={pitch}/> 的指法</> : <>Fingering for <PitchName value={pitch}/></>}
      </Link>}
    </section>
    <NotePicker
      zh={zh}
      octaves={trillRegisters.map((r, i) => ({ id: String(r.id), label: SHORT[i][zh ? 1 : 0], title: zh ? r.zh : r.en }))}
      octave={String(register.id)}
      onOctave={pickOctave}
      notes={octaveNotes.map(p => ({ pitch: p, label: <PitchName value={p}/> }))}
      selected={pitch}
      onSelect={setSelection}
    />
    <p className="chart-footnote trill-chart__footnote">{zh ? '收录 B₃ 至 G₇ 的半音与全音颤音。未收录或需要特殊技巧的组合已明确标注；高音区的音准和响应因乐器而异。' : 'Half-step and whole-step trills from B₃ through G₇. Missing fingerings and special techniques are marked. Upper-register tuning and response vary by instrument.'} <a href={sourceForTrill(pitch)} target="_blank" rel="noreferrer">{zh ? '参考：Woodwind Fingering Guide' : 'Source: Woodwind Fingering Guide'}</a></p>
  </div></main>;
}
