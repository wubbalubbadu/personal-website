export const VALUES = [4, 2, 1, .5, .25] as const;
export type NoteValue = typeof VALUES[number];
export const PATTERNS: NoteValue[][] = [[1, 1, 2], [2, 1, 1], [.5, .5, 1, 2]];
export function timings(values: readonly number[], unit = .65) {
  let start = 0;
  return values.map(value => { const event = {start, duration: value * unit}; start += event.duration; return event; });
}
// Compare onset intervals, so device/input latency does not penalize the learner.
export function assessTaps(taps: number[], values: readonly number[], unit = 650) {
  if (taps.length !== values.length) return false;
  return taps.slice(1).every((time, i) => Math.abs(time - taps[i] - values[i] * unit) <= Math.max(140, values[i] * unit * .26));
}
export function assessHold(milliseconds: number, value: NoteValue, unit = 650) {
  const expected = value * unit;
  return Math.abs(milliseconds - expected) <= Math.max(160, expected * .18);
}

/** A null pitch explicitly means silence. An omitted pitch preserves the existing G4 default. */
export function playbackEvents(values:readonly number[], pitches:readonly (number|null)[] = [], unit=.65){
  return timings(values,unit).map((event,i)=>({...event,midi:pitches[i]===null?null:(pitches[i]??67)}));
}
