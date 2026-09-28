/**
 * Splits one MusicXML file holding a whole book (Köhler Op. 33, a set of
 * daily exercises) into one short score per numbered piece.
 *
 * The boundary is MuseScore's section break. MuseScore does not export the
 * break itself to MusicXML, but it restarts measure numbering after one, so
 * a measure numbered 1 (or a pickup numbered 0) after the first measure is
 * where the next piece starts. End barlines are not used: scanned books
 * often lose them, and a piece can also contain one.
 *
 * A piece that does not restate its key, time or clef inherits them from
 * the one before (No. 15 of Köhler Op. 33 keeps No. 14's 4/4), so the
 * running values are written onto every piece's first measure; each file
 * then stands on its own.
 */

const MEASURE=/<measure\b[^>]*>[\s\S]*?<\/measure>/g;
const CARRIED=["divisions","key","time","clef"];

const numberOf=measure=>measure.match(/^<measure\b[^>]*\bnumber=["']([^"']*)["']/)?.[1]??"";
const element=(xml,tag)=>xml.match(new RegExp(`<${tag}\\b[^>]*(?:/>|>[\\s\\S]*?</${tag}>)`))?.[0]??null;
const words=measure=>[...measure.matchAll(/<words\b[^>]*>([^<]*)<\/words>/g)].map(match=>match[1].replace(/&amp;/g,"&").trim()).filter(Boolean);

/** Writes the carried key, time and clef into a piece's first measure where it lacks them. */
function withAttributes(measure,carried){
  const current=element(measure,"attributes");
  const inner=current?current.replace(/^<attributes\b[^>]*>|<\/attributes>$/g,""):"";
  const own=Object.fromEntries(CARRIED.map(tag=>[tag,element(inner,tag)]));
  // Everything else the measure already declared (staves, transpose…) keeps
  // its place between time and clef, which is where MusicXML orders it.
  const rest=CARRIED.reduce((text,tag)=>own[tag]?text.replace(own[tag],""):text,inner).trim();
  const pick=tag=>own[tag]??carried[tag]??"";
  const rebuilt=`<attributes>${pick("divisions")}${pick("key")}${pick("time")}${rest}${pick("clef")}</attributes>`;
  if(current)return measure.replace(current,rebuilt);
  // No attributes yet: they go first in the measure, after any <print>.
  const print=element(measure,"print");
  return print?measure.replace(print,print+rebuilt):measure.replace(/^(<measure\b[^>]*>)/,`$1${rebuilt}`);
}

/**
 * @returns {{number:number,xml:string,bars:number,opening:string,time:string,fifths:number|null}[]}
 */
export function splitBook(xml){
  const parts=[...xml.matchAll(/<part\s+id=["'][^"']+["'][^>]*>[\s\S]*?<\/part>/g)];
  if(parts.length!==1)throw new Error(`A book should have one part (one staff for the reader); this file has ${parts.length}.`);
  const part=parts[0][0],open=part.match(/^<part\b[^>]*>/)[0];
  const measures=part.match(MEASURE)??[];
  const groups=[];
  measures.forEach((measure,index)=>{
    const n=numberOf(measure),previous=index?numberOf(measures[index-1]):"";
    // A pickup (0) followed by bar 1 is one piece, not two.
    if(!index||((n==="1"||n==="0")&&previous!=="0"))groups.push([]);
    groups.at(-1).push(measure);
  });

  const carried={};
  // Page and system layout from the whole book (credits, the book's title
  // text) means nothing inside one piece; the reader lays out its own page.
  const head=xml.slice(0,parts[0].index).replace(/<credit\b[\s\S]*?<\/credit>\s*/g,"");
  const tail=xml.slice(parts[0].index+part.length);
  return groups.map((group,index)=>{
    const first=withAttributes(group[0],carried);
    for(const measure of group){
      const attributes=element(measure,"attributes");
      if(attributes)for(const tag of CARRIED){const value=element(attributes,tag);if(value)carried[tag]=value}
    }
    const number=index+1,piece=[first,...group.slice(1)].join("\n");
    const title=`No. ${number}`;
    const pieceHead=head
      .replace(/<work-title>[\s\S]*?<\/work-title>/,`<work-title>${title}</work-title>`)
      .replace(/<movement-title>[\s\S]*?<\/movement-title>/,`<movement-title>${title}</movement-title>`);
    const firstAttributes=element(first,"attributes")??"";
    const beats=firstAttributes.match(/<beats>([^<]+)<\/beats>/)?.[1],beatType=firstAttributes.match(/<beat-type>([^<]+)<\/beat-type>/)?.[1];
    const fifths=Number(firstAttributes.match(/<fifths>(-?\d+)<\/fifths>/)?.[1]);
    return {
      number,
      xml:`${pieceHead}${open}\n${piece}\n</part>${tail}`,
      bars:group.filter(measure=>!/\bimplicit=["']yes["']/.test(measure.match(/^<measure\b[^>]*>/)[0])).length,
      // The first tempo word ("Allegro moderato."), which is how players
      // tell the pieces of a book apart.
      opening:(words(group[0])[0]??"").replace(/\.$/,""),
      time:beats&&beatType?`${beats}/${beatType}`:"",
      fifths:Number.isFinite(fifths)?fifths:null,
    };
  });
}
