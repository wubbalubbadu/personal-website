/**
 * Where each thing the studio remembers belongs (docs/PERSONAL-SETTINGS-PROPOSAL.md). One row per stored key or key
 * family, so adding a key means deciding its scope here, and lib/transfer.ts reads from this table which keys stay on
 * the device. No imports, so the transfer tests can load it on its own.
 *
 * - device: about this screen or browser (sizes, panel states). Never in a transfer code.
 * - session: only true while something runs (the live practice clock). Never in a transfer code.
 * - you: how you like to practise, everywhere. Travels; the code's value wins.
 * - piece / exercise / set: remembered per score, per scale exercise, per saved set. Travels, merged per entry.
 * - record: your history and progress. Travels, merged as records.
 */
export type SettingScope="device"|"session"|"you"|"piece"|"exercise"|"set"|"record";
export const SETTINGS:{match:RegExp;scope:SettingScope;holds:string}[]=[
  // This screen or browser.
  {match:/^cookie:reader-view:/,scope:"device",holds:"reader sizes, spacing, page width, iPad layout"},
  {match:/^cookie:rail-open$/,scope:"device",holds:"desktop rail folded or open"},
  {match:/^cookie:pet-position$/,scope:"device",holds:"where Cookie sits"},
  {match:/^cookie:pencil-only:/,scope:"device",holds:"Apple Pencil only"},
  {match:/^cookie:private-music-code$/,scope:"device",holds:"access code for private music"},
  {match:/^cookie:backup:/,scope:"device",holds:"backup reminder dates"},
  {match:/^cookie:offline-music/,scope:"device",holds:"music kept for offline use"},
  // Panel states: how you last left a screen, remembered on this device only (decided October 21, 2026).
  {match:/^cookie:metronome-more$/,scope:"device",holds:"tools panel metronome More open"},
  {match:/^cookie:tricky-bits:view$/,scope:"device",holds:"Tricky bits Cards or Continuous"},
  {match:/^cookie:closeup-mode$/,scope:"device",holds:"close-up Technique, Pitch or Rhythm"},
  {match:/^cookie:excerpt-tab:/,scope:"device",holds:"an excerpt's last passage tab"},
  // A running clock started on another device must not start here.
  {match:/^cookie:practice-live$/,scope:"session",holds:"the running practice clock"},
  // You, everywhere.
  {match:/^cookie:language$/,scope:"you",holds:"English or Chinese"},
  {match:/^cookie:practice-tempo-marks$/,scope:"you",holds:"show the practice tempo on excerpts and in Scale Studio"},
  {match:/^cookie:reader-metronome-follow$/,scope:"you",holds:"click track follows the music"},
  {match:/^cookie:reader-click-subdivision$/,scope:"you",holds:"reader metronome subdivision"},
  {match:/^cookie:reader-show-tricky$/,scope:"you",holds:"tricky bit bands on the music"},
  {match:/^cookie:rhythm-tap-clicks$/,scope:"you",holds:"RhythmTap click choice"},
  {match:/^cookie:metronome-setup:/,scope:"you",holds:"tools panel metronome options"},
  {match:/^cookie:pomodoro-focus-minutes$/,scope:"you",holds:"focus length"},
  {match:/^cookie:(scale-book|long-tones):preferences:/,scope:"you",holds:"Scale Studio and Long tones setups as last left"},
  // Per score, exercise or set.
  {match:/^cookie:reading-aids:/,scope:"piece",holds:"note names, accidentals, fingering, beat sticks: a default plus each piece's own"},
  {match:/^cookie:reader-drone-mode:/,scope:"piece",holds:"drone Tap a note or Follows the music"},
  {match:/^cookie:practice-pins:/,scope:"piece",holds:"pinned practice passages"},
  {match:/^cookie:score-tempo-ratios/,scope:"piece",holds:"your tempo against the printed one"},
  {match:/^cookie:scale-book:tempos:/,scope:"exercise",holds:"tempo per scale exercise"},
  {match:/^cookie:reichert:tempos:/,scope:"exercise",holds:"tempo per key in key exercise books"},
  {match:/^cookie:saved-exercises:|^cookie:scale-book:sets/,scope:"set",holds:"saved exercises (and older saved scale sets, when they play)"},
];

/** Keys that never go into a transfer code and are never written by one. */
export const isDeviceOnly=(key:string)=>SETTINGS.some(row=>(row.scope==="device"||row.scope==="session")&&row.match.test(key));
