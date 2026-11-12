import type { ResearchMap } from "./index";

const gh = (repo: string) => `https://github.com/${repo}`;

/** Source: docs/research/visual-music-open-source.md (cloud research, 2026-11-02). */
export const visualMusicOss: ResearchMap = {
  id: "visual-music-oss",
  title: "Open source for flute visuals",
  kind: "Research map",
  summary:
    "What already exists for score following, articulation, music-driven visuals, XR and pedagogy, and the gaps nobody fills yet.",
  date: "November 2, 2026",
  start:
    "My prototype already hears the flute: mic input, YIN pitch, and a 3 ms loudness envelope. What is missing sits above that: knowing where I am in the score, turning the envelope into note descriptors, and a format that says what each passage should look like.",
  areas: [
    {
      id: "follow",
      title: "Score following",
      teaches:
        "Score following answers: which note of the score is the player on right now? Online DTW aligns a stream of features against the score, searching only near the current position. Probabilistic models (HMMs, particle and Kalman filters) keep a belief about position and tempo and update it every frame. For one flute line, a pitch HMM fits best, since YIN pitch is a much cleaner observation than chroma of a full mix. Syrinx is hard for any follower: rubato, fermatas, breaths, and repeated motives that look identical. How a follower recovers when lost is the real lesson.",
      projects: [
        { id: "matchmaker", name: "matchmaker", href: gh("pymatchmaker/matchmaker"), what: "Python library of reference real-time score followers, audio and MIDI", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-11 · ~90★", browser: "no", note: "The single most useful find. Has Dixon and Arzt online DTW, HMMs with repeats and skips, a Kalman filter with hidden tempo, a particle filter and a pitch HMM. Read the two DTW versions side by side, then the pitch HMM. Run it on my own Syrinx recordings to see which method survives the rubato, then port that one to TypeScript." },
        { id: "accompanion", name: "ACCompanion", href: gh("CPJKU/accompanion"), what: "Expressive piano accompaniment that follows a MIDI soloist", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-10 · ~30★", browser: "no", note: "MIDI input only, not flute audio. Its architecture is the lesson: a follower plus a layer that anticipates the performer, which visuals need to avoid lag." },
        { id: "partitura", name: "partitura", href: gh("CPJKU/partitura"), what: "Load MusicXML, MEI or MIDI into note arrays with bars and beats", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-10 · ~380★", browser: "no", note: "How to get Syrinx from MusicXML into a note array for authoring the visual score, then export JSON for the browser." },
        { id: "parangonar", name: "parangonar", href: gh("sildater/parangonar"), what: "Note-level alignment, including online symbolic matchers", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-10 · ~70★", browser: "no" },
        { id: "synctoolbox", name: "synctoolbox", href: gh("groupmm/synctoolbox"), what: "Reference offline music synchronization with DTW, chroma and onset features", license: "unclear", licenseLabel: "Custom", activity: "2026-05 · ~140★", browser: "no", note: "Offline, but its notebooks are the clearest teaching material on alignment features. Use it to make ground-truth alignments of my recordings for testing a live follower." },
        { id: "rvdtw", name: "RVdtw~", href: gh("RVirmoors/RVdtw-"), what: "Online DTW tracker for Max, with a small standalone C++ core", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2020 · ~20★", browser: "no", note: "Readable online DTW in a small folder. Learn from it, don't copy." },
        { id: "flippy", name: "flippy", href: gh("flippy-fyp/flippy"), what: "Student CQT DTW score follower with testbenches", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2022 · ~20★", browser: "no", note: "Unmaintained. The testbenches are the interesting part." },
        { id: "xmm", name: "XMM", href: gh("ircam-ismm/xmm"), what: "IRCAM's HMM library for gesture following", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2026-07 · ~40★", browser: "partly", note: "The browser decoder is dead since 2017. Learn the idea of a hierarchical HMM following a template in time, not the code." },
        { id: "sfgame", name: "score_following_game", href: gh("CPJKU/score_following_game"), what: "Research code that follows sheet music images with reinforcement learning", license: "easy", licenseLabel: "MIT", activity: "2022 · ~60★", browser: "no", note: "Reading only." },
        { id: "antescofo", name: "Antescofo", href: "https://cycling74.com/forums/antescofo-score-follower", what: "IRCAM's score follower plus a reactive language for electronics", license: "closed", licenseLabel: "Free, not open", activity: "Editor discontinued", browser: "no", note: "The professional reference behind much flute and electronics music. The idea to steal is its language: score events plus timed, tempo-relative actions. That is very close to a visual score." },
        { id: "syrinx-app", name: "Romanticjojo/Syrinx", href: gh("Romanticjojo/Syrinx"), what: "Flute practice app whose cursor follows the accompaniment, not the player", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-09 · ~50★", browser: "no", note: "Same name as the piece. A neighbor in flute practice apps, not a score follower." },
      ],
    },
    {
      id: "onset",
      title: "Onsets and articulation",
      teaches:
        "An onset detector turns a continuous signal into events, usually by picking peaks in a novelty curve (energy rise, spectral flux, phase change). For flute, energy alone misses slurred note changes, so a pitch change has to count as an onset too. Articulation is the shape of the event: attack time, the noisy tongue transient, length, and release slope. My envelope already holds all of this. No library classifies staccato types; that gets built from descriptors.",
      projects: [
        { id: "essentiajs", name: "essentia.js", href: gh("MTG/essentia.js"), what: "Essentia in WebAssembly, real time and offline, plus TF.js models", license: "copyleft", licenseLabel: "AGPL-3.0", activity: "2025-12 · ~870★", browser: "yes", note: "The richest browser option, but AGPL on a public site means sharing the site's source. Read its definitions of Envelope, LogAttackTime and TCToTotal, then write the few I need myself." },
        { id: "essentia", name: "Essentia", href: gh("MTG/essentia"), what: "Large C++ and Python audio analysis library", license: "copyleft", licenseLabel: "AGPL-3.0", activity: "2026-10 · ~3.8k★", browser: "partly" },
        { id: "aubio", name: "aubio", href: gh("aubio/aubio"), what: "Classic real-time onset, pitch and beat detection in C", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2026-04 · ~3.8k★", browser: "partly", note: "Its onset methods (energy, HFC, complex, phase, flux) are a good menu to test against flute staccato." },
        { id: "aubiojs", name: "aubiojs", href: gh("qiuxiang/aubiojs"), what: "aubio for JavaScript", license: "copyleft", licenseLabel: "MIT wrapper, GPL core", activity: "2023 · ~170★", browser: "yes" },
        { id: "meyda", name: "Meyda", href: gh("meyda/meyda"), what: "Real-time audio features in Web Audio: RMS, spectral centroid, flux", license: "easy", licenseLabel: "MIT", activity: "2024 · ~1.7k★", browser: "yes", note: "The safest drop-in. Spectral centroid is a proxy for tone brightness, flux for onsets." },
        { id: "pitchy", name: "pitchy", href: gh("ianprime0509/pitchy"), what: "McLeod pitch method with a clarity value", license: "easy", licenseLabel: "0BSD", activity: "2026-11 · ~140★", browser: "yes", note: "Clarity drops during breath noise and the tongue transient, which helps find attacks." },
        { id: "crepe", name: "CREPE", href: gh("marl/crepe"), what: "Neural pitch estimator, very accurate on single lines", license: "easy", licenseLabel: "MIT", activity: "2024 · ~1.4k★", browser: "no", note: "Too heavy for live use. Good for ground-truth pitch of recordings." },
        { id: "basicpitch", name: "basic-pitch-ts", href: gh("spotify/basic-pitch-ts"), what: "Audio to MIDI notes with pitch bends, in TypeScript", license: "easy", licenseLabel: "Apache-2.0", activity: "2023 · ~370★", browser: "yes", note: "Windowed and not low latency. For transcribing recordings, not live raindrops." },
        { id: "librosa", name: "librosa", href: gh("librosa/librosa"), what: "Python reference for onsets, pYIN and features", license: "easy", licenseLabel: "ISC", activity: "2026-10 · ~8.8k★", browser: "no" },
        { id: "tony", name: "Tony", href: gh("sonic-visualiser/tony"), what: "pYIN pitch plus note segmentation with manual correction", license: "copyleft", licenseLabel: "GPL-2.0", activity: "2024 · ~70★", browser: "no", note: "The best tool to hand-annotate my own Syrinx takes. With Sonic Visualiser, a learning instrument more than a library." },
      ],
    },
    {
      id: "visuals",
      title: "Music-driven visuals",
      teaches:
        "Almost every open music visualizer maps low-level features (FFT bands, loudness, beat) straight to visuals. That is easy and quickly feels generic. The useful projects either give a good engine to drive with my own data, or map musical structure (harmony, tension, form) to visuals. The design lesson: separate the analysis layer (what the music does), the meaning layer (what this passage means), and the rendering layer. Raw FFT tools skip the middle one.",
      projects: [
        { id: "hydra", name: "Hydra", href: gh("hydra-synth/hydra"), what: "Live-coded, chainable WebGL video synth", license: "copyleft", licenseLabel: "AGPL-3.0", activity: "2026-04 · ~2.7k★", browser: "yes", note: "A tiny composable visual language. Its chain of operators is a good shape for a reusable visual score." },
        { id: "threejs", name: "three.js", href: gh("mrdoob/three.js"), what: "The standard JS 3D engine, WebGL, WebGPU and WebXR", license: "easy", licenseLabel: "MIT", activity: "2026-11 · ~117k★", browser: "yes", note: "The realistic rendering choice, and the path into WebXR. Raindrops fit instanced meshes or a shader." },
        { id: "p5", name: "p5.js", href: gh("processing/p5.js"), what: "Creative coding sketches, with a sound add-on", license: "easy", licenseLabel: "LGPL-2.1", activity: "2026-10 · ~24k★", browser: "yes", note: "The fastest way to sketch a mapping idea." },
        { id: "cables", name: "cables", href: gh("cables-gl/cables"), what: "Node-based visual programming for WebGL", license: "unclear", licenseLabel: "None detected", activity: "2026-11 · ~570★", browser: "yes" },
        { id: "butterchurn", name: "butterchurn", href: gh("jberg/butterchurn"), what: "WebGL port of the Milkdrop visualizer", license: "easy", licenseLabel: "MIT", activity: "2026-04 · ~2k★", browser: "yes", note: "The generic FFT look done well. Study it to learn what to avoid." },
        { id: "rawl", name: "rawl", href: gh("vpavlenko/rawl"), what: "Colors scores by harmonic function, piano roll view", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2026-11 · ~80★", browser: "yes", note: "The closest thing to theory driving color. For Syrinx, color could follow each pitch's role in the passage's scale." },
        { id: "tonnetz", name: "tonnetz-viz", href: gh("cifkao/tonnetz-viz"), what: "Live Tonnetz, harmony as positions on a lattice", license: "easy", licenseLabel: "MIT", activity: "2021 · ~140★", browser: "yes", note: "A single melody still traces a path on a Tonnetz, one way to show the scale world changing." },
        { id: "midiminer", name: "midi-miner", href: gh("ruiguo-bio/midi-miner"), what: "Tonal tension curves from MIDI", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2024 · ~120★", browser: "no", note: "The closest open code to a tension signal. Compute it offline and store it in the visual score." },
        { id: "musicstructure", name: "music-structure", href: gh("JobSavelsberg/music-structure"), what: "Web app that finds and shows song structure", license: "unclear", licenseLabel: "None detected", activity: "2026-01 · ~35★", browser: "yes", note: "Self-similarity would show Syrinx's returning motive." },
        { id: "laspvfx", name: "LaspVfx", href: gh("keijiro/LaspVfx"), what: "Audio-reactive Unity VFX Graph", license: "easy", licenseLabel: "Unlicense", activity: "2025-03 · ~700★", browser: "no", note: "Relevant only if Vision Pro goes through Unity." },
      ],
    },
    {
      id: "live",
      title: "Visuals for live classical performance",
      teaches:
        "Academic work shows the best results come from visuals composed ahead, tied to the score, and triggered by score following, not from live reactive mappings. That is exactly my plan.",
      projects: [
        { id: "fugue", name: "Bach fugue visualization", href: "https://arxiv.org/abs/2006.10168v1", what: "String quartet visuals prepared ahead, synced live with online DTW", license: "paper", licenseLabel: "Paper", activity: "2020, follow-up 2025", browser: "no", note: "The closest precedent. Visuals are thematic, placing voices by motive. In the 2025 follow-up, most viewers understood it and about half said it improved their understanding. No code released." },
        { id: "ossia", name: "ossia score", href: gh("ossia/score"), what: "Interactive timeline: events wait on conditions and drive video and shaders", license: "unclear", licenseLabel: "Check LICENSE", activity: "2026-11 · ~2.1k★", browser: "no", note: "The best open visual score tool. Segments have flexible lengths bounded by triggers, which is what rubato needs. Could prototype the Syrinx visual score in it." },
        { id: "inscore", name: "INScore", href: gh("grame-cncm/inscore"), what: "Augmented scores with graphics attached to score positions", license: "unclear", licenseLabel: "None detected", activity: "2025-04 · ~50★", browser: "partly", note: "Read its time-to-graphic mapping idea." },
        { id: "flucoma", name: "FluCoMa", href: gh("flucoma/flucoma-core"), what: "Live descriptors, novelty slicing and ML for Max and SuperCollider", license: "easy", licenseLabel: "BSD-3", activity: "2026-10 · ~100★", browser: "no", note: "Its learning materials on slicing and descriptors transfer to my JS code." },
        { id: "soundworks", name: "soundworks", href: gh("collective-soundworks/soundworks"), what: "IRCAM framework for synced, distributed web apps", license: "easy", licenseLabel: "BSD-3", activity: "2026-10 · ~130★", browser: "yes", note: "For later: the laptop analyzes, the headset renders, and they share a clock." },
        { id: "wekinator", name: "Wekinator", href: gh("fiebrink1/wekinator"), what: "Train a mapping from inputs to outputs by example", license: "copyleft", licenseLabel: "GPL-2.0", activity: "2024 · ~320★", browser: "no", note: "A concept for letting others tweak a mapping without code." },
        { id: "worm", name: "Performance Worm", href: "https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2002/icmc.pdf", what: "Live tempo and loudness drawn as a fading trail", license: "paper", licenseLabel: "Paper", activity: "2002", browser: "partly", note: "A simple, beautiful idea. Close to my line effect." },
        { id: "tempo-transversal", name: "Tempo Transversal", href: "https://nime.org/proc_music/nime2019_music_carrascoza/", what: "Flute piece with live camera and projection", license: "paper", licenseLabel: "Piece", activity: "2019", browser: "no" },
        { id: "pipepopo", name: "PiPePoPo", href: gh("JorenSix/PiPePoPo"), what: "Flute pitch moves a mouse cursor", license: "copyleft", licenseLabel: "GPL-3.0", activity: "2024 · ~10★", browser: "no", note: "A toy, not a tool." },
      ],
    },
    {
      id: "xr",
      title: "XR music visuals",
      teaches:
        "In XR the hard part is not rendering. It is anchoring visuals around a real performer, and latency: the listener sees the flutist directly, so visuals 100 ms late are visible. Open work here is thin and mostly demos.",
      projects: [
        { id: "webxr-samples", name: "webxr-samples", href: gh("immersive-web/webxr-samples"), what: "Official WebXR API samples", license: "easy", licenseLabel: "MIT", activity: "2026-10 · ~1.2k★", browser: "yes" },
        { id: "aframe", name: "A-Frame", href: gh("aframevr/aframe"), what: "Declarative WebXR framework on three.js", license: "easy", licenseLabel: "MIT", activity: "2026-07 · ~18k★", browser: "yes" },
        { id: "lasp", name: "LASP", href: gh("keijiro/Lasp"), what: "Low-latency audio input for Unity", license: "easy", licenseLabel: "Unlicense", activity: "2025-10 · ~1.7k★", browser: "no" },
        { id: "webxr-butterchurn", name: "webxr_butterchurn", href: gh("phobi82/webxr_butterchurn"), what: "Butterchurn inside WebXR", license: "easy", licenseLabel: "MIT", activity: "2026-05 · 0★", browser: "yes", note: "A sketch." },
        { id: "music-driven-vr", name: "Music-Driven-VR", href: gh("techatha/Music-Driven-VR"), what: "Semantic music visualization in WebXR, internship project", license: "unclear", licenseLabel: "None detected", activity: "2026-03 · ~1★", browser: "yes", note: "The semantic framing is closest to mine." },
        { id: "volumetric", name: "VolumetricAudioVisualizerDemo", href: gh("kokiTakashiki/VolumetricAudioVisualizerDemo"), what: "visionOS volumetric audio visualizer demo", license: "easy", licenseLabel: "MIT", activity: "2025-06 · 0★", browser: "no", note: "The only native visionOS hit." },
        { id: "erdmann", name: "Erdmann et al. 2025", href: "https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full", what: "Mixed reality visuals of a live performance, tested with audiences", license: "paper", licenseLabel: "Paper", activity: "2025", browser: "no", note: "Read first for the Vision Pro phase. It compares meaningful visuals against random ones, a template for testing whether mine carry meaning." },
      ],
    },
    {
      id: "pedagogy",
      title: "Teaching visuals",
      teaches:
        "Cameras see fingers and lips, microphones hear tone, and neither sees air. Labs study the flute jet with smoke and probes. For a student tool the practical proxies are spectral centroid for tone color, pitch stability for air support, noise for breathiness, and video for posture.",
      projects: [
        { id: "mediapipe", name: "MediaPipe", href: gh("google-ai-edge/mediapipe"), what: "Pose, hand and face tracking, including in the browser", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-11 · ~37k★", browser: "yes" },
        { id: "tfjs-models", name: "tfjs-models", href: gh("tensorflow/tfjs-models"), what: "Pose and face models for TF.js", license: "easy", licenseLabel: "Apache-2.0", activity: "2026-06 · ~15k★", browser: "yes" },
        { id: "ml5", name: "ml5-next-gen", href: gh("ml5js/ml5-next-gen"), what: "Friendly wrappers for body, hand and face models", license: "unclear", licenseLabel: "See repo", activity: "2026-11 · ~190★", browser: "yes" },
        { id: "flute-vision", name: "Flute_Vision_CV", href: gh("G-1592/Flute_Vision_CV"), what: "Hand and face tracking for flute fingering, posture, embouchure", license: "unclear", licenseLabel: "None detected", activity: "2026-09 · 0★", browser: "no", note: "Closest to my teaching idea. It also shows the limit: a camera sees lip shape, not the air jet." },
        { id: "augmented-flute", name: "Augmented Flute for Beginners", href: "https://nime.org/proc/nime2017_fheller/", what: "Sensors measure jet angle and width, shown graphically", license: "paper", licenseLabel: "Paper", activity: "2017", browser: "no", note: "The key precedent for showing the air jet." },
        { id: "mipcat", name: "MIPCAT", href: gh("goiosunsw/mipcat"), what: "Clarinet capture: blowing pressure, reed and tongue sensors", license: "unclear", licenseLabel: "None detected", activity: "2023 · ~3★", browser: "no" },
        { id: "breath", name: "Breath", href: gh("habuenav/Breath"), what: "Arduino library for a breath pressure sensor", license: "unclear", licenseLabel: "See repo", activity: "2026-08 · ~4★", browser: "no", note: "Measures mouth pressure, not jet speed, but a fair proxy for breath support." },
        { id: "note-by-note", name: "note-by-note", href: gh("patrickiel/note-by-note"), what: "Browser extension for practicing along with page audio", license: "copyleft", licenseLabel: "GPL-2.0", activity: "2026-09 · ~20★", browser: "yes" },
        { id: "viopose", name: "VioPose", href: "https://arxiv.org/abs/2411.13607v1", what: "Audio and video pose estimation for violinists", license: "paper", licenseLabel: "Paper", activity: "2025", browser: "no" },
      ],
    },
  ],
  picks: [
    { ids: ["matchmaker"], why: "Choose and understand a follower, then port it to the browser." },
    { ids: ["partitura"], why: "Syrinx MusicXML into a note array with bars and beats: the backbone of the visual score." },
    { ids: ["ossia"], why: "A model of an interactive timeline with triggers to borrow for the visual score format." },
    { ids: ["meyda", "pitchy"], why: "License-safe browser features, enough to build raindrop descriptors." },
    { ids: ["essentiajs"], why: "The best definitions of attack and envelope descriptors. Study offline." },
    { ids: ["threejs"], why: "Rendering for the laptop prototype and a WebXR path later." },
    { ids: ["fugue", "erdmann"], why: "The two closest research precedents." },
    { ids: ["tony", "synctoolbox"], why: "Ground truth from my own recordings, to measure what I build." },
    { ids: ["rawl", "midiminer"], why: "Rare open examples of theory mapped to visuals or numbers." },
    { ids: ["mediapipe", "flute-vision"], why: "For the teaching guide, later." },
  ],
  gaps: [
    { id: "browser-follower", title: "A browser score follower for one melody line", detail: "Nothing maintained in JS, TypeScript or WebAssembly. matchmaker is Python only and Antescofo is closed." },
    { id: "visual-score-format", title: "An open visual score format", detail: "Nothing defines score position, musical meaning and visual parameters in one shareable file someone else can tweak." },
    { id: "articulation", title: "Articulation types for wind instruments", detail: "Attack descriptors exist, but nothing classifies staccato types, release shapes, or slur versus tongue for flute." },
    { id: "larson", title: "Larson's musical forces as code", detail: "Gravity, magnetism and inertia are described in print, with no public implementation." },
    { id: "monophonic-structure", title: "Structure-driven visuals for a solo line", detail: "Theory-to-visual tools assume harmony. Scale type and motive identity of one melody are unexplored." },
    { id: "xr-performer", title: "Open XR visuals around a live performer", detail: "Native visionOS music visuals are essentially absent, and WebXR ones are toys." },
    { id: "tone-air", title: "Tone color and air for flute students", detail: "Lab methods and one sensor flute exist, but no open mic plus camera teaching tool." },
    { id: "flute-data", title: "Flute evaluation data", detail: "No public set of solo flute recordings aligned to scores with articulation labels." },
  ],
  questions: [
    { id: "q-follow", text: "From YIN pitch alone, how would I decide the player has moved to the next note of Syrinx during a long rubato?" },
    { id: "q-staccato", text: "Which three things from my 3 ms envelope would tell a light staccato from a staccatissimo?" },
  ],
};
