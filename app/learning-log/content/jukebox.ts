import type { Chapter } from "./types";

/**
 * Latent Generation · §1.2 — Jukebox (OpenAI, Dhariwal+ 2020).
 *
 * The concrete case study for the two-stage paradigm from §1.1: a *codec language
 * model*. Stage 1 is a hierarchy of VQ-VAEs that turn raw audio into three
 * streams of discrete tokens; Stage 2 is a cascade of sparse-attention
 * Transformers that model those token streams autoregressively, conditioned on
 * artist / genre / lyrics / timing. Transcribed from lecture notes (mixed
 * zh/en) plus the paper's method sections (VQ-VAE internals skimmed).
 */
export const jukeboxChapter: Chapter = {
  id: "jukebox",
  title: "Jukebox — a codec language model",
  summary:
    "The first model to generate realistic music audio in broad styles with artist / genre / lyrics control. A concrete instance of two-stage latent generation: a hierarchy of VQ-VAEs for the codec, a cascade of sparse Transformers for the prior.",
  slides: [
    {
      id: "what",
      title: "What Jukebox is",
      lede: "First music AI to generate realistic audio across broad acoustic styles with novel control inputs.",
      blocks: [
        {
          type: "prose",
          text: "**Jukebox** (OpenAI, 2020) is the first model to generate realistic *music audio* — not MIDI, not a piano roll, actual waveform — across broad acoustic styles, with **novel control inputs**: artist, genre, timing, and lyrics.",
        },
        {
          type: "keypoints",
          title: "Where it sits",
          items: [
            "On the technical map it is a **codec language model** — §1.1's two-stage recipe with *discrete* latents and an autoregressive prior.",
            "In the generative-AI timeline: 2020, after Music Transformer (2019) and MuseNet, before the diffusion wave (Riffusion, 2022).",
            "Predecessors were **narrow**: WaveNet (van den Oord+ 2016) — unconditional; Hawthorne+ 2019 — MIDI-conditioned piano only.",
          ],
        },
        {
          type: "aside",
          variant: "note",
          title: "Why cover it right after the latents blog",
          text: "Jukebox is the cleanest worked example of \"compress to a latent, then model the latent.\" Every abstract knob from §1.1 — rate, curation, modelability, the two decoupled stages — shows up here as a concrete design decision.",
        },
      ],
    },

    {
      id: "why-hard",
      title: "Why raw-waveform music generation is hard",
      lede: "The task: generate $x \\in [-1, 1]^T$ directly, where $T$ is millions of samples.",
      blocks: [
        {
          type: "formula",
          tex: "x \\in [-1, 1]^{T}, \\qquad T = \\text{duration} \\times f_s, \\quad f_s \\in [16\\,\\text{kHz},\\, 48\\,\\text{kHz}]",
          caption: "4 minutes of CD-quality audio (44.1 kHz, 16-bit) is roughly $10^{7}$ time steps.",
        },
        {
          type: "keypoints",
          title: "a · Can't compute — 算力贵",
          tone: "warn",
          items: [
            "Sequence length is enormous, so training and sampling cost climb steeply with clip duration.",
            "In the raw representation you are immediately in the **millions of tokens / steps** regime.",
          ],
        },
        {
          type: "keypoints",
          title: "b · Can't learn — 学不会",
          tone: "warn",
          items: [
            "Modeling raw audio introduces **extreme long-range dependency** — the paper's stated *key bottleneck* — so high-level musical semantics (melody, section structure) are computationally very hard to capture.",
            "The model also has to span every scale at once — timbre and transients up to global coherence — while staying diverse. That widens the learning problem further.",
          ],
        },
      ],
    },

    {
      id: "two-stage",
      title: "Core idea — split generation into two stages",
      blocks: [
        {
          type: "keypoints",
          title: "Stage 1 · Representation",
          items: [
            "Use a **VQ-VAE** to compress raw audio $x$ into a discrete token sequence $z$.",
            "Goal — throw away information the ear does not care about, keep most of the musical content, and so shrink the compute and learning cost of the next stage.",
            "Train a **hierarchy of discrete autoencoders** at increasing resolution: Top 128×, Middle 32×, Bottom 8× downsampling.",
            "Encode the whole training set with each autoencoder → three levels of discrete codes.",
          ],
        },
        {
          type: "keypoints",
          title: "Stage 2 · Generative modeling",
          items: [
            "Train a **cascade of language models** (Transformers) to learn the probability distribution of music *in token space*.",
            "Generation = autoregressive sampling **+ progressive upsampling**: a **top-level prior** writes the melodic skeleton in the 128× space; **upsamplers** fill in detail conditioned on the level above.",
            "Control is injected the whole way through: **artist / genre / lyrics / timing**.",
          ],
        },
        {
          type: "aside",
          variant: "intuition",
          title: "Inference in one line",
          text: "Sample top-level tokens from the prior, upsample them down to the bottom level, then run only the highest-resolution decoder to get audio.",
        },
      ],
    },

    {
      id: "vqvae",
      title: "Stage 1 — the Music VQ-VAE",
      lede: "Based on VQ-VAE-2. Encode a length-T waveform into a length-S sequence of codebook indices.",
      blocks: [
        {
          type: "formula",
          tex: "h_t = E(x_t) \\qquad z_t = \\arg\\min_k \\lVert h_t - e_k \\rVert \\qquad \\hat{x}_t = D(e_{z_t})",
          caption: "Encoder → nearest-codebook-vector (the bottleneck) → decoder.",
        },
        {
          type: "figure",
          figure: "vqvae-quantize",
          caption: "The round trip: continuous latent $h$, snapped to the nearest codebook entry, decoded back to a waveform.",
        },
        {
          type: "keypoints",
          title: "Representation & notation",
          items: [
            "**Hop length** $= T / S$ — how many raw samples each token covers. Bigger hop → fewer tokens → each token spans more time.",
            "**Codebook size** $K = 2048$ per level.",
            "Encoder $E(x)$ emits a continuous latent $h$; the **bottleneck** quantizes each $h_s$ to its nearest codebook vector $e_{z_s}$; the decoder $D(e)$ rebuilds the waveform.",
          ],
        },
        {
          type: "formula",
          tex: "L = L_{\\text{recons}} + L_{\\text{codebook}} + \\beta\\, L_{\\text{commit}}",
          caption: "Reconstruction distance + pull the codebook toward the encoder (updated by EMA) + keep the encoder from drifting off its chosen code ($\\beta$ sets how hard).",
        },
      ],
    },

    {
      id: "hierarchy",
      title: "Why three separate VQ-VAEs, not one hierarchical one",
      blocks: [
        {
          type: "keypoints",
          title: "Hierarchy collapse",
          tone: "warn",
          items: [
            "In a single multi-level VQ-VAE the **bottom level reconstructs almost perfectly, fast** — so the model dumps all the information there and the upper levels go unused or collapse entirely.",
            "The model is *lazy*: if looking only at the detail level already rebuilds the sound, the top-level tokens become waste paper.",
          ],
        },
        {
          type: "keypoints",
          title: "The fix",
          tone: "result",
          items: [
            "Train **three independent VQ-VAEs** with different hop lengths, one per prior.",
            "Top / Middle / Bottom hop = **128 / 32 / 8**. So the top token rate is $44100 / 128 \\approx 345$ Hz — the lowest rate, the longest time span per token.",
          ],
        },
        {
          type: "widget",
          widget: "jukebox-cascade",
          caption: "Each level's token rate, and how many seconds a fixed context window buys you at that level.",
        },
        {
          type: "discussion",
          title: "Class discussion",
          qa: [
            {
              q: "Why not train just one 8× (finest) VQ-VAE and subsample its tokens to get the 32× and 128× streams?",
              a: [
                "Different compression rates can produce **fundamentally different representations** — subsampling is not a substitute for a purpose-trained low-rate codec.",
                "The 8× tokens are optimized to carry short-time detail (timbre texture, transients); their \"semantic unit\" is fine-grained.",
                "Subsampled coarse tokens tend to **alias / lose information**, and they do not naturally line up with the slower-varying structure (harmonic progression, section outline).",
                "You end up with tokens that *look* sparser but were never shaped for coarse modeling — Stage 2 can actually get harder.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "stage1-tricks",
      title: "Stage-1 engineering — codebook collapse & high frequencies",
      blocks: [
        {
          type: "keypoints",
          title: "Codebook collapse",
          items: [
            "Many codes stop being used, so effective codebook capacity drops.",
            "**Fix — random restarts:** if a code's average usage falls below a threshold, reset it to a random encoder output from the current batch, forcing it back to life.",
          ],
        },
        {
          type: "prose",
          text: "A pure **sample-level L2** reconstruction loss preferentially fits low frequencies (that is where signal energy sits), so reconstructions come out **muddy / muffled**.",
        },
        {
          type: "formula",
          tex: "L_{\\text{spec}} = \\mathbb{E}_x\\!\\left[\\; \\sum_i \\big\\lVert\\, |\\text{STFT}_i(x)| - |\\text{STFT}_i(\\hat{x})| \\,\\big\\rVert_2 \\;\\right]",
          caption: "Multi-resolution spectral loss — compare magnitude spectra at several window sizes.",
        },
        {
          type: "keypoints",
          items: [
            "**Phase is ignored on purpose.** Phase is messy and hard to learn, and the ear is barely sensitive to small phase shifts — but very sensitive to the **magnitude** (energy) distribution.",
            "Matching magnitude only gives the model room to focus on rebuilding **timbre and harmonic structure**.",
            "It acts like a high-pass compensation: the decoder is forced to produce the high-frequency oscillation that gives real instruments their texture.",
          ],
        },
        {
          type: "aside",
          variant: "analogy",
          title: "The image parallel",
          text: "Spectral loss is the audio version of a perceptual loss. In images you ask \"does this ear look like an ear?\"; in audio you ask \"is this pitch in tune?\" The side effect of pushing brightness up is some scratchy, metallic noise.",
        },
      ],
    },

    {
      id: "priors",
      title: "Stage 2 — priors & upsamplers",
      lede: "One factorization of p(z), trained as three separate models.",
      blocks: [
        {
          type: "formula",
          tex: "p(z) = p(z^{\\text{top}})\\; p(z^{\\text{mid}} \\mid z^{\\text{top}})\\; p(z^{\\text{bot}} \\mid z^{\\text{mid}}, z^{\\text{top}})",
          caption: "A top **prior** plus two **upsamplers**, each an autoregressive Transformer.",
        },
        {
          type: "figure",
          figure: "jukebox-cascade-flow",
          caption: "Sample top tokens, upsample to middle, upsample to bottom, decode. Only the bottom codes are decoded to audio.",
        },
        {
          type: "keypoints",
          items: [
            "Sampling: $z_T' \\sim P_T(z_T)$, then $z_M' \\sim P_M(z_M \\mid z_T')$, then $z_B' \\sim P_B(z_B \\mid z_M', z_T')$. Output audio $= \\text{Dec}_B(z_B')$.",
            "The intermediate $z_T'$ and $z_M'$ are **discarded** — byproducts. Their own decoders exist but are only used for debugging / listening.",
          ],
        },
      ],
    },

    {
      id: "context-length",
      title: "Why a cascade — the context-length argument",
      blocks: [
        {
          type: "prose",
          text: "A Transformer can afford some fixed context, say **8192 tokens**. Because the three levels have different token rates, that same 8192-token window covers very different amounts of *music*.",
        },
        {
          type: "keypoints",
          items: [
            "$P_T(z_T)$ — 8192 tokens $\\approx$ **23.7 s** of audio.",
            "$P_M(z_M \\mid z_T)$ — 8192 tokens $\\approx$ **5.9 s**.",
            "$P_B(z_B \\mid z_M, z_T)$ — 8192 tokens $\\approx$ **1.5 s**.",
          ],
        },
        {
          type: "prose",
          text: "Train a bottom-level LM alone and it only ever sees ~1.5 s — no chance of learning long-range musical structure. The cascade spends a fixed compute budget learning **long structure at the top**, then fills in detail level by level.",
        },
        {
          type: "keypoints",
          title: "Architecture details",
          items: [
            "**Sparse attention** (Child+ 2019): plain self-attention will not fit 8192 tokens, so reshape the 1-D sequence to 2-D (e.g. 128×64) and stack axis-aligned patterns — previous-row / current-row / column.",
            "**Upsampler conditioning:** the level-above tokens pass through a conditioning network (a deep residual WaveNet), get strided-conv upsampled to the current length, and are added to the token embeddings as an extra positional / conditioning signal.",
          ],
        },
      ],
    },

    {
      id: "conditioning",
      title: "Conditioning — artist, genre, timing, lyrics",
      lede: "The control signal c is live through the whole cascade; still only the bottom codes get decoded.",
      blocks: [
        {
          type: "formula",
          tex: "z_T' \\sim P_T(z_T \\mid c) \\quad z_M' \\sim P_M(z_M \\mid z_T', c) \\quad z_B' \\sim P_B(z_B \\mid z_M', z_T', c)",
          caption: "$c$ = artist / genre / lyrics / timing.",
        },
        {
          type: "keypoints",
          title: "Artist / genre",
          items: [
            "Closed-vocabulary labels, embedded and added to every position's token embedding (or fed as an extra conditioning input).",
            "**Observation:** the artist embedding dominates genre. Prompt a country singer with a hip-hop / punk genre and it still comes out country — genre struggles to pull it away.",
            "Voice / style is a **strong** condition; genre is a **weak** one. Controllability is captured by whatever factor the model has learned to correlate with most strongly.",
          ],
        },
        {
          type: "keypoints",
          title: "Timing",
          items: [
            "Total song duration, chunk offset, and relative chunk offset.",
            "The top prior knows *how far into the song it is*, so it can imitate beginnings, middles, and ends — the intro → verse → bridge → outro macro-shape.",
          ],
        },
        {
          type: "keypoints",
          title: "Lyrics",
          items: [
            "Without lyrics conditioning the model sings **melodically shaped babbling**. Recognizable words need it made explicit.",
            "Hard because lyric-to-vocal alignment is loose (melisma, rhythm), and in the target audio the vocal is **mixed with the accompaniment**, not isolated.",
            "**Solution:** forced alignment to find each chunk's lyric span; a character-level lyrics encoder (pretrained, then attached); the top prior becomes a **seq2seq** model — encoder-decoder attention lets the music tokens attend to the lyrics encoder.",
            "**Training:** train the lyrics-free top prior first, then *model surgery* — splice in the lyrics encoder / cross-attention (about two more weeks), with the new modules **zero-initialized** so they start as an identity and do not wreck the existing music model.",
          ],
        },
        {
          type: "discussion",
          qa: [
            {
              q: "Why inject lyrics at the top prior rather than a lower level?",
              a: [
                "The top level carries the longer-timescale semantics and structure, which is where lyric content belongs.",
                "Aligning lyrics against low-level tokens means extremely long sequences and much more alignment noise — harder to train.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "criticism",
      title: "Criticisms & how you would evaluate it",
      blocks: [
        {
          type: "keypoints",
          title: "Criticisms",
          tone: "warn",
          items: [
            "**No real evaluation** — no quantitative metrics, no third-party qualitative study. Human listening only.",
            "**Slow.** \"The current model takes around an hour to generate 1 minute of top-level tokens\"; upsampling adds ~8 hours and runs sequentially.",
          ],
        },
        {
          type: "discussion",
          title: "How would you design a more rigorous evaluation?",
          qa: [
            {
              q: "Condition consistency / controllability",
              a: [
                "Genre / artist: train a separate classifier or retriever and check whether generated audio lands in the target category's distribution.",
                "Lyrics: ASR / lyric recognizer + an alignment score. Lyric recognition is itself hard, so cross several metrics.",
              ],
            },
            {
              q: "Audio quality (perceptual)",
              a: [
                "**FAD** — Fréchet Audio Distance.",
                "Multi-resolution spectral statistics; bandwidth coverage — does the top end collapse?",
              ],
            },
            {
              q: "Musical structure (long-range coherence)",
              a: [
                "Detect repeated sections / theme returns (chorus-repeat).",
                "Rhythm stability, key drift, whether section boundaries land in sensible places.",
              ],
            },
            {
              q: "Diversity & mode collapse",
              a: [
                "Coverage of an embedding space (e.g. a music self-supervised representation).",
                "Same-condition diversity vs. cross-condition separability.",
              ],
            },
            {
              q: "Memorization / copyright risk",
              a: [
                "Nearest-neighbour retrieval similarity distribution, membership inference, training-set leakage tests.",
              ],
            },
            {
              q: "Inference is too slow — what would speed it up?",
              a: [
                "A three-stage **parallel pipeline**: as soon as stage i−1 has produced enough context, stage i starts decoding, instead of waiting for the whole level to finish.",
              ],
            },
          ],
        },
      ],
    },
  ],
};
