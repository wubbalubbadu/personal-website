import type { FluteKeyId } from './keys';

export const TRILL_SOURCE = 'https://www.wfg.woodwind.org/flute/fl_tr2_1.html';
export type TrillVariant = {
  label: string; zhLabel: string; lowerKeys: FluteKeyId[]; upperKeys: FluteKeyId[];
  note?: string; zhNote?: string; requires?: 'b-foot' | 'c-foot'; harmonic?: boolean;
};
export type Trill = {
  base: string;
  upper: string;
  interval: 1 | 2;
  lowerKeys: FluteKeyId[];
  upperKeys: FluteKeyId[];
  unavailable?: string;
  zhUnavailable?: string;
  note?: string;
  zhNote?: string;
  requires?: 'b-foot' | 'c-foot';
  harmonic?: boolean;
  alternatives?: TrillVariant[];
};
const keys = (value: string) => value.split(' ').filter(Boolean) as FluteKeyId[];
// Explicit states transcribed from WFG's red-key instructions, not the
// single-note chart. Extra held keys are intentional trill fingerings.
const trill = (base: string, upper: string, interval: 1 | 2, lower: string, higher: string): Trill =>
  ({ base, upper, interval, lowerKeys: keys(lower), upperKeys: keys(higher) });
const unavailable = (base: string, upper: string, interval: 1 | 2, en: string, zh: string): Trill =>
  ({ base, upper, interval, lowerKeys: [], upperKeys: [], unavailable: en, zhUnavailable: zh });
