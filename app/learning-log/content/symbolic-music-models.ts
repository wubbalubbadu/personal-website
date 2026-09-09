import type { Unit } from "./types";

/**
 * Unit 7 — "Symbolic Music Models" (course §4.2–4.3).
 *
 * The Transformer, applied to symbolic music. Five chapters:
 *   1. performance-rnn — an expressive event stream, plain LSTM.
 *   2. music-transformer — relative self-attention, made cheap by skewing.
 *   3. anticipatory-music-transformer — control by anticipation.
 *   4. remi — beat-aware / bar-aware tokens (Pop Music Transformer).
 *   5. unified-cross-modal — one model translating score image / notation /
 *      MIDI / audio.
 *
 * Transcribed from lecture notes (mixed zh/en) plus the paper method sections.
 */
export const symbolicMusicModelsUnit: Unit = {
  id: "symbolic-music-models",
  title: "Symbolic Music Models",
  blurb:
    "The Transformer applied to symbolic music. Performance RNN's expressive event stream, Music Transformer's relative attention, Anticipatory's control-by-anticipation, REMI's beat-aware tokens, and a single model that translates between score images, notation, MIDI, and audio.",
  chapters: [
    {
      id: "performance-rnn",
      title: "Performance RNN",
      summary:
        "Google Brain. A plain LSTM — the contribution is the data and the representation. Model a piano performance as a stream of note-on / note-off / velocity / time-shift events, trained on human competition recordings.",
      slides: [
        {
          id: "whats-new",
          title: "What's new is the data, not the model",
          blocks: [
            {
              type: "keypoints",
              items: [
                "The model is a plain **LSTM**, architecturally unremarkable.",
                "The contribution is the **training dataset** and the **musical representation**.",
              ],
            },
          ],
        },

        {
          id: "the-problem",
          title: "The problem — expression",
          lede: "The same note sequence, performed two ways, is a completely different experience.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Early symbolic generation** renders straight from the score: every note the same duration (a 16th-note grid), the same volume. It sounds robotic.",
                "**A human performance** has phrasing, rubato, dynamic swells, local breathing. Same pitches, completely different feel.",
              ],
            },
            {
              type: "prose",
              text: "So: how do you generate a multi-voice piano *performance* — with expressive timing and expressive dynamics — in symbolic / MIDI space?",
            },
          ],
        },

        {
          id: "event-stream",
          title: "Music as an event stream",
          blocks: [
            {
              type: "keypoints",
              items: [
                "`note-on` — press a pitch.",
                "`note-off` — release a pitch.",
                "`velocity change` — how loud the next notes are.",
                "`time-shift` — advance time. This is where **micro-timing** lives: a performer nudging a note slightly early or late for rubato.",
              ],
            },
            {
              type: "widget",
              widget: "perf-rnn-tokens",
              caption: "Step through the event stream and watch the notes appear on the roll as the cursor advances.",
            },
          ],
        },

        {
          id: "vocabulary",
          title: "The vocabulary — 388 events",
          blocks: [
            {
              type: "keypoints",
              items: [
                "`NOTE_ON` × 128 — one per MIDI pitch.",
                "`NOTE_OFF` × 128.",
                "`TIME_SHIFT` × 100 — 10 ms to 1 s, in 10 ms steps.",
                "`VELOCITY` × 32 — the 128 MIDI levels bucketed into 32.",
              ],
            },
          ],
        },

        {
          id: "dataset",
          title: "Why the Yamaha e-Piano Competition dataset",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Human timing and velocity** — micro-timing offsets, rubato, and local pauses are all recorded.",
                "**One instrument** — it is all piano. Mix in violin or ensemble and the timbre / articulation / technique statistics blur together.",
                "**One repertoire** — all classical competition pieces, which brings statistical consistency and coherence.",
              ],
            },
            {
              type: "keypoints",
              title: "Augmentation",
              items: [
                "Time-stretch the whole performance by up to ±5%.",
                "Transpose up or down by as much as a major third.",
                "Cut every performance into 30-second segments so training samples stay a manageable length.",
              ],
            },
          ],
        },

        {
          id: "limitations",
          title: "Limitations",
          blocks: [
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "**No long-range structure** — it starts \"noodling\" after about 30 seconds.",
                "**LSTM vanishing gradient** — even within 30 seconds, its memory of the start of the sequence is weak.",
                "**Weak control** — only a temperature knob. No way to specify key, style, or emotion.",
                "**Piano only** — a multi-instrument setting needs a different tokenisation.",
              ],
            },
          ],
        },

        {
          id: "discussion",
          title: "Class discussion",
          blocks: [
            {
              type: "discussion",
              qa: [
                {
                  q: "In this representation, what piano-performance detail is preserved, and what is lost?",
                  a: [
                    "**Preserved** — the note-level triple: onset time, duration, velocity.",
                    "**Lost** — pedalling (sustain vs sostenuto vs una corda); note decay / timbre; fingering; acoustic character (Steinway vs Yamaha, concert hall vs studio, page turns, breaths); anything visual (body motion, facial expression).",
                  ],
                },
                {
                  q: "Symbolic-space modelling vs audio-space modelling — pros and cons.",
                  a: [
                    "**Symbolic +** — interactive and compositional (real-time duet with an AI player); highly editable; timbre-flexible (one symbol stream renders to any instrument); compact, so cheaper to model.",
                    "**Symbolic −** — expressivity beyond velocity and time-shift is hard to model; no physical / acoustic detail.",
                    "**Audio +** — captures rich, subtle expression and acoustic detail with high fidelity.",
                    "**Audio −** — very hard to edit a specific note after the fact; the audio quality of a generated clip is a fixed ceiling.",
                  ],
                },
                {
                  q: "What assumptions about music does this representation bake in?",
                  a: [
                    "Music is a sequence of (pitch, velocity, duration) triples.",
                    "Those three dimensions can be adequately covered by a finite set of discrete values.",
                    "Going multi-instrument needs a vocabulary extension or an instrument token.",
                    "It does not fit **non-Western music** — MIDI's 128 pitches are Western 12-tone equal temperament, no good for guqin (press / slide / vibrato), Carnatic / Hindustani music. Even Western jazz has growl, bend, and slide that MIDI cannot hold.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "music-transformer",
      title: "Music Transformer",
      summary:
        "ICLR 2019. The first Transformer to generate music with real long-term structure. Relative self-attention captures the relative position between notes; a skewing trick drops its memory from O(L^2 D) to O(LD).",
      slides: [
        {
          id: "why-relative",
          title: "Why relative position",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Performance RNN cannot model long-range dependency or structure.",
                "The original Transformer's positional encoding is **absolute**. In music the *relative* position between notes matters — bringing a motif back later as a variation — and absolute encoding can't learn that translation symmetry.",
                "Shaw et al. 2018 gave a relative-attention scheme, but its memory is $O(L^2 D)$.",
              ],
            },
          ],
        },

        {
          id: "contribution",
          title: "The contribution",
          blocks: [
            {
              type: "keypoints",
              items: [
                "The first successful use of Transformers to generate music that exhibits **long-term structure**.",
                "Relative self-attention brought into music, made memory-efficient by **skewing** — dropping the intermediate relative-information memory from $O(L^2 D)$ to $O(LD)$.",
              ],
            },
          ],
        },

        {
          id: "shaw",
          title: "Shaw's relative attention",
          blocks: [
            {
              type: "formula",
              tex: "\\text{RelativeAttention} = \\operatorname{softmax}\\!\\left( \\frac{QK^{\\top} + S^{rel}}{\\sqrt{D_h}} \\right) V",
              caption: "$S^{rel}$ is $L \\times L$; $S^{rel}_{ij}$ encodes the relative distance from query $i$ to key $j$.",
            },
            {
              type: "keypoints",
              title: "Building $S^{rel}$",
              items: [
                "For each relative distance $r = j - i \\in \\{-L+1, \\dots, 0\\}$ (a decoder only looks back, so $r \\le 0$), learn a $D_h$-dimensional embedding.",
                "Stack them into $E^r$ of shape $(L, D_h)$.",
                "For every $(i, j)$, gather $E^r_{j-i}$ into a $(L, L, D_h)$ tensor $R$ — **that tensor is the $O(L^2 D)$ cost**.",
                "Reshape $Q$ to $(L, 1, D_h)$, then $S^{rel} = Q R^{\\top}$.",
              ],
            },
          ],
        },

        {
          id: "skewing",
          title: "The skewing trick",
          lede: "Get S^rel without ever building the (L, L, D_h) tensor.",
          blocks: [
            {
              type: "prose",
              text: "Multiply $Q$ by $E^r$ directly and you get a small $(L, L)$ matrix $Q E^{r\\top}$. But the indices are wrong: entry $(i, r)$ is \"query at position $i$\" $\\cdot$ \"the position at distance $r$\", whereas standard attention wants \"query at $i$\" $\\cdot$ \"key at $j$\". The coordinate map is $j_k = r - (L-1) + i_q$.",
            },
            {
              type: "keypoints",
              title: "The shift, with no loop",
              items: [
                "**Pad** — add a column of zeros on the left of $Q E^{r\\top}$, giving $(L, L+1)$.",
                "**Reshape** — flatten and re-form as $(L+1, L)$. Row-major ordering staggers every row by one element.",
                "**Slice** — take the last $L$ rows, all $L$ columns. That is the correctly-aligned $(L, L)$ $S^{rel}$.",
              ],
            },
            {
              type: "figure",
              figure: "skewing",
              caption: "Pad, reshape, slice — the diagonal of relative distances gets straightened into the query/key grid.",
            },
          ],
        },

        {
          id: "experiment",
          title: "Experiment setup",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**JSB Chorales** — 4-voice Bach, one matrix. Flatten the voices time-major: `S1 A1 T1 B1 S2 A2 T2 B2 …`. Each token is a pitch (or a hold / rest). 16th-note grid.",
                "**Piano-e-Competition** — the Performance RNN event vocab (128 NOTE_ON, 128 NOTE_OFF, 100 TIME_SHIFT, 32 VELOCITY).",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Why one number can't be compared",
              text: "Coconet is an Orderless NADE — its likelihood is not directly computable, only a lower bound found by averaging over many orderings. So Coconet's 0.238 cannot be put head-to-head with the Transformer's 0.357.",
            },
          ],
        },

        {
          id: "bach-nll",
          title: "Why Bach scores so much lower on NLL",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**More repetition in 16th-note space** — a soprano holding a quarter-note G means the model predicts G at times 2, 3, 4 almost for free.",
                "**A more predictable style** — strict counterpoint, with fixed cadence templates (V-I, IV-I, ii-V-I). That is a strong inductive bias.",
                "**A more predictable task** — no expression to model. The Piano Performance vocab spends **34%** of its 388 tokens on 100 time-shifts and 32 velocities, and those are hard to predict.",
              ],
            },
          ],
        },

        {
          id: "flatten-vs-delay",
          title: "Flattening vs delay, for chorales",
          blocks: [
            {
              type: "figure",
              figure: "voice-serialization",
              caption: "Flattening: emit all four voices of a timestep, then the next timestep. Delay: shift each voice one step later, so each voice stays a continuous stream.",
            },
            {
              type: "keypoints",
              items: [
                "**Flattening** (`S1 A1 T1 B1 S2 …`) — `S2` can't be predicted until `A1 T1 B1` are done, so attention has to learn a \"look every 4 tokens\" skip pattern. It trades single-voice continuity for complete per-timestep information.",
                "**Delay** — MusicGen's pattern (here called *raster scan*): shift each voice by one step, keeping every voice continuous and letting self-attention pick up the cross-voice dependency.",
                "For 4-voice fixed-duration chorales the delay pattern may fit better, because harmony and counterpoint rules are local *within* a voice.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "anticipatory-music-transformer",
      title: "Anticipatory Music Transformer",
      summary:
        "Infilling control — 'here's a melody, fill in the accompaniment' — is hard because an LM emits tokens in order. The fix: insert each control token a few seconds early, so the model anticipates it. Needs absolute-time tokens.",
      slides: [
        {
          id: "why-hard",
          title: "Why infilling control is hard",
          blocks: [
            {
              type: "prose",
              text: "**Infilling:** given some existing notes (say just the melody), the model fills in the rest (the accompaniment).",
            },
            {
              type: "keypoints",
              items: [
                "Music is **polyphonic** — several events at the same instant, tightly linked harmonically and rhythmically, not independent noise.",
                "But a language model emits tokens **one at a time**. When a melody event and an accompaniment event share a time, in what order do they go?",
                "And if the user hands you a melody and asks for accompaniment, *where* in the token sequence does the given melody sit?",
              ],
            },
          ],
        },

        {
          id: "old-fixes",
          title: "Why the old fixes fail",
          blocks: [
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "**Seq2seq** — full future context, but poor locality. An event's most relevant control is usually just a few seconds away; squashing all the global controls into one big condition makes learning harder.",
                "**Sort order** (splice control events into the sequence by time) — **no ability to anticipate**. At autoregressive inference, where a control token belongs depends on which event comes *after* it, and that event hasn't been generated yet. A stopping-time problem.",
              ],
            },
          ],
        },

        {
          id: "the-idea",
          title: "The idea — anticipation",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Don't wait for a control until its actual time. Insert it **$\\delta$ seconds early** into the sequence.",
                "The model \"foresees\" the control as it generates the events approaching that time.",
                "Some future context, but kept **local** — and it makes the sequence re-orderable.",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "Intuition",
              text: "A conductor's gesture arrives a beat before the note is played.",
            },
          ],
        },

        {
          id: "arrival-time",
          title: "Arrival-time tokenisation",
          lede: "The reordering only works if a token's time doesn't depend on its neighbours.",
          blocks: [
            {
              type: "prose",
              text: "The old **inter-arrival** tokenisation is context-sensitive: `NOTE_ON<60>, TIME_SHIFT<500>, NOTE_ON<64>` — the second note's time depends on the previous time-shift *and* the whole history, so reordering the tokens scrambles time.",
            },
            {
              type: "formula",
              tex: "x_{3i-2} = t_i, \\qquad x_{3i-1} = d_i, \\qquad x_{3i} = n_i \\qquad\\quad \\text{Event} = \\langle t_i,\\, d_i,\\, n_i \\rangle",
              caption: "Instead, each event is an absolute triple: onset time (quantised to 10 ms), duration, note. The reference is always the progress bar's 0:00.",
            },
            {
              type: "keypoints",
              items: [
                "It costs **one extra token per event**; it buys the freedom to reorder arbitrarily.",
                "Inter-arrival is a guide dog — \"3 steps forward, turn left 2 steps\". Arrival-time is a timestamped train — \"at 5.000 s, press C4\".",
              ],
            },
          ],
        },

        {
          id: "interleave",
          title: "The interleave rule",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Pick an anticipation interval $\\delta > 0$ (the paper uses 5 s).",
                "A control $u_k$ at time $s_k$ is placed right after **the first event whose time is $\\ge s_k - \\delta$**.",
              ],
            },
            {
              type: "formula",
              tex: "a_{1:N+K} = \\operatorname{interleave}_\\delta(e_{1:N},\\, u_{1:K}) \\qquad \\tau_{u_k} = k + \\arg\\min_{0 \\le j \\le N} \\{\\, t_j \\ge s_k - \\delta \\,\\}",
              caption: "$u_k$'s position = its own index among controls, plus how many events precede it.",
            },
            {
              type: "figure",
              figure: "anticipation-interleave",
              caption: "The control token for time $s_k$ is spliced in $\\delta$ ahead of where it fires.",
            },
            {
              type: "prose",
              text: "**Sampling loop:** sample an event at time $t$; while an unconsumed control has time $\\le t + \\delta$, splice it in (anticipate) and consume it; then sample the next event.",
            },
          ],
        },

        {
          id: "token-count",
          title: "Token count",
          blocks: [
            {
              type: "quiz",
              prompt: "Tokenise a 20-second MIDI file — 4 instruments, 50 notes each — with the arrival-time representation. How many tokens?",
              choices: [
                { text: "200 — one per note" },
                { text: "600 — three per note", correct: true },
                { text: "2000 — it scales with the 20 s duration" },
                { text: "can't tell without the tempo" },
              ],
              explain:
                "$4 \\times 50 = 200$ notes, $\\times 3$ tokens per note $= 600$. Arrival-time tokenisation's sequence length depends only on the event count, not the clip duration.",
            },
          ],
        },
      ],
    },

    {
      id: "remi",
      title: "REMI — Pop Music Transformer",
      summary:
        "The under-studied half of music generation is the tokenisation. MIDI-like hides bar/beat structure in accumulated time-shifts, so it drifts. REMI makes the tokens beat-aware and bar-aware: Duration, Bar + Position, Tempo, Chord.",
      slides: [
        {
          id: "the-gap",
          title: "The under-studied half",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Sequence-model music composition has two halves: **(1)** turning music into a discrete token sequence, **(2)** the ML that models the sequence.",
                "Progress on (2) is fast — sparse attention, Transformer-XL. But (1) is under-studied; everyone defaults to Oore 2018's MIDI-like vocab.",
                "This paper is about a better representation.",
              ],
            },
          ],
        },

        {
          id: "midi-like-problems",
          title: "What MIDI-like gets wrong",
          blocks: [
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "The four event types (Note-On, Note-Off, Time-Shift, Velocity) are universal but have **no explicit metrical structure**. A human doesn't think \"250 ms passed\", they think \"the *and* of beat 2\".",
                "MIDI-like hides bar / beat / subbeat inside accumulated Time-Shifts, so **one wrong Time-Shift at inference makes every later beat drift** (accumulative drift).",
                "**Note-On and Note-Off are far apart** — a dozen events between a note's start and end — so the model emits dangling Note-Ons that a post-hoc heuristic has to close.",
              ],
            },
          ],
        },

        {
          id: "redesign",
          title: "REMI — the redesign",
          lede: "REvamped MIDI-derived events. Make the tokens beat-aware and bar-aware.",
          blocks: [
            {
              type: "figure",
              figure: "remi-vs-midi",
              caption: "Note-Off → Note Duration; Time-Shift → Bar + Position; new Tempo and Chord events.",
            },
          ],
        },

        {
          id: "duration",
          title: "Duration instead of Note-Off",
          blocks: [
            {
              type: "keypoints",
              items: [
                "An explicit **Note Duration** — a multiple of a 32nd note, 1 to 64, from a 32nd note to two whole notes — so the model doesn't have to reconstruct it from Note-On + Note-Off + Time-Shift.",
                "A note becomes a contiguous triple: `Note-Velocity → Note-On → Note-Duration`. No dangling Note-Ons, no long-distance matching.",
              ],
            },
          ],
        },

        {
          id: "bar-position",
          title: "Bar + Position instead of Time-Shift",
          blocks: [
            {
              type: "keypoints",
              items: [
                "A musical beat coordinate system. `Bar` marks each bar line; `Position(k/Q)` marks the cell within the bar, with $Q = 16$ (so 1/16 to 16/16).",
                "Without a `Bar` event, the time between two notes is ambiguous.",
                "**Bonus:** cross-bar repetition is easy to learn (recurring Positions), bar-level conditioning is easy to add, and multiple tracks align to one time reference.",
              ],
            },
          ],
        },

        {
          id: "tempo-chord",
          title: "Tempo and Chord",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Tempo** — one event per beat, `Tempo Class` (low / mid / high) then `Tempo Value` (BPM), to carry rubato. Class-then-value is easier to learn than a raw BPM.",
                "**Chord** — 12 roots × 5 qualities (major / minor / diminished / augmented / dominant) = 60 events. Explicit harmonic context, more reasonable progressions, and a hook for controllability.",
              ],
            },
          ],
        },

        {
          id: "cost-control",
          title: "Cost, and control",
          blocks: [
            {
              type: "formula",
              tex: "\\underbrace{0.5}_{\\text{Bar}} + \\underbrace{1}_{\\text{Chord}} + \\underbrace{4}_{\\text{Position}} + \\underbrace{4}_{\\text{Velocity}} + \\underbrace{4}_{\\text{Note-On}} + \\underbrace{4}_{\\text{Duration}} + \\underbrace{2}_{\\text{Tempo}} = 19.5 \\text{ tokens/s}",
              caption: "For 4 notes/s at 120 BPM, 4/4, one chord. Simon/Oore's MIDI-like is $\\approx 12$ tokens/s. So in a 4096-token window REMI covers *less* music time — hence later work on compressing REMI.",
            },
            {
              type: "keypoints",
              title: "Control",
              items: [
                "**The professor's trick** — whenever the model emits a new `Bar` token, inject the user's chord token into that measure, then keep generating.",
                "Also: tempo-class switches; chord-progression templates (ii-V-I) injected at chosen bars; velocity-range limits for pp / ff sections.",
              ],
            },
          ],
        },

        {
          id: "discussion",
          title: "Class discussion",
          blocks: [
            {
              type: "discussion",
              qa: [
                {
                  q: "From Table 3, which single change most helps rhythmic stability?",
                  a: [
                    "Replacing the **Note-On / Note-Off pair with a single duration event**. The pair forced the model to learn two positions and the long-range link between them.",
                    "**Professor** — this is arguably the paper's most important finding, and the write-up under-emphasises it.",
                  ],
                },
                {
                  q: "Is Figure 1's \"regularly-spaced downbeats\" convincing?",
                  a: [
                    "The downbeat-probability curve looks regular, but that may reflect the beat-tracking / REMI-style generation rather than human beat perception.",
                    "**Professor** — personally, I don't think the \"regular spacing\" is even that clear in the figure. A fairer test uses a different beat tracker.",
                  ],
                },
                {
                  q: "Beat-based vs time-based tokenisation.",
                  a: [
                    "**Pros** — emphasises downbeat accents; easier to learn phrasing.",
                    "**Cons** — depends on a reliable beat tracker (compute-heavy); loses each performer's expressive timing.",
                  ],
                },
                {
                  q: "Other points.",
                  a: [
                    "Multi-instrument: add `Instrument` tokens (longer sequence) or widen `Note-On` to carry pitch + instrument (bigger vocab). MMM, Pop1K7, Compound Word Transformer all take the first route.",
                    "If the beat tracker were essentially random, the whole pipeline would break — it depends heavily on beat-detection reliability.",
                    "The Bitter Lesson says scale wins long-term, but for a task-specific model, if you already know how to hand it domain knowledge, there's little reason to make it re-learn that.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "unified-cross-modal",
      title: "Unified Cross-modal Translation",
      summary:
        "Score image, notation, MIDI, audio — four representations, and every pair is a classic MIR task usually solved by a separate model. One multi-task seq2seq Transformer does them all, and the shared training helps each task.",
      slides: [
        {
          id: "four-modalities",
          title: "Four modalities, one spectrum",
          blocks: [
            {
              type: "figure",
              figure: "modality-spectrum",
              caption: "Audio ↔ MIDI = AMT · Notation ↔ Image = OMR · Audio ↔ Notation = performance-to-score · MIDI ↔ Notation = performance modelling · MIDI → Audio = synthesis.",
            },
            {
              type: "keypoints",
              items: [
                "Western music has four representations — **Audio, MIDI, Symbolic Notation (MusicXML), Score Image** — and each pair is a traditional MIR task.",
                "Each has always been a separate specialist, or a chain of specialists with no shared knowledge.",
              ],
            },
          ],
        },

        {
          id: "the-bet",
          title: "The bet — one multi-task seq2seq model",
          blocks: [
            {
              type: "formula",
              tex: "V^{*} = V_1 \\cup V_2 \\cup V_3 \\cup V_4",
              caption: "One token space across all four modalities, one model.",
            },
            {
              type: "keypoints",
              items: [
                "The four modalities are **continuous on a modal spectrum**, with strong causal links between neighbours — so multi-task training creates synergy. Learning MIDI→Audio helps OMR, because both need note-level understanding.",
                "Also the first score-image → music generation.",
                "New dataset — **YouTube Score Video (YTSV)**: over 1,300 hours of paired score images + performance audio, an order of magnitude bigger than anything before.",
              ],
            },
          ],
        },

        {
          id: "tokenization",
          title: "Tokenising each modality",
          blocks: [
            {
              type: "figure",
              figure: "vertical-flatten",
              caption: "A staff system is read top-to-bottom as a unit, so score-image patches are flattened vertical-first, not row-major.",
            },
            {
              type: "keypoints",
              items: [
                "**Score image** — RQ-VAE, 4 unshared codebooks × 1024, conv-only so each token is local; **vertical-first flattening**; augmented with 8 horizontal + 4 vertical shifts.",
                "**Audio** — Descript Audio Codec (DAC), narrowed from 9 codebooks to 4 for the classical domain; ~86 tokens/s.",
                "**Notation** — Linearised MusicXML: shorter than MusicXML, keeps the notation-level information (slurs, voicing, articulation) that MIDI drops.",
                "**MIDI** — MT3-style tokens: instrument ids, pitches, note on/off, 10 ms time markers.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Why not just MIDI",
              text: "MusicXML encodes everything needed to render Western sheet music and keeps the symbolic side (a slur in a piano part). MIDI is performance-focused — duration, note, velocity.",
            },
          ],
        },

        {
          id: "architecture",
          title: "Architecture",
          lede: "Encoder-decoder Transformer, 12 + 12 layers, dim 1024, FFN 4096, 16 heads.",
          blocks: [
            {
              type: "figure",
              figure: "unified-arch",
              caption: "Two identical (non-shared) encoder-decoder Transformers, one per direction, each with a small sub-decoder for the multi-codebook outputs.",
            },
            {
              type: "formula",
              tex: "e_i = \\operatorname{TokEmb}\\!\\big(z_i^{(X)}\\big) + \\operatorname{PosEmb}_X(i) + \\operatorname{TgtEmb}_Y",
              caption: "**Target-modality embedding** — the last term tells the encoder which output type is wanted, since the same audio could go to MIDI *or* to an image.",
            },
            {
              type: "keypoints",
              title: "Sub-decoder",
              items: [
                "Image and audio have $d = 4$ codebook tokens per step; flattening them would make the sequence 4× longer.",
                "A **one-layer Transformer sub-decoder** takes the main decoder's hidden state $h_t$ and causally emits the 4 codebook tokens for that step.",
              ],
            },
          ],
        },

        {
          id: "training",
          title: "Training",
          blocks: [
            {
              type: "keypoints",
              items: [
                "One unified model turned out **unstable**, so it is split into two identical, non-shared encoder-decoder Transformers:",
                "**I2A** — OMR (Image→Notation), MIDI→Audio, Image→Audio.",
                "**A2I** — AMT (Audio→MIDI), Notation→Image, Audio→Image.",
                "**Curriculum learning** over 600k steps — OMR and AMT from step 0, the harder cross-modal directions phased in later.",
              ],
            },
            {
              type: "formula",
              tex: "\\mathcal{L}(\\theta) = -\\sum_{t=1}^{L_Y} \\begin{cases} \\sum_{\\ell=1}^{d} \\log P_\\theta\\big(z_{t,\\ell}^{(gt)} \\mid z_{<t,*}^{(gt)}, H\\big), & Y \\in \\{\\mathcal{I}, \\mathcal{A}\\} \\\\[1ex] \\log P_\\theta\\big(z_{t,1}^{(gt)} \\mid z_{<t,1}^{(gt)}, H\\big), & Y \\in \\{\\mathcal{N}, \\mathcal{M}\\} \\end{cases}",
              caption: "Sum over the 4 codebooks for image/audio targets; a single token for notation/MIDI targets.",
            },
          ],
        },

        {
          id: "dataset",
          title: "The dataset",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**YouTube score-following videos** are naturally sparse-aligned: a creator hand-cuts the score into slides (2–3 staff rows each) whose switch times line up with the audio.",
                "12,217 videos, 1,341 hours → **433,920 image-audio pairs**.",
              ],
            },
          ],
        },

        {
          id: "discussion",
          title: "Class discussion",
          blocks: [
            {
              type: "discussion",
              qa: [
                {
                  q: "The modality balance in the combined dataset.",
                  a: [
                    "Image $\\approx$ 1425 h, Audio $\\approx$ 1732 h, MIDI $\\approx$ 391 h, **MusicXML only $\\approx$ 84 h**.",
                    "Thin pairs: (MXL, MIDI), (MXL, Audio), (Image, MIDI). Solid pairs: (Image, MXL), (MIDI, Audio).",
                  ],
                },
                {
                  q: "Why make the model read score *images*, not just MIDI / MusicXML?",
                  a: [
                    "Score images are how music is actually shared and distributed, so there is far more training data.",
                    "A system that reads score images integrates with real musical practice.",
                  ],
                },
                {
                  q: "Can you find your favourite song's score video on YouTube?",
                  a: [
                    "Classical piano solo, string quartet, piano trio, concerto — plenty.",
                    "Modern pop — essentially none. That caps the model's generalisation.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
