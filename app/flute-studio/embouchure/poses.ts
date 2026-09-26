export const MIN_NOTE = 59;
export const MAX_NOTE = 98;
export const noteName = (midi: number) => `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
// Authored teaching poses, not a physiological model. E5=76; E6=88.
export function poseAt(note: number) {
  const n = Math.max(MIN_NOTE, Math.min(MAX_NOTE, note));
  const t = n <= 76 ? (n - 59) / 17 * .38 : n <= 88 ? .38 + (n - 76) / 12 * .42 : .8 + (n - 88) / 10 * .2;
  return {t, tongueForward: .38*t, jawOpen: .2*(1-t), aperture: .19-.1*t, airAngle: -.58+.43*t};
}

// Short, register-specific embouchure cues. Thresholds match poses.ts (E5=76, E6=88).
export function guidance(note: number) {
  if (note < 76) return 'Air aims down into the tube, jaw drops: ahh, ohh';
  if (note < 88) return 'Air blows a little more forward: eeh';
  return 'Tongue and lower lip move forward, air very fast across: eee';
}
