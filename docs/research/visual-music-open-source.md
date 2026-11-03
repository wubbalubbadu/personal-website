# Open-source tech for performance-driven visuals (solo flute and related)

Research date: 2026-11-02. Scope: open-source projects, mostly on GitHub, plus papers that ship code, that are useful for a piece-specific "visual score" for solo flute (starting with Debussy's Syrinx), a staccato "raindrops" study, a later Vision Pro version, and a later teaching guide. Per the user's note, related tech for other instruments counts too.

## How to read this

- **Stars and last activity** come from the GitHub search API on 2026-11-02 (`pushed_at`, which is the last push to any branch, so it can overstate how alive a project is). Star counts are rounded.
- **License** is what GitHub detects. "None detected" means no license file GitHub recognizes, which legally means all rights reserved: you can read it and learn from it, but you should not copy code from it.
- **License warning for a public website:** AGPL code (Essentia, essentia.js, Hydra, audioMotion-analyzer) served from your site obliges you to offer the full source of the combined work to visitors. GPL code (aubio, TarsosDSP, Tony) has similar copyleft rules when you distribute it. MIT, BSD, ISC, Apache and 0BSD are the easy ones for a Next.js site.
- **Browser?** means it runs client-side in a web page without a server.
- Two sites I tried to read directly (frontiersin.org, nime.org) were blocked by this session's network policy, so for those papers I rely on search-result abstracts and say so.

## Where you already are

Your prototype already does mic input, YIN pitch, and a 3 ms loudness envelope. That is the "raw signal" layer. Most of what is missing for your vision sits above it: (a) knowing where you are in the score, (b) turning the envelope into note-level descriptors (attack, length, release shape), and (c) a data format that says "in bars 1 to 2, the visual world is X". The sections below are ordered along that chain.

---

## 1. Real-time score following / audio-to-score alignment

**What this area teaches.** Score following answers "which note of the score is the performer on right now?" Two families dominate. *Online dynamic time warping (OLTW)*, from Dixon (2005), incrementally aligns a stream of audio features (usually chroma) against features synthesized from the score, searching only a band near the current position so it runs in real time. *Probabilistic models* (HMMs, particle filters, Kalman filters) treat score position and tempo as hidden states and update a belief from each frame; this handles uncertainty, rests and tempo changes more gracefully. For a monophonic flute, a pitch-based HMM is the natural fit, because your YIN output is already a much cleaner observation than chroma of a full mix. Syrinx is hard for any follower: long rubato, fermatas, breath pauses, and repeated motives that look identical to the model. Learning how followers recover from getting lost is the real lesson.

| Project | What it does | License | Last push / stars | Browser? |
|---|---|---|---|---|
| [pymatchmaker/matchmaker](https://github.com/pymatchmaker/matchmaker) | Python library of reference real-time score followers (audio and MIDI) | Apache-2.0 | 2026-11-02 / ~90 | No (Python) |
| [CPJKU/accompanion](https://github.com/CPJKU/accompanion) | Expressive piano accompaniment that follows a MIDI soloist | Apache-2.0 | 2026-10-30 / ~30 | No |
| [CPJKU/partitura](https://github.com/CPJKU/partitura) | Load MusicXML/MEI/MIDI into note arrays, alignments, performance data | Apache-2.0 | 2026-10-28 / ~380 | No |
| [sildater/parangonar](https://github.com/sildater/parangonar) | Note-level alignment, including online symbolic matchers | Apache-2.0 | 2026-10-27 / ~70 | No |
| [groupmm/synctoolbox](https://github.com/groupmm/synctoolbox) | Reference offline music synchronization (DTW, chroma, onset features) | NOASSERTION (custom, see repo) | 2026-05-28 / ~140 | No |
| [RVirmoors/RVdtw-](https://github.com/RVirmoors/RVdtw-) | Online-DTW tracker external for Max/MSP, with a standalone oDTW folder | GPL-3.0 | 2020-04-04 / ~20 | No (Max) |
| [flippy-fyp/flippy](https://github.com/flippy-fyp/flippy) | Student CQT-DTW score follower with testbenches | GPL-3.0 | 2022-09-24 / ~20 | No |
| [ircam-ismm/xmm](https://github.com/ircam-ismm/xmm) | IRCAM's HMM/GMM library for gesture following and mapping | GPL-3.0 | 2026-07-20 / ~40 | Old browser decoder exists |
| [CPJKU/score_following_game](https://github.com/CPJKU/score_following_game) | Research code: score following on sheet images via reinforcement learning | MIT | 2022-12-27 / ~60 | No |
| Antescofo ([PyPI client](https://pypi.org/project/antescofo/), [Cycling '74 thread](https://cycling74.com/forums/antescofo-score-follower)) | IRCAM's score follower plus reactive language for electronics | Free to use, not open source | n/a | No |

Notes per project:

- **matchmaker** is the single most useful find. Its README lists audio and MIDI methods: Arzt OLTW (default), Dixon OLTW, Arzt with a tempo model, an outer-product HMM (Nakamura), a two-level HMM with repeats and skips, a switching Kalman filter with hidden tempo (Jiang and Raphael 2020), a particle filter (Korzeniowski et al. 2013), and on the MIDI side a "pitch-based HMM" (`pthmm`) and transformer note matchers from parangonar ([README](https://github.com/pymatchmaker/matchmaker)). It also has `BytesAudioStream` for feeding audio from a WebSocket instead of a local device ([README](https://github.com/pymatchmaker/matchmaker)). **Learn:** read the Dixon and Arzt implementations side by side, then the pitch HMM; that is a compact course in score following. **Reuse:** run it offline against your own Syrinx recordings to see which method survives the rubato, then port the winner to TypeScript. There is also a [benchmark repo](https://github.com/pymatchmaker/matchmaker_benchmark) and a [demo app](https://github.com/pymatchmaker/matchmaker-demo).
- **ACCompanion** works only with MIDI input (onset, offset and pitch of each note), per its [README](https://github.com/CPJKU/accompanion). It does not take flute audio. **Learn:** its architecture (follower, tempo prediction, expressive output, online adaptation) is a good template for "follower plus a layer that anticipates the performer", which is what visuals need to avoid lag.
- **partitura** is how you would get Syrinx from MusicXML into a note array with bar and beat positions ([repo](https://github.com/CPJKU/partitura), [tutorial](https://github.com/CPJKU/partitura_tutorial)). Useful for authoring the visual score in Python and exporting JSON for the browser.
- **synctoolbox** is offline, but its notebooks are the clearest teaching material on chroma plus onset features for alignment ([repo](https://github.com/groupmm/synctoolbox)). Use it to make ground-truth alignments of your recordings, which you need to evaluate any live follower.
- **RVdtw~** is a Max object, last touched 2020, but the `oDTW` folder is a small standalone C++ online DTW ([README](https://github.com/RVirmoors/RVdtw-)). Readable; GPL, so learn from it rather than copy.
- **flippy** is a final-year student project, unmaintained since 2022 ([repo](https://github.com/flippy-fyp/flippy)). Its quantitative and qualitative testbenches are the interesting part.
- **XMM** is IRCAM's open HMM engine behind their "gesture follower" ideas. The [browser decoder](https://github.com/Ircam-RnD/xmm-client) has not been touched since 2017, so treat it as dead. Learn the "hierarchical HMM follows a template in time" concept, not the code.
- **score_following_game** follows sheet-music images with deep RL. Research code, inactive since 2022 ([repo](https://github.com/CPJKU/score_following_game)). Not useful for you except as reading.
- **Antescofo** is the professional reference and the tool behind much flute and electronics repertoire. The Max/Pd objects are free but the code is not open, and a forum thread says the editor (Ascograph) was discontinued and maintenance is not a priority ([Cycling '74 forum](https://cycling74.com/forums/antescofo-score-follower), [IRCAM forum](https://discussion.forum.ircam.fr/t/tutorial-issues-and-antescofo-prospects/25838)). The idea worth stealing is its *language*: score events plus timed, tempo-relative actions. That is very close to your "visual score".
- **Browser/JS score following:** I found none that is maintained. GitHub searches for score following in JavaScript or TypeScript returned only unrelated repos ([search: score following javascript](https://github.com/search?q=score+following+javascript&type=repositories)). Small toy followers exist, such as [clairehkc/simple-score-follower](https://github.com/clairehkc/simple-score-follower) (no license, 2023) and [josephinecowley/Score-follower](https://github.com/josephinecowley/Score-follower) (no license, no description). This is a real gap (see the end).
- **Romanticjojo/Syrinx** ([repo](https://github.com/Romanticjojo/Syrinx), Apache-2.0, ~50 stars, 2026-09) shares your piece's name but is a flute practice app whose score cursor follows the *accompaniment*, not the player, with pitch analysis afterwards ([English README](https://github.com/Romanticjojo/Syrinx/blob/HEAD/README.en.md)). Worth a look as a neighbor in the flute-practice space, not as a score follower.

## 2. Onset, articulation and envelope detection

**What this area teaches.** An onset detector turns a continuous signal into events. Classic methods compute a "novelty" curve (energy rise, spectral flux, high-frequency content, complex-domain phase deviation) and pick peaks. For flute, energy alone is weak at slurred note changes, so pitch change has to count as an onset too. Articulation is the shape of the event: attack time (10% to 90% rise of the envelope), the presence of a noisy transient from the tongue, sustain length, and release slope (abrupt stop versus taper). Your 3 ms envelope already contains all of this; what is missing is segmentation and per-note descriptors. Note that no library below has a "staccato type" classifier. You will build that from descriptors such as attack time, duration relative to inter-onset interval, release slope, and spectral flux at onset.

| Project | What it does | License | Last push / stars | Browser? |
|---|---|---|---|---|
| [MTG/essentia.js](https://github.com/MTG/essentia.js) | Essentia compiled to WebAssembly, real-time and offline, plus TF.js models | AGPL-3.0 | 2025-12-10 / ~870 | Yes |
| [MTG/essentia](https://github.com/MTG/essentia) | Large C++/Python audio analysis library (onsets, envelopes, pitch, timbre) | AGPL-3.0 | 2026-10-22 / ~3.8k | Via essentia.js |
| [aubio/aubio](https://github.com/aubio/aubio) | C library for onset, pitch, beat in real time | GPL-3.0 | 2026-04-10 / ~3.8k | Via aubiojs |
| [qiuxiang/aubiojs](https://github.com/qiuxiang/aubiojs) | aubio for JavaScript | MIT (wrapper; aubio itself is GPL) | 2023-08-17 / ~170 | Yes |
| [meyda/meyda](https://github.com/meyda/meyda) | Real-time audio features in Web Audio (RMS, spectral centroid, flux, etc.) | MIT | 2024-07-15 / ~1.7k | Yes |
| [ianprime0509/pitchy](https://github.com/ianprime0509/pitchy) | McLeod pitch method with a clarity value | 0BSD | 2026-11-01 / ~140 | Yes |
| [marl/crepe](https://github.com/marl/crepe) | CNN pitch estimator, very accurate on monophonic audio | MIT | 2024-08-19 / ~1.4k | Old ml5 port only |
| [spotify/basic-pitch-ts](https://github.com/spotify/basic-pitch-ts) | Audio to MIDI notes with pitch bends, TypeScript | Apache-2.0 | 2023-05-23 / ~370 | Yes, not low-latency |
| [librosa/librosa](https://github.com/librosa/librosa) | Python reference for onsets, pYIN, features | ISC | 2026-10-06 / ~8.8k | No |
| [sonic-visualiser/tony](https://github.com/sonic-visualiser/tony) | pYIN pitch plus note segmentation with manual correction | GPL-2.0 | 2024-07-11 / ~70 | No (desktop) |

Also checked: [CPJKU/madmom](https://github.com/CPJKU/madmom) (~1.7k, Python, neural onset detectors; GitHub reports a custom license, so read it before reuse), [peterkhayes/pitchfinder](https://github.com/peterkhayes/pitchfinder) (~500, JS YIN/AMDF/MPM collection, no license detected), [cwilso/PitchDetect](https://github.com/cwilso/PitchDetect) (~1.4k, MIT, 2022, a teaching demo of autocorrelation), [sevagh/pitchlite](https://github.com/sevagh/pitchlite) (MIT, WASM plus AudioWorklet pitch tracking, small and inactive since 2023), [spotify/basic-pitch](https://github.com/spotify/basic-pitch) (Python original), [JorenSix/TarsosDSP](https://github.com/JorenSix/TarsosDSP) (Java, GPL), and [ml5js/ml5-next-gen](https://github.com/ml5js/ml5-next-gen).

Notes:

- **essentia.js** says it supports "both real-time and offline" analysis and ships TF.js model inference ([README](https://github.com/MTG/essentia.js)). It is the richest browser option (onset detection functions, envelope, log attack time, spectral descriptors). The AGPL is the catch for a public site. **Learn:** read the Essentia docs for `OnsetDetection`, `Envelope`, `LogAttackTime`, `TCToTotal` as definitions of articulation descriptors, then implement the few you need yourself.
- **aubio** is the classic real-time onset and pitch library, small and fast ([repo](https://github.com/aubio/aubio)). Its onset methods (energy, HFC, complex, phase, spectral flux, KL, MKL) are a good menu to test against flute staccato. **aubiojs** wraps it for the browser but has been quiet since 2023 ([repo](https://github.com/qiuxiang/aubiojs)), and the GPL of aubio still applies.
- **Meyda** works on Web Audio in real time ([README](https://github.com/meyda/meyda)) and is MIT, so it is the safest drop-in for spectral centroid (brightness, a proxy for tone color), spectral flux (onset novelty) and RMS. No release since mid-2024, but the code is stable.
- **pitchy** is actively maintained, uses the McLeod Pitch Method and returns a "clarity" value ([README](https://github.com/ianprime0509/pitchy)). Clarity is useful: it drops during breath noise and the tongued transient, which helps you find attacks.
- **CREPE** is the accuracy reference but heavy; the browser port lived in the old [ml5-library](https://github.com/ml5js/ml5-library) `pitchDetection`. The new [ml5-next-gen](https://github.com/ml5js/ml5-next-gen) source exports body, hand, face and sound classifier models but no pitch detector ([src/index.js](https://github.com/ml5js/ml5-next-gen/blob/HEAD/src/index.js)). So for ml5, pitch is effectively legacy. Use CREPE offline to make ground-truth pitch for your recordings.
- **basic-pitch-ts** gives note events with bends ([repo](https://github.com/spotify/basic-pitch-ts)), but it is a windowed neural model, not a 3 ms detector, and the repo has been idle since 2023. Good for transcribing your recordings into a reference, not for live raindrops.
- **Tony** is the best tool to make a hand-corrected note-level annotation of your own Syrinx takes ([repo](https://github.com/sonic-visualiser/tony)), and [Sonic Visualiser](https://github.com/sonic-visualiser/sonic-visualiser) (GPL-2.0, active 2026-10) for looking at your envelope and spectrogram side by side. These are learning instruments more than libraries.

## 3. Audio-reactive and music-driven generative visuals

**What this area teaches.** Almost all open-source "music visualizers" map low-level features (FFT bands, RMS, beat) to visual parameters. That is easy and quickly feels generic, which is exactly what you want to avoid. The interesting projects here either (a) give you a good rendering engine to drive from your own higher-level data, or (b) map *symbolic* structure (harmony, tension, form) to visuals. The core design lesson: separate the *analysis layer* (what the music is doing), the *meaning layer* (your visual score: what this passage means), and the *rendering layer* (shaders, particles). Raw-FFT tools merge the first and third and skip the second.

| Project | What it does | License | Last push / stars | Browser? |
|---|---|---|---|---|
| [hydra-synth/hydra](https://github.com/hydra-synth/hydra) | Live-coded, chainable WebGL video synth | AGPL-3.0 | 2026-04-25 / ~2.7k | Yes |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | Standard JS 3D engine, WebGL/WebGPU, WebXR | MIT | 2026-11-02 / ~117k | Yes |
| [processing/p5.js](https://github.com/processing/p5.js) + [p5.js-sound](https://github.com/processing/p5.js-sound) | Creative coding sketches, with audio analysis add-on | LGPL-2.1 / MIT | 2026-10 / ~24k; 2025-09 / ~900 | Yes |
| [cables-gl/cables](https://github.com/cables-gl/cables) | Node-based visual programming for WebGL | None detected in GitHub metadata | 2026-11-02 / ~570 | Yes |
| [jberg/butterchurn](https://github.com/jberg/butterchurn) | WebGL port of the Milkdrop visualizer | MIT | 2026-04-20 / ~2k | Yes |
| [vpavlenko/rawl](https://github.com/vpavlenko/rawl) | Colors scores by harmonic function in 12 colors, piano-roll view | GPL-3.0 | 2026-11-01 / ~80 | Yes |
| [cifkao/tonnetz-viz](https://github.com/cifkao/tonnetz-viz) | Live Tonnetz (harmonic lattice) visualization from MIDI | MIT | 2021-01-07 / ~140 | Yes |
| [ruiguo-bio/midi-miner](https://github.com/ruiguo-bio/midi-miner) | Computes tonal tension curves (spiral array) from MIDI | GPL-3.0 | 2024-06-18 / ~120 | No (Python) |
| [JobSavelsberg/music-structure](https://github.com/JobSavelsberg/music-structure) | Web app that extracts and shows song structure | None detected | 2026-01-07 / ~35 | Yes |
| [keijiro/LaspVfx](https://github.com/keijiro/LaspVfx) | Audio-reactive Unity VFX Graph using LASP | Unlicense | 2025-03-31 / ~700 | No (Unity) |

Notes:

- **Hydra** is a beautiful model of a tiny composable visual language ([repo](https://github.com/hydra-synth/hydra)). Its audio input is FFT bins, so it is the opposite of structure-driven, but its *chain of operators* idea is a good shape for a reusable visual score ("osc then kaleid then modulate"). AGPL.
- **three.js** is the realistic rendering choice for you: MIT, huge community, and it is also the path into WebXR ([repo](https://github.com/mrdoob/three.js)). The raindrops study is a natural fit for instanced meshes or a fragment shader.
- **p5.js** is the fastest way to sketch a mapping idea before committing to three.js ([repo](https://github.com/processing/p5.js)).
- **cables** is useful to learn node-based visual patching in the browser ([repo](https://github.com/cables-gl/cables)). GitHub detects no license file at the repo root, so check the repo before reusing code.
- **butterchurn** is a well-made engine for the generic FFT look ([repo](https://github.com/jberg/butterchurn)). Study it to learn what to avoid, and how Milkdrop presets parameterize visuals.
- **rawl** is the closest thing I found to "music theory drives color": it colors notes by harmonic function across Western scores ([repo](https://github.com/vpavlenko/rawl)). Actively developed. Even though Syrinx is monophonic, you can color pitches by their role in the passage's scale (whole-tone versus pentatonic versus chromatic), which is a similar idea.
- **tonnetz-viz** shows harmony as positions on a lattice ([repo](https://github.com/cifkao/tonnetz-viz)). Unmaintained since 2021 but small and MIT. A monophonic line still traces a path on a Tonnetz, which is one way to visualize "scale world" changes.
- **midi-miner** computes tension with the spiral array (Herremans and Chew's model) ([repo](https://github.com/ruiguo-bio/midi-miner)). Closest open code to a *tension* signal. It is offline and designed for polyphonic MIDI, so for Syrinx you would compute a tension curve offline per note and store it in the visual score.
- **Larson's musical forces.** Steve Larson's *Musical Forces* (2012) describes gravity, magnetism and inertia, and a computer program called *What Next* that predicts melodic continuations ([Project MUSE](https://muse.jhu.edu/book/13634), [eScholarship abstract](https://escholarship.org/uc/item/5s89q20s)). I found no public code for it. Implementing the three forces for a monophonic line is a gap and a good learning project.
- **music-structure** and [wlouie1/MusicPlot](https://github.com/wlouie1/MusicPlot) (self-similarity matrices, inactive since 2020, no license) teach how structure analysis works on recordings. Pop-oriented, but the self-similarity idea will show Syrinx's returning motive.
- **LaspVfx** (Unlicense, Unity) is the standard example of low-latency audio into Unity's VFX Graph ([repo](https://github.com/keijiro/LaspVfx), [LASP](https://github.com/keijiro/Lasp)). Relevant if you go Unity for Vision Pro.

## 4. Visuals for live classical or contemporary performance

**What this area teaches.** Academic work here shows that the best results come from *pre-composed* visuals tied to the score and *triggered by score following*, not from live reactive mappings. That is your exact plan. There is also a long tradition of "expressive performance visualization" (tempo and loudness trajectories) from the same Vienna/Linz group that maintains matchmaker.

| Project / paper | What it does | License | Activity | Browser? |
|---|---|---|---|---|
| Lartillot, Cancino-Chacón, Brazier 2020, [arXiv](https://arxiv.org/abs/2006.10168v1) | Real-time visualization of a Bach fugue by a string quartet, driven by online DTW alignment | Paper | 2020; follow-up 2025 | Unknown |
| [ossia/score](https://github.com/ossia/score) | Interactive intermedia sequencer: timelines with conditions, triggers, OSC, video and shaders | NOASSERTION (check the LICENSE file before reuse) | 2026-11-02 / ~2.1k | No (desktop) |
| [grame-cncm/inscore](https://github.com/grame-cncm/inscore) | Augmented interactive music scores controlled by OSC | None detected in metadata | 2025-04-25 / ~50 | Web editor: [inscoreweb](https://github.com/grame-cncm/inscoreweb) (MPL-2.0) |
| [ircam-ismm/catart-mubu](https://github.com/ircam-ismm/catart-mubu) | Corpus-based concatenative synthesis in Max (MuBu) | NOASSERTION | 2026-10-16 / ~40 | No |
| [flucoma/flucoma-core](https://github.com/flucoma/flucoma-core) | Real-time descriptors, novelty slicing, ML for Max/Pd/SuperCollider | BSD-3-Clause | 2026-10-15 / ~100 | No |
| [collective-soundworks/soundworks](https://github.com/collective-soundworks/soundworks) | IRCAM framework for distributed web apps (phones, sync, state) | BSD-3-Clause | 2026-10-28 / ~130 | Yes |
| [fiebrink1/wekinator](https://github.com/fiebrink1/wekinator) | Interactive ML mapping of inputs to outputs over OSC | GPL-2.0 | 2024-01-15 / ~320 | No |
| Performance Worm, Dixon, Goebl, Widmer 2002 ([ICMC paper](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2002/icmc.pdf)) | Live tempo and loudness trajectory with fading trail | Paper; [web re-implementation](https://sinestools.univie.ac.at/wormhole.htm) | 2002 | Web tool (upload) |
| Carrascoza and Castellani, *Tempo Transversal: Flauta Expandida*, [NIME 2019](https://nime.org/proc_music/nime2019_music_carrascoza/) | Flute performance with live camera and pre-recorded projection | Paper / piece | 2019 | No |
| [JorenSix/PiPePoPo](https://github.com/JorenSix/PiPePoPo) | Flute pitch moves a mouse cursor | GPL-3.0 | 2024-04-21 / ~10 | No (Java) |

Notes:

- **The Lartillot fugue paper** is the closest published precedent to your plan: the visualization was "prepared in advance and synchronised with the live performance" using real-time audio-to-score alignment with online DTW ([arXiv](https://arxiv.org/abs/2006.10168v1)). A 2025 *Music & Science* follow-up reports that in an online study a large majority understood the visualization and about half said it improved their musical understanding ([summary](https://labs.sonicfield.org/library/video-visualization-of-a-string-quartet-performance-of-a-bach-fugue-design-and-s), [Zenodo record](https://zenodo.org/records/15720360)). I did not find released code. **Learn:** their design is thematic (voices placed by motivic class, time normalized to metrical position), which is a model for showing Syrinx's motive returning.
- **ossia score** is the best open "visual score" authoring tool I found: a timeline where events can wait on conditions (for example "wait for this note") and drive video and shaders over OSC ([repo](https://github.com/ossia/score), [examples](https://github.com/ossia/score-examples)). Very active. **Learn:** its model of *interactive time*, where segments have flexible durations bounded by triggers, is exactly what rubato needs. You could even prototype the Syrinx visual score in it before building your own format.
- **INScore** is about augmented scores (graphics attached to score positions) driven by OSC ([repo](https://github.com/grame-cncm/inscore)). Slow activity. Its *time-to-graphic mapping* concept is worth reading.
- **FluCoMa** is the strongest open toolkit for live descriptor and novelty slicing in the Max/SuperCollider world ([core](https://github.com/flucoma/flucoma-core), [Max](https://github.com/flucoma/flucoma-max)). Not browser, but its learning materials on slicing and descriptors transfer to your JS code.
- **soundworks** (IRCAM) matters if the listener's device and the performer's laptop must share state and a clock ([repo](https://github.com/collective-soundworks/soundworks), [sync](https://github.com/ircam-ismm/sync)). That is relevant later for Vision Pro: laptop does analysis, headset renders.
- **Wekinator** is the classic "train a mapping by example" tool ([repo](https://github.com/fiebrink1/wekinator)), quiet since 2024. Useful as a concept for letting other performers tweak your mapping without code.
- **Performance Worm** is a beautiful, simple visual idea from the Dixon/Goebl/Widmer group: a fading trail in tempo-loudness space ([paper](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2002/icmc.pdf), [Langner and Goebl 2003](https://www.continuum-hypothesis.com/music/Langner-VisualizingExpressivePerformance-2003.pdf)). No open code that I found; [yayachen/Tempo_Loudness_Space](https://github.com/yayachen/Tempo_Loudness_Space) is a tiny 2018 student version with no license.
- **Flute-specific:** the IRCAM tradition is flute plus electronics with score following, such as Manoury's *Jupiter* ([Wikipedia: Score following](https://en.wikipedia.org/wiki/Score_following)), but that is sound, not visuals. *Tempo Transversal* is a flute and video piece ([NIME 2019](https://nime.org/proc_music/nime2019_music_carrascoza/)). I found no open-source project that does score-followed visuals for solo flute. PiPePoPo is a fun toy, not a tool. [juanbraga/mir_old](https://github.com/juanbraga/mir_old) and [juanbraga/embouchure_extraction](https://github.com/juanbraga/embouchure_extraction) (2017 to 2018, no license) are student work on flute note extraction and on a contemporary flute piece (*Aliento/Arrugas*); dead, but the topic is close to yours.

## 5. XR music visuals (visionOS, WebXR, Unity)

**What this area teaches.** The hard problem in XR is not rendering; it is *anchoring* (placing visuals around a real performer who moves) and *latency* (the listener sees the flutist directly, so a 100 ms lag in visuals is visible). Open-source work here is thin and mostly toy demos.

| Project | What it does | License | Last push / stars | Browser? |
|---|---|---|---|---|
| [immersive-web/webxr-samples](https://github.com/immersive-web/webxr-samples) | Official WebXR API samples | MIT | 2026-10-26 / ~1.2k | Yes |
| [aframevr/aframe](https://github.com/aframevr/aframe) | Declarative WebXR framework on three.js | MIT | 2026-07-13 / ~18k | Yes |
| three.js WebXR ([repo](https://github.com/mrdoob/three.js)) | WebXR support built into three.js | MIT | active | Yes |
| [keijiro/Lasp](https://github.com/keijiro/Lasp) | Low-latency audio input for Unity | Unlicense | 2025-10-10 / ~1.7k | No |
| [phobi82/webxr_butterchurn](https://github.com/phobi82/webxr_butterchurn) | Butterchurn inside WebXR | MIT | 2026-05-07 / 0 | Yes |
| [manasi3691-alt/music-visualizer-webxr](https://github.com/manasi3691-alt/music-visualizer-webxr) | WebXR visualizer built on Meta's IWSDK | None detected | 2026-10-28 / ~1 | Yes |
| [techatha/Music-Driven-VR](https://github.com/techatha/Music-Driven-VR) | "Semantic music visualization in WebXR" internship project | None detected | 2026-03-20 / ~1 | Yes |
| [kokiTakashiki/VolumetricAudioVisualizerDemo](https://github.com/kokiTakashiki/VolumetricAudioVisualizerDemo) | visionOS volumetric audio visualizer demo | MIT | 2025-06-19 / 0 | No (visionOS) |
| Erdmann, von Berg, Steffens 2025, [Frontiers in VR](https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full) | Mixed reality visualization of a live performance from real-time MIR, evaluated with audiences | Paper | 2025 | Unknown |

Notes:

- **Vision Pro and WebXR.** Safari on visionOS supports immersive WebXR sessions and a `transient-pointer` input mode, but WebKit has described it as behind a feature flag (Settings > Apps > Safari > Advanced > Feature Flags) ([WebKit: natural input](https://webkit.org/?p=15162), [WebKit WWDC24 notes](https://webkit.org/?p=15443)). For a "one listener, one performer" demo, a three.js WebXR page could be the shortest path from your browser prototype to the headset. I could not confirm whether WebXR passthrough (`immersive-ar`) is supported on visionOS; check that before planning around seeing the real performer through a web page.
- **Native visionOS/RealityKit:** I found no meaningful open-source music visualizer. The only hit is a zero-star MIT demo ([repo](https://github.com/kokiTakashiki/VolumetricAudioVisualizerDemo)). GitHub search for RealityKit audio-reactive projects returned nothing ([search](https://github.com/search?q=realitykit+audio+reactive&type=repositories)).
- **Unity route:** LASP plus LaspVfx is the mature open pair for audio into visuals ([Lasp](https://github.com/keijiro/Lasp), [LaspVfx](https://github.com/keijiro/LaspVfx)); visionOS support in Unity goes through Unity's own PolySpatial, which is not open source.
- **WebXR music repos** found by search are all very small: [webxr_butterchurn](https://github.com/phobi82/webxr_butterchurn), [music-visualizer-webxr](https://github.com/manasi3691-alt/music-visualizer-webxr), [Music-Driven-VR](https://github.com/techatha/Music-Driven-VR), [KoMMb0t/smart-stage-vr](https://github.com/KoMMb0t/smart-stage-vr). Treat them as sketches. Music-Driven-VR's "semantic" framing is closest to yours; its README was not readable at the time of writing.
- **Research.** Erdmann et al. (2025) built an MR visualization of a live performance driven by real-time audio analysis and crossmodal correspondences, and compared it against a baseline with random color and motion changes ([Frontiers record](https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full), [repository record](https://opus4.kobv.de/opus4-hs-duesseldorf/frontdoor/index/index/year/2025/docId/5111)). I could not open the full text from this session, so I cannot report the headset, code availability, or full results. It is the one paper to read first for the Vision Pro phase, because its baseline design is a template for testing whether your visuals carry meaning. The older "HMD as opera glasses" study is about presence with 360 video, not visuals ([Napier record](https://napier-repository.worktribe.com/output/975721/head-mounted-displays-as-opera-glasses-using-mixed-reality-to-deliver-an-egalitarian-user-experience-during-live-events)).

## 6. Music pedagogy visualization (air, tone color, embouchure, pose)

**What this area teaches.** Cameras see fingers and lips; microphones hear tone; neither sees air directly. Research on the flute jet uses smoke, strobes, hot-wire probes and PIV in labs ([Campbell, Greated, Lucey, IOA](https://www.ioa.org.uk/system/files/publications/DM%20CAMPBELL%20CA%20GREATED%20ECA%20LUCEY%20SOUND%20GENERATION%20MECHANISM%20IN%20THE%20FLUTE.pdf)), and jet speed sets which mode the flute speaks in ([Acoustics Today](https://acousticstoday.org/issues/2018AT/Spring2018/files/basic-html/page57.html)). For a student tool, the practical proxies are: spectral centroid and harmonic balance for tone color, pitch stability for air support, noise-to-harmonic ratio for breathiness, and video for posture.

| Project | What it does | License | Last push / stars | Browser? |
|---|---|---|---|---|
| [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) | Pose, hand, face landmark tracking, including web | Apache-2.0 | 2026-11-02 / ~37k | Yes |
| [tensorflow/tfjs-models](https://github.com/tensorflow/tfjs-models) | Pose and face models for TF.js | Apache-2.0 | 2026-06-23 / ~15k | Yes |
| [ml5js/ml5-next-gen](https://github.com/ml5js/ml5-next-gen) | Friendly wrappers for body, hand, face models | NOASSERTION (see repo) | 2026-11-02 / ~190 | Yes |
| [G-1592/Flute_Vision_CV](https://github.com/G-1592/Flute_Vision_CV) | MediaPipe hand and face tracking for flute fingering, posture, embouchure | None detected | 2026-09-05 / 0 | No (Python) |
| [ranakhonsari/ViolinPoseAnalysis](https://github.com/ranakhonsari/ViolinPoseAnalysis) | 2D pose for violin posture and bowing | None detected | 2025-03-30 / ~3 | No |
| [goiosunsw/mipcat](https://github.com/goiosunsw/mipcat) | Clarinet capture: blowing pressure, reed, tongue sensors | None detected | 2023-07-03 / ~3 | No |
| [habuenav/Breath](https://github.com/habuenav/Breath) | Arduino library for a breath pressure sensor | NOASSERTION | 2026-08-01 / ~4 | No |
| Heller et al., *An Augmented Flute for Beginners*, [NIME 2017](https://nime.org/proc/nime2017_fheller/) ([PDF](https://almeida.informatik.rwth-aachen.de/publications/heller2017a.pdf)) | Sensors measure jet angle and width, displayed graphically | Paper | 2017 | No |
| [patrickiel/note-by-note](https://github.com/patrickiel/note-by-note) | Browser extension for practicing along with page audio, real-time pitch | GPL-2.0 | 2026-09-08 / ~20 | Yes |
| VioPose, [WACV 2025 / arXiv](https://arxiv.org/abs/2411.13607v1) | Audio-visual 4D pose estimation for violinists | Paper | 2025 | No |

Notes:

- **MediaPipe** is the obvious base; it runs in the browser and covers hands and face mesh ([repo](https://github.com/google-ai-edge/mediapipe)). ml5-next-gen wraps body, hand and face models in a beginner-friendly API ([src/index.js](https://github.com/ml5js/ml5-next-gen/blob/HEAD/src/index.js)).
- **Flute_Vision_CV** is the closest project to your teaching idea: a flutist used MediaPipe hand landmarks for fingering, and face landmarks for head alignment and embouchure, on a music stand ([README](https://github.com/G-1592/Flute_Vision_CV)). Zero stars, no license, so learn from it but do not copy. It also shows the limit: a camera sees lip shape, not the jet.
- **Wind players move little.** A beat-estimation study found pose-based methods worked for woodwinds where only small motion is present, which suggests the signal is small and you need careful processing ([IBU record](https://acikerisim.ibu.edu.tr/items/85fb7342-1e95-4131-b1f8-30a6207c771c)). A cellist posture paper shows an on-device MediaPipe pipeline you could adapt ([arXiv 2604.17530](https://arxiv.org/pdf/2604.17530)).
- **Air and jet:** the Augmented Flute (NIME 2017) is the key precedent for *showing* the air jet direction, using sensors rather than a camera; it cites a jet angle range of 25 to 40 degrees below horizontal ([NIME](https://nime.org/proc/nime2017_fheller/)). **MIPCAT** shows what serious wind capture looks like for clarinet (pressure, reed, tongue) ([repo](https://github.com/goiosunsw/mipcat)). For flute, a cheap pressure sensor such as the one in [habuenav/Breath](https://github.com/habuenav/Breath) only measures mouth pressure, not jet speed at the embouchure, but it is a reasonable proxy for teaching breath support.
- **Tone color:** I found no open project that visualizes flute tone color for students. Meyda's spectral centroid and spectral flatness in the browser are where you would start ([Meyda](https://github.com/meyda/meyda)).

---

## Most useful for us (ranked)

1. **[pymatchmaker/matchmaker](https://github.com/pymatchmaker/matchmaker)** (Apache-2.0). Reference score followers including a pitch HMM, OLTW and tempo models. Use it to choose and understand an algorithm, then port it to the browser.
2. **[CPJKU/partitura](https://github.com/CPJKU/partitura)** (Apache-2.0). Turn the Syrinx MusicXML into a note array with bars and beats, the backbone of the visual score.
3. **[ossia/score](https://github.com/ossia/score)**. Model of an interactive timeline with conditional triggers; borrow its concepts for the visual score format, or prototype in it.
4. **[meyda/meyda](https://github.com/meyda/meyda)** (MIT) plus **[pitchy](https://github.com/ianprime0509/pitchy)** (0BSD). License-safe browser features: centroid, flux, RMS, pitch with clarity. Enough to build raindrop descriptors on top of your envelope.
5. **[MTG/essentia.js](https://github.com/MTG/essentia.js)**. The best definitions and implementations of attack and envelope descriptors; use for offline study, and only ship it if you accept AGPL.
6. **[mrdoob/three.js](https://github.com/mrdoob/three.js)** (MIT). Rendering for both the laptop prototype and a WebXR path to Vision Pro.
7. **Lartillot et al. fugue visualization** ([arXiv](https://arxiv.org/abs/2006.10168v1)) and **Erdmann et al. 2025** ([Frontiers](https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full)). The two closest research precedents: score-followed pre-composed visuals, and an MR live-performance study with a proper baseline.
8. **[sonic-visualiser/tony](https://github.com/sonic-visualiser/tony)** and **[groupmm/synctoolbox](https://github.com/groupmm/synctoolbox)**. Make ground-truth notes and alignments of your own recordings so you can measure your follower and articulation detectors.
9. **[vpavlenko/rawl](https://github.com/vpavlenko/rawl)** and **[ruiguo-bio/midi-miner](https://github.com/ruiguo-bio/midi-miner)**. The few open examples of theory (harmonic function, tension) mapped to visuals or numbers.
10. **[google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe)** and **[G-1592/Flute_Vision_CV](https://github.com/G-1592/Flute_Vision_CV)**. For the later teaching guide.

## Gaps nobody seems to fill

1. **A maintained browser score follower for monophonic audio.** No JS/TS or WebAssembly score follower turned up beyond toys ([search](https://github.com/search?q=score+following+javascript&type=repositories)). matchmaker is Python only, Antescofo is closed.
2. **An open "visual score" format.** Antescofo has a reactive score language but is closed ([forum](https://cycling74.com/forums/antescofo-score-follower)); ossia and INScore have their own project formats. Nothing defines "score position plus musical meaning plus visual parameters" in a reusable, shareable file that someone else could take and tweak.
3. **Articulation classification for wind instruments.** Onset and attack descriptors exist (Essentia, aubio), but no open project classifies tongued staccato types, release shapes or slur versus tongue for flute.
4. **Larson's musical forces as code.** The theory and a historical program (*What Next*) are described in print ([Project MUSE](https://muse.jhu.edu/book/13634)), but I found no public implementation.
5. **Structure-driven visuals for monophonic music.** Theory-to-visual projects (rawl, Tonnetz, tension) assume harmony or polyphonic MIDI. Mapping scale type, motive identity and implied harmony of a solo line is unexplored in open source.
6. **Open XR visuals around a live performer.** Native visionOS music visualizers are essentially absent, and WebXR music repos are toy-sized; the research (Erdmann et al. 2025) did not appear to ship code.
7. **Flute tone color and air visualization for students.** Lab methods for the jet exist ([IOA paper](https://www.ioa.org.uk/system/files/publications/DM%20CAMPBELL%20CA%20GREATED%20ECA%20LUCEY%20SOUND%20GENERATION%20MECHANISM%20IN%20THE%20FLUTE.pdf)) and one sensor-based augmented flute ([NIME 2017](https://nime.org/proc/nime2017_fheller/)), but no open, microphone-plus-camera teaching tool.
8. **Evaluation data for flute.** Score-following benchmarks exist ([matchmaker_benchmark](https://github.com/pymatchmaker/matchmaker_benchmark)), but I found no public aligned dataset of solo flute performances with note-level articulation labels.

## Questions to think about before building

- Before reading matchmaker's code: how would *you* decide, from YIN pitch alone, that the performer has moved from one note of Syrinx to the next during a long rubato? Your answer will tell you whether an HMM or OLTW feels more natural.
- For the raindrops: which three descriptors from your 3 ms envelope do you think distinguish a light *staccato* from a *staccatissimo* on the flute? Measuring that on your own recordings (Tony plus Sonic Visualiser) is a small experiment worth doing before writing visuals.
