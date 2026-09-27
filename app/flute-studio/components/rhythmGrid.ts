export type Meter={beats:number;beatType:number};
export type FractionLike={Numerator:number;Denominator:number};

const gcd=(a:number,b:number)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1};
const lcm=(a:number,b:number)=>Math.abs(a/gcd(a,b)*b);

/**
 * One integer duration grid for the entire score. OSMD retains every written
 * duration as a rational number, so using the denominators directly keeps
 * tuplets exact instead of rounding each note and repairing the accumulated
 * error later. Sixteen remains the minimum for legacy scores whose quarter
 * note is four units.
 */
export function exactUnitsPerWhole(lengths:FractionLike[],minimum=16){
  return lengths.reduce((units,length)=>{
    const numerator=Math.abs(length.Numerator)||1,denominator=Math.abs(length.Denominator)||1;
    return lcm(units,denominator/gcd(numerator,denominator));
  },minimum);
}

export function durationUnits(length:FractionLike,unitsPerWhole:number){
  return length.Numerator*unitsPerWhole/length.Denominator;
}

/** The audible pulse and written bar length in the score's integer units. */
export function meterGrid(meter:Meter,unitsPerQuarter:number){
  const compound=meter.beats%3===0&&meter.beats>3&&meter.beatType>=8;
  const writtenBeat=unitsPerQuarter*4/meter.beatType;
  return {beatLength:writtenBeat*(compound?3:1),barLength:writtenBeat*meter.beats};
}

/**
 * Beat onsets for one measure. A short opening measure is treated as an
 * anacrusis, so its first visible guide keeps the count it has at the end of
 * the complete bar. Every later measure starts at zero, including after a
 * meter change, which prevents errors in one bar from drifting through the
 * rest of the score.
 */
export function measureBeatOffsets(durations:number[],meter:Meter,unitsPerQuarter:number,isOpeningMeasure=false){
  const {beatLength,barLength}=meterGrid(meter,unitsPerQuarter);
  const contentLength=durations.reduce((sum,duration)=>sum+Math.max(0,duration),0);
  const pickup=isOpeningMeasure&&contentLength>0&&contentLength<barLength?barLength-contentLength:0;
  const result:number[]=[];
  for(let offset=(beatLength-pickup%beatLength)%beatLength;offset<contentLength;offset+=beatLength)result.push(offset);
  return {beatLength,barLength,contentLength,pickup,offsets:result};
}
