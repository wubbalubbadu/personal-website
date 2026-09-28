/**
 * A starting metronome setting for a score, used when the uploader is given
 * no tempo of its own.
 *
 * An explicit metronome mark (♩ = 84) wins. Otherwise the first tempo word
 * near the start ("Allegro.", "Allegro moderato.", "Andantino.") is looked
 * up in the reader's glossary (content/music-terms.json), whose `bpm` range
 * is the one the reader already explains to the player, and the middle of
 * that range is used; a marking with two tempo words (Allegro moderato)
 * lands between them. It is only where the reader's metronome starts: the
 * player's own setting is remembered per piece.
 *
 * The result is in the beat the reader's metronome clicks (meterBeat in
 * ScoreViewer): a dotted quarter in 6/8, an eighth in 3/8, a half in 2/2.
 */

const UNIT_QUARTERS={whole:4,half:2,quarter:1,eighth:.5,"16th":.25};

/** Words the way the reader splits them, trailing full stops allowed ("Allegro." is "allegro"). */
export function termWords(text){
  return String(text).toLowerCase().replace(/[(),;:]/g," ").split(/\s+/).filter(Boolean);
}
export const sameWord=(word,part)=>word===part||word.replace(/\.+$/,"")===part;

function feltBeat(quarterBpm,time){
  const [beats,beatType]=String(time||"4/4").split("/").map(Number);
  const compound=beatType===8&&beats%3===0&&beats>3;
  // 3/8 is usually felt quicker than its eighths at quarter speed, hence 1.5 rather than 2.
  const bpm=compound?quarterBpm*2/3:beatType===8?quarterBpm*1.5:beatType===2?quarterBpm/2:quarterBpm;
  return Math.max(40,Math.min(208,Math.round(bpm/2)*2));
}

export function suggestedTempo(xml,terms){
  const measures=(xml.match(/<measure\b[\s\S]*?<\/measure>/g)??[]).slice(0,3);
  const time=(()=>{const a=measures.join("").match(/<beats>([^<]+)<\/beats>\s*<beat-type>([^<]+)<\/beat-type>/);return a?`${a[1]}/${a[2]}`:"4/4"})();

  const mark=measures.join("").match(/<metronome\b[\s\S]*?<\/metronome>/)?.[0];
  if(mark){
    const unit=mark.match(/<beat-unit>([^<]+)<\/beat-unit>/)?.[1],perMinute=Number(mark.match(/<per-minute>([\d.]+)/)?.[1]);
    const quarters=(UNIT_QUARTERS[unit]??1)*(/<beat-unit-dot/.test(mark)?1.5:1);
    if(perMinute>0)return feltBeat(perMinute*quarters,time);
  }

  const tempoTerms=Object.entries(terms).filter(([,term])=>Array.isArray(term?.bpm)).map(([phrase,term])=>({parts:phrase.split(" "),bpm:term.bpm})).sort((a,b)=>b.parts.length-a.parts.length);
  for(const measure of measures){
    for(const match of measure.matchAll(/<words\b[^>]*>([^<]*)<\/words>/g)){
      const words=termWords(match[1].replace(/&amp;/g,"&")),found=[];
      for(let i=0;i<words.length;){
        const term=tempoTerms.find(({parts})=>parts.every((part,k)=>words[i+k]&&sameWord(words[i+k],part)));
        if(term){found.push(term);i+=term.parts.length}else i++;
      }
      if(found.length)return feltBeat(found.reduce((sum,{bpm})=>sum+(bpm[0]+bpm[1])/2,0)/found.length,time);
    }
  }
  return undefined;
}
