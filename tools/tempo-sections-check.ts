/**
 * Lists every library piece's tempo sections as the reader detects them, to compare the tempo-word rule
 * (TEMPO-RULE.md) before and after. Runs in the browser through the dev server, since readScoreFacts needs
 * DOMParser:
 *
 *   const {run}=await import("/tools/tempo-sections-check.ts"); await run();
 *
 * Each line: piece, then "bar: number (word)" per section, the number counted in the section's beat
 * (♩, ♩., 𝅗𝅥, ♪) as the reader's tempo box shows it. "*" marks a section that came from a word alone.
 */
import {readScoreFacts} from "../app/flute-studio/components/scoreTheory";
import catalog from "../content/music-catalog.json";

export const SCORES=[
  "beethoven-leonore-3/m328","beethoven-leonore-3/opening","beethoven-ode-to-joy/score","camille-saint-saens-le-cygne/score",
  "christian-petzold-minuet-in-g-major/score","christoph-willibald-gluck-dance-of-the-blessed-spirits/score","claude-debussy-syrinx/score",
  "english-traditional-danny-boy/score",...Array.from({length:15},(_,i)=>`ernesto-kohler-op-33-book-1/no-${String(i+1).padStart(2,"0")}`),
  "faure-pavane/score","felix-mendelssohn-midsummer-scherzo/score","hekuto-pascal-fish-in-the-pool/score","hwang-jin-yi-flower-day/score",
  "johann-sebastian-bach-badinerie/score","karen-mok-yin-tian/score","li-jian/score","nikolai-rimsky-korsakov-flight-of-the-bumble-bee/score",
  "ravel-daphnis-et-chloe-176/score",...Array.from({length:7},(_,i)=>`reichert-op-5/no-0${i+1}`),"shinji-orito/score",
  "traditional-amazing-grace/score","traditional-greensleeves/score","traditional-scarborough-fair/score","traditional-twinkle-twinkle-little-star/score",
];
const BEAT:Record<string,string>={"0.5":"♪","1":"♩","1.5":"♩.","2":"𝅗𝅥","0.75":"♪.","0.25":"𝅘𝅥𝅯"};

/** The catalog's opening suggestion for a score path, as the reader passes it (config.defaultTempo). */
function catalogTempo(path:string):number|undefined{
  const [folder,file]=path.split("/"),items=(catalog as unknown as {id:string;defaultTempo?:number}[]);
  const id=file.startsWith("no-")?`${folder}-${file}`:folder;
  return items.find(item=>item.id===id)?.defaultTempo;
}

type Reader=(xml:string,options?:{openingTempo?:number})=>{tempos:{measure:number;quarter:number;beat:number;word?:string}[];ramps:{measure:number;until:number;kind:string;target:number|null}[]};
export async function run(read:Reader=readScoreFacts as Reader){
  const lines:string[]=[];
  for(const path of SCORES){
    const xml=await fetch(`/music/${path}.musicxml`).then(r=>r.text());
    const facts=read(xml,{openingTempo:catalogTempo(path)});
    const sections=facts.tempos.map(t=>`${t.measure}: ${BEAT[String(t.beat)]??t.beat}=${Math.round(t.quarter/t.beat)}${t.word?` (${t.word})*`:""}`);
    const ramps=facts.ramps.map(r=>`${r.kind} ${r.measure}→${r.until}${r.target?` to ${r.target}`:""}`);
    lines.push(`${path}: ${sections.join("; ")||"none"}${ramps.length?`  | ramps ${ramps.join(", ")}`:""}`);
  }
  return lines.join("\n");
}
