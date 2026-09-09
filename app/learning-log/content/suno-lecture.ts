import type { Unit } from "./types";

/**
 * Unit 5 — "Suno — a guest lecture" (course §3, a transition chapter).
 *
 * A survey lecture from Sara Adkins (Suno ML engineer + artist in residence):
 * why ML in music, how the architectures evolved, symbolic vs audio
 * representations, the model zoo (MusicLM, Stable Audio), and then the messy
 * engineering reality of running a generative-music product at scale.
 *
 * Transcribed from lecture notes (mixed zh/en). A lot of the RNN / Transformer /
 * codec / diffusion material recaps earlier units — kept light here, with the
 * platform war-stories as the distinctive part.
 */
export const sunoLectureUnit: Unit = {
  id: "suno-lecture",
  title: "Suno — a guest lecture",
  blurb:
    "A guest lecture from Sara Adkins (Suno ML engineer + artist in residence). Why ML in music, how the architectures got here, symbolic vs audio, and the engineering reality of running a generative-music product at scale.",
  chapters: [
    {
      id: "why-and-history",
      title: "Why ML in music, and how we got here",
      summary:
        "Four things ML is good for in music. Then the historical arc — the core has always been 'use a rule to generate a sequence', and only the rules, the representation, and the generation mode changed.",
      slides: [
        {
          id: "use-cases",
          title: "Four things ML is good for in music",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Idea generation** — break writer's block with melody options; explore how to continue a phrase or connect two phrases; restyle one melody into another genre quickly.",
                "**Polish & audition** — turn a hum or a tapped rhythm into a finished-sounding track (demo → product).",
                "**Performance partners** — a model that 'hears what you play' and responds like an improv partner.",
                "**Software instruments & timbre transfer** — replace pure synthesis (can sound fake) or sampling (expensive to produce); invent new timbres through inference controls.",
              ],
            },
          ],
        },

        {
          id: "the-constant",
          title: "The core has always been the same",
          lede: "Generative music = use some probability / rule to generate a sequence. Only three things changed.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**The rules** — handwritten → statistical (Markov) → neural (RNN / Transformer).",
                "**The data representation** — symbolic notes → audio (waveform / spectrogram / compressed tokens).",
                "**The generation mode** — token-by-token autoregression → whole-block diffusion.",
              ],
            },
            {
              type: "figure",
              figure: "gen-music-timeline",
              caption: "1700s musical dice games · 1950s Markov models · early-2000s LSTMs · late-2010s Transformers · early-2020s diffusion.",
            },
            {
              type: "aside",
              variant: "note",
              title: "Brian Eno, *Generative Music 1* (1996)",
              text: "Released on a floppy disk, made with SSEYO Koan Pro. \"All my ambient music is based on one idea: you can design a system, a set of rules, and once you start it, it keeps generating music for you.\" Sara's own work puts a performer and an algorithm in a loop, each reacting to the other — a second player shapes density / tempo with a MIDI controller, and some sections are left for the algorithm to solo.",
            },
          ],
        },

        {
          id: "markov-vs-dl",
          title: "Markov chains vs deep learning",
          blocks: [
            {
              type: "keypoints",
              title: "Markov chains",
              items: [
                "Train on almost nothing — even a single song.",
                "Short context — 1 to 3 notes.",
                "Runs instantly.",
                "Low quality — only learns surface patterns.",
              ],
            },
            {
              type: "keypoints",
              title: "Deep learning",
              items: [
                "Huge training data — 10 to 1000 hours, needs millions of labelled examples.",
                "Long context — minutes, and growing.",
                "Expensive to compute.",
                "High quality, and it generalises.",
              ],
            },
          ],
        },

        {
          id: "hard-problem",
          title: "Creative AI is a hard problem",
          blocks: [
            {
              type: "keypoints",
              items: [
                "ML training needs an **objective function** — a quantifiable good / bad signal. Classification and translation have a ground truth.",
                "Art does not. Aesthetics are subjective; taste differs by person.",
                "\"Similarity to training examples\" *is* quantifiable — but it is not the same as *novel / catchy / good*.",
                "Loss and \"sounds good\" have no direct mapping. In the end you listen.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "representations-zoo",
      title: "Representations & the model zoo",
      summary:
        "Symbolic vs audio — and how different their data sizes are. Neural audio codecs shrink audio into 50–100 tokens a second. Then MusicLM and Stable Audio as two points in the design space.",
      slides: [
        {
          id: "symbolic-vs-audio",
          title: "Symbolic vs audio",
          blocks: [
            {
              type: "keypoints",
              title: "Symbolic — MIDI / MusicXML / score",
              items: [
                "Compact: 1 minute, 4 voices, eighth-notes ≈ **5 KB**.",
                "Easy to model — only a few tokens per second.",
                "Loses timbre and performance detail.",
              ],
            },
            {
              type: "keypoints",
              title: "Audio",
              items: [
                "Waveform ≈ **10 MB / min** (stereo, 44.1 kHz).",
                "Spectrogram ≈ **20 MB / min** (1024 window, 512 hop) — carries timbre and harmony, still huge.",
                "Early attempts: SampleRNN; Holly Herndon's *Proto* (2019) used a \"Spawn\" AI for an alien-sounding voice.",
              ],
            },
          ],
        },

        {
          id: "neural-codecs",
          title: "Neural audio codecs",
          lede: "The fix for audio's size — and the reason a Transformer can model music at all.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Train an embedding network to learn a compression format. The embedding space also lets you compare chunk similarity — useful for retrieval, conditioning, and alignment.",
                "**Encoder** → low-frame-rate discrete tokens. **RVQ quantizer** → codebook indices. **Decoder** → audio.",
                "Bitrate: hi-fi MP3 ≈ 300 kbps, lossless WAV ≥ 1411 kbps; a neural codec reaches near-MP3 *subjective* quality at a **lower** bitrate.",
              ],
            },
            {
              type: "figure",
              figure: "rvq-residual",
              caption: "The RVQ stack again — each codebook quantizes the previous one's residual.",
            },
            {
              type: "keypoints",
              tone: "result",
              items: [
                "The payoff: the generative model now handles **50–100 tokens per second** instead of 44,100 samples.",
              ],
            },
          ],
        },

        {
          id: "musiclm",
          title: "MusicLM",
          lede: "Google 2023, Transformer-based text→music. Encode audio to compressed tokens, generate in stages.",
          blocks: [
            {
              type: "keypoints",
              title: "Three token types",
              items: [
                "**MuLan tokens** — from a joint audio–text embedding, RVQ-quantized.",
                "**Semantic tokens** — from w2v-BERT's intermediate layer, then k-means quantized.",
                "**Acoustic tokens** — from a SoundStream encoder + RVQ.",
              ],
            },
            {
              type: "figure",
              figure: "musiclm-stages",
              caption: "MuLan → semantic modelling → semantic tokens → acoustic modelling → acoustic tokens → SoundStream decoder → audio.",
            },
            {
              type: "keypoints",
              title: "Text conditioning",
              items: [
                "Audio and text are mapped into **one shared embedding space** (MuLan), trained on (audio, text) pairs so matched pairs sit close together.",
                "So you can prompt with **either** text or audio — both become a vector in the same space.",
              ],
            },
          ],
        },

        {
          id: "transformers-vs-diffusion",
          title: "Transformers vs diffusion",
          blocks: [
            {
              type: "keypoints",
              title: "Transformers",
              items: [
                "Text-promptable. Output length is **hard to control**.",
                "Need discrete tokens in.",
                "Generation is **sequential** — attention shapes what comes next.",
                "Memory-heavy.",
              ],
            },
            {
              type: "keypoints",
              title: "Diffusion",
              items: [
                "Text-promptable. Output length is **usually fixed**.",
                "Takes continuous input.",
                "Generates a **whole block at once** — not strictly ordered.",
                "Compute-heavy.",
              ],
            },
            {
              type: "figure",
              figure: "stable-audio-arch",
              caption: "Stable Audio: a frozen CLAP text encoder plus seconds_start / seconds_total embedders produce prompt + timing features; the diffusion U-Net denoises a latent; the VAE decoder returns audio.",
            },
          ],
        },
      ],
    },

    {
      id: "building-a-platform",
      title: "Building a generative music platform",
      summary:
        "The engineering reality — inference cost, evaluation you can't automate, bots, dataset bias. And the weird, delightful things users do with a model that has bugs.",
      slides: [
        {
          id: "challenges",
          title: "Challenges at scale",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Inference efficiency** — hundreds of requests a second, no downtime allowed. Optimise inference speed aggressively or the GPU bill explodes; a core ML-team focus.",
                "**Meaningful evaluation** — low loss ≠ catchy or interesting. Scoring \"good\", \"diverse\", \"cover quality\" still comes down to human listening plus internal metrics.",
                "**Botting** — users fake play counts and steal API access.",
                "**Diversity & bias** — the dataset skews Western; low-resource languages and niche genres are hard to evaluate (Suno leans on Discord community feedback).",
                "**User guidance** — how do you teach people to use a complex AI tool?",
              ],
            },
          ],
        },

        {
          id: "weird-users",
          title: "Weird user behaviour",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**\"The Shimmer\"** — Suno v4 had a bug producing a harsh ~12 kHz sizzle. Users loved it, called it \"Shimmer\" or \"Laser\", and tried to prompt for it on purpose.",
                "**Weird genre combos** — users love combinations absent from the training data: \"1940s Techno\", \"Baroque Dubstep\".",
                "**Negative prompting** — built to strip guitar or vocals. Users found that `[Negative: Music, Notes, Harmony, Melody]` makes the model collapse into interesting glitch / noise textures. Sara likes this too.",
              ],
            },
          ],
        },

        {
          id: "journeys",
          title: "User journeys, and a question about creativity",
          blocks: [
            {
              type: "keypoints",
              title: "Harp → glitch music box",
              items: [
                "Generate a classical harp piece → **Cover** it into an electronic \"glitch music box\" melody → **Extend** into new sections → **Negative Prompt** for a pure-noise texture → import into a DAW (Ableton), add processing, drums, synths.",
              ],
            },
            {
              type: "keypoints",
              title: "Video-game score remix",
              items: [
                "Upload a game score → generate a \"Melodic Techno\" version → generate a \"Shostakovich String Quartet\" version → AI helps break genre comfort zones.",
              ],
            },
            {
              type: "discussion",
              qa: [
                {
                  q: "Is this real creativity?",
                  a: [
                    "**Sara** — today's models mostly **interpolate** existing genres and ideas. Nobody has yet seen real **extrapolation** — a genuinely new musical form outside the training distribution.",
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
