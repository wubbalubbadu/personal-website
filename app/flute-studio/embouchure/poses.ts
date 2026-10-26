export const MIN_NOTE = 59;
export const MAX_NOTE = 98;
export const noteName = (midi: number) => `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
// Authored teaching poses, not a physiological model. E5=76; E6=88.
export function poseAt(note: number) {
  const n = Math.max(MIN_NOTE, Math.min(MAX_NOTE, note));
  const t = n <= 76 ? (n - 59) / 17 * .38 : n <= 88 ? .38 + (n - 76) / 12 * .42 : .8 + (n - 88) / 10 * .2;
  return {t, tongueForward: .38*t, jawOpen: .2*(1-t), aperture: .19-.1*t, airAngle: -.58+.43*t};
}

// The three bands the cues below are written for (same E5 / E6 thresholds as poseAt). `home` is the note a register
// button jumps to: the A in that band.
export type Register = 'low' | 'middle' | 'high';
export const REGISTERS: {id: Register; from: number; to: number; home: number}[] = [
  {id: 'low', from: MIN_NOTE, to: 75, home: 69},
  {id: 'middle', from: 76, to: 87, home: 81},
  {id: 'high', from: 88, to: MAX_NOTE, home: 93},
];
export const registerOf = (note: number): Register => note < 76 ? 'low' : note < 88 ? 'middle' : 'high';

// Short, register-specific embouchure cues (the Learn card's demo cycles through these).
export function guidance(note: number, zh=false) {
  const register = registerOf(note);
  if (register === 'low') return zh?'气流向下进入笛管，下颌放松：啊、哦':'Air aims down into the tube, jaw drops: ahh, ohh';
  if (register === 'middle') return zh?'气流稍向前吹：咿':'Air blows a little more forward: eeh';
  return zh?'舌头和下唇向前，气流快速掠过：衣':'Tongue and lower lip move forward, air very fast across: eee';
}