const left = 'T L1 L2 L3';
const low = `${left} R1 R2 R3`;
export const trills: Trill[] = [
  unavailable('B3','C4',1,'Requires a B foot; the source marks this trill impractical.','需要 B 尾管；参考指法表将此颤音标为不实用。'),
  unavailable('B3','C♯4',2,'Requires a B foot; the source marks this trill impractical.','需要 B 尾管；参考指法表将此颤音标为不实用。'),
  unavailable('C4','D♭4',1,'Requires separately holding the C♯ cup closed. This special technique is not demonstrated here.','需要单独保持 C♯ 音孔关闭，此处不演示这一特殊技巧。'),
  trill('C4','D4',2,`${low} RC RCs`,low),
  trill('C♯4','D4',1,`${low} RCs`,low),
  unavailable('C♯4','D♯4',2,'Requires an open-hole or externally held-key technique. Not demonstrated by this closed-hole diagram.','需要开孔或外力按键技巧，此闭孔示意图不演示。'),
  trill('D4','E♭4',1,low,`${low} REb`),
  trill('D4','E4',2,low,`${left} R1 R2`),
  trill('E♭4','E4',1,`${low} REb`,`${left} R1 R2 REb`),
  trill('E♭4','F4',2,`${low} REb`,`${left} R1 REb`),
  trill('E4','F4',1,`${left} R1 R2 REb`,`${left} R1 REb`),
  trill('E4','F♯4',2,`${left} R1 R2 REb`,`${left} R2 REb`),
  trill('F4','G♭4',1,`${left} R1 R3 REb`,`${left} R3 REb`),
  trill('F4','G4',2,`${left} R1 REb`,`${left} REb`),
  trill('F♯4','G4',1,`${left} R3 REb`,`${left} REb`),
  trill('F♯4','G♯4',2,`${left} R3 REb`,`${left} R3 REb LGs`),
  trill('G4','A♭4',1,`${left} REb`,`${left} REb LGs`),
  trill('G4','A4',2,`${left} REb`,'T L1 L2 REb'),
  trill('G♯4','A4',1,`${left} LGs REb`,'T L1 L2 LGs REb'),
  trill('G♯4','A♯4',2,'TBb L1 L2 L3 LGs REb','TBb L1 LGs REb'),
  trill('A4','B♭4',1,'TBb L1 L2 REb','TBb L1 REb'),
  trill('A4','B4',2,'T L1 L2 REb','T L1 REb'),
  // The source's first Bb row has a duplicated C5 text caption. Its
  // bb4b4.gif notation and red side-lever fingering identify Bb4-B4.
  trill('B♭4','B4',1,'T L1 RBb REb','T L1 REb'),
  trill('B♭4','C5',2,'TBb L1 REb','L1 REb'),
  trill('B4','C5',1,'T L1 REb','L1 REb'),
  trill('B4','C♯5',2,'T L1 REb','REb'),
  trill('C5','D♭5',1,'L1 REb','REb'),
  trill('C5','D5',2,'L1 REb','L1 REb Tr1'),
  trill('C♯5','D5',1,'REb','REb Tr1'),
  trill('C♯5','D♯5',2,'REb','REb Tr2'),
];
// Octave two: copy only the source-confirmed E5 through B5 pattern.
for (const entry of trills.filter(t => ['E4','F4','F♯4','G4','G♯4','A4','B♭4','B4'].includes(t.base))) {
  trills.push({...entry, base: entry.base.replace('4','5'), upper: entry.upper.replace('5','6').replace('4','5')});
}
const middleLeft = 'T L2 L3';
trills.push(
  trill('D5','E♭5',1,`${middleLeft} R1 R2 R3`,`${middleLeft} R1 R2 R3 REb`),
  trill('D5','E5',2,`${middleLeft} R1 R2 R3`,`${middleLeft} R1 R2`),
  trill('E♭5','E5',1,`${middleLeft} R1 R2 R3 REb`,`${middleLeft} R1 R2 REb`),
  trill('E♭5','F5',2,`${low} REb`,`${left} R1 REb`),
  trill('C6','D♭6',1,'L1 REb','REb'),
  trill('C6','D6',2,'L1 REb','L1 Tr2 REb'),
  trill('C♯6','D6',1,'REb','Tr1 REb'),
  trill('C♯6','D♯6',2,'REb','Tr1 Tr2 REb'),
);
const qualified = (t: Trill, note: string, zhNote: string): Trill => ({...t,note,zhNote});
trills.push(
  trill('D6','E♭6',1,'T L2 L3 REb','T L2 L3 Tr2 REb'),
  trill('D6','E6',2,'T L2 L3 REb','T L2 REb'),
  trill('E♭6','E6',1,'T L1 L2 L3 LGs R1 R2 R3 REb','T L1 L2 LGs R1 R2 R3 REb'),
  trill('E♭6','F6',2,'T L1 L2 L3 LGs R1 R2 R3 REb','T L1 LGs R1 R2 R3 REb'),
  trill('E6','F6',1,'T L1 L2 R1 R2 REb','T L1 R1 R2 REb'),
  qualified(trill('E6','F♯6',2,'T L1 L2 R1 R2 REb','L1 L2 R1 R2 REb'),'The upper F♯ tends flat.','上方的 F♯ 容易偏低。'),
  trill('F6','G♭6',1,'T L1 L3 R1 R3 REb','T L1 L3 R3 REb'),
  qualified(trill('F6','G6',2,'T L1 L3 R1 REb','L1 L3 R1 REb'),'The upper G tends flat.','上方的 G 容易偏低。'),
  qualified(trill('F♯6','G6',1,'T L1 L3 R3 REb','L1 L3 R3 REb'),'The upper G tends flat.','上方的 G 容易偏低。'),
  qualified(trill('F♯6','G♯6',2,'T L1 L3 R3 REb','L3 R3 REb'),'The upper G♯ tends flat.','上方的 G♯ 容易偏低。'),
  trill('G6','A♭6',1,'L1 L2 L3 REb','L1 L2 L3 Tr1 REb'),
  qualified(trill('G6','A6',2,'T L2 L3 R2 R3 REb','T L2 R2 R3 REb'),'The upper A tends flat.','上方的 A 容易偏低。'),
  trill('G♯6','A6',1,'L2 L3 LGs REb','L2 L3 LGs Tr1 REb'),
  qualified(trill('G♯6','A♯6',2,'L2 L3 LGs REb','L2 L3 LGs Tr1 Tr2 REb'),'The upper A♯ tends flat.','上方的 A♯ 容易偏低。'),
  qualified(trill('A6','B♭6',1,'T L2 R1 REb','T R1 REb'),'The upper B♭ tends flat.','上方的 B♭ 容易偏低。'),
  qualified(trill('A6','B6',2,'T L1 L2 L3 R1 R3','T L1 L2 L3'),'The upper B tends flat.','上方的 B 容易偏低。'),
  trill('B♭6','B6',1,'T L1 L3 R1 Tr1 Tr2','T L1 L3 Tr2'),
  qualified(trill('B♭6','C7',2,'TBb L1 L3 R3 RC RCs','L1 L3 R3 RC RCs'),'The upper C tends flat.','上方的 C 容易偏低。'),
  qualified(trill('B6','C7',1,'T L1 L3 Tr2 REb','L1 L3 Tr2 REb'),'The upper C tends flat.','上方的 C 容易偏低。'),
  {...trill('B6','C♯7',2,'T L1 L3 Tr2 Gizmo','L3 Tr2 Gizmo'),requires:'b-foot',alternatives:[{label:'C foot',zhLabel:'C 尾管',lowerKeys:keys('T L1 L3 Tr2'),upperKeys:keys('L3 Tr2'),requires:'c-foot'}]},
  {...qualified(trill('C7','D♭7',1,'L1 L2 L3 LGs R1 Gizmo','L2 L3 LGs R1 Gizmo'),'The upper D♭ tends flat.','上方的 D♭ 容易偏低。'),requires:'b-foot',alternatives:[{label:'C foot',zhLabel:'C 尾管',lowerKeys:keys('L1 L2 L3 LGs R1'),upperKeys:keys('L2 L3 LGs R1'),requires:'c-foot',note:'The upper D♭ tends flat.',zhNote:'上方的 D♭ 容易偏低。'}]},
  {...trill('C7','D7',2,'T L1 L2 L3 LGs R1 Gizmo','T L1 LGs R1 Gizmo'),requires:'b-foot',alternatives:[{label:'C foot',zhLabel:'C 尾管',lowerKeys:keys('T L1 L2 L3 LGs R1 RC RCs'),upperKeys:keys('T L1 LGs R1 RC RCs'),requires:'c-foot'}]},
  unavailable('C♯7','D7',1,'Requires open-hole ring-key movement. This closed-hole diagram cannot represent it accurately.','需要开孔按键的环形部分运动，此闭孔图无法准确演示。'),
  trill('D7','E♭7',1,'T L3 R1 R2 RC RCs','T L3 R2 RC RCs'),
  trill('E♭7','E7',1,'T L1 L2 L3 LGs R1 Tr1 R2 R3 REb','T L1 L2 LGs R1 Tr1 R2 R3 REb'),
  qualified(trill('E7','F7',1,'L1 L2 L3 R2 Tr2','L2 R2 Tr2'),'Closed-hole version; the interval tends flat.','闭孔版本；音程容易偏低。'),
  {...trill('G7','A♭7',1,'T L2 L3 LGs R2 R3 RB RC RCs','T L2 L3 LGs Tr1 R2 R3 RB RC RCs'),requires:'b-foot'},
);
// The fourth-octave source explicitly leaves these pairs without fingerings.
for (const [base, upper, interval] of [
  ['C♯7','D♯7',2],['D7','E7',2],['E♭7','F7',2],['E7','F♯7',2],
  ['F7','G♭7',1],['F7','G7',2],['F♯7','G7',1],['F♯7','G♯7',2],['G7','A7',2],
] as const) trills.push(unavailable(base,upper,interval,'No verified fingering is supplied by this reference.','此参考资料未提供已验证的指法。'));
// Optional harmonic versions are labeled as such, never substituted silently.
trills.find(t => t.base === 'D6' && t.interval === 2)!.alternatives = [{
  label:'Harmonic',zhLabel:'泛音指法',lowerKeys:keys('T L1 L2 L3 REb'),upperKeys:keys('T L1 L2 REb'),harmonic:true,
  note:'Overblow the G4–A4 fingerings. The upper E tends flat.',zhNote:'使用 G4–A4 指法超吹；上方的 E 容易偏低。',
}];
trills.find(t => t.base === 'B♭5' && t.interval === 1)!.alternatives = [{
  label:'Harmonic',zhLabel:'泛音指法',lowerKeys:keys('T L1 L3 R1 R2 R3 REb'),upperKeys:keys('T L1 L3 R1 R2 REb'),harmonic:true,
  note:'Harmonic fingering from the E♭4–E4 pattern, with left finger 2 lifted.',zhNote:'由 E♭4–E4 指法变化而来的泛音指法，左手二指抬起。',
}];
const pitchNumber = (pitch: string) => {
  const notes: Record<string,number> = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  return Number(pitch.slice(-1))*12 + notes[pitch[0]] + (pitch.includes('♯') ? 1 : pitch.includes('♭') ? -1 : 0);
};
trills.sort((a,b) => pitchNumber(a.base)-pitchNumber(b.base) || a.interval-b.interval);
export const trillRegisters = [
  {id:1,en:'First octave',zh:'第一八度',min:47,max:61},
  {id:2,en:'Second octave',zh:'第二八度',min:62,max:73},
  {id:3,en:'Third octave',zh:'第三八度',min:74,max:83},
  {id:4,en:'Fourth octave',zh:'第四八度',min:84,max:91},
];
export const trillRegisterFor = (pitch: string) => trillRegisters.find(r => pitchNumber(pitch) >= r.min && pitchNumber(pitch) <= r.max)!;
export const sourceForTrill = (pitch: string) => `https://www.wfg.woodwind.org/flute/fl_tr2_${trillRegisterFor(pitch).id}.html`;
// Prefer familiar pitch spellings, with explicit accidentals in the notation.
export const trillPitches = [...new Set(trills.map(t => t.base))];
export function movingKeys(trill: Pick<Trill, 'lowerKeys' | 'upperKeys'>): FluteKeyId[] {
  return [...new Set([...trill.lowerKeys, ...trill.upperKeys])]
    .filter(key => trill.lowerKeys.includes(key) !== trill.upperKeys.includes(key));
}
