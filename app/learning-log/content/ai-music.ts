import { musicTheoryUnit } from "./music-theory";
import type { Course } from "./types";

/**
 * Notes from CMU's deep-learning-for-music course, rebuilt as an interactive
 * guide. Three units so far:
 *   1. Music Theory Fundamentals — the vocabulary (notes, scales, chords,
 *      rhythm, timbre) the rest of the course assumes. (Lecture 0.)
 *   2. Digital Audio — how a continuous pressure wave becomes an array, and how
 *      the Fourier family lets us see it as frequency over time.
 *   3. Latent Generation — why modern generative models work in a learned latent
 *      space instead of on raw pixels/samples, and what that costs.
 */
export const aiMusic: Course = {
  id: "ai-music",
  title: "AI for Music",
  source: "CMU · Deep Learning for Music",
  about:
    "My study notes from a CMU graduate course, rebuilt as something you can read *or* click through — and I'm learning most of it as I build it. Music-theory fundamentals, digital audio with live demos, then the theory behind latent generative models. Everything is transcribed from lecture notes and the Dieleman latents blog.",
  units: [
    musicTheoryUnit,
    // ────────────────────────────────────────────────────────────────────
    {
      id: "digital-audio",
      title: "Digital Audio Crash Course",
      blurb:
        "A computer never *hears* music — it reads numbers. Two lossy approximations turn a smooth pressure wave into an array, and the Fourier transform turns that array into something shaped like perception.",
      chapters: [
        // ── 1.1 ────────────────────────────────────────────────────────
        {
          id: "digitize",
          title: "Digitize: Sampling + Quantization",
          summary:
            "Sound is a continuous function x(t). Storage needs discrete numbers. Sampling makes *time* discrete; quantization makes *amplitude* discrete. Both throw information away.",
          slides: [
            {
              id: "analog-signal",
              title: "Sound is a continuous, analog signal",
              lede: "Air-pressure fluctuations → a mic's voltage waveform → a smooth function of time.",
              blocks: [
                {
                  type: "prose",
                  text: "A computer does not listen to music; it reads data. To close that gap we first have to **digitize** the real-world signal.\n\nSound is a wave of air-pressure fluctuations caused by a disturbance. A microphone converts it to a voltage waveform — a continuous **analog signal**. So audio is a continuous function of time $x(t)$ whose amplitude tracks pressure. It is continuous and smooth.",
                },
                { type: "figure", figure: "analog-vs-digital", caption: "Continuous $x(t)$ above; the discrete array a computer can actually store below." },
                {
                  type: "keypoints",
                  title: "The problem",
                  tone: "warn",
                  items: [
                    "A computer can only understand and store **discrete** numbers — `1, 0, -1, 2, …` — a **digital signal**.",
                    "To let it process real sound we run two lossy approximations: **sampling** (discretize time) and **quantization** (discretize amplitude).",
                  ],
                },
              ],
            },
            {
              id: "sampling",
              title: "Sampling — make time discrete",
              lede: "Snapshot the waveform at a fixed, very high rate.",
              blocks: [
                {
                  type: "prose",
                  text: "Along the time axis, take a snapshot of the signal at a very high, fixed frequency. The result is a discrete sequence of time points.",
                },
                {
                  type: "aside",
                  variant: "analogy",
                  title: "Analogy",
                  text: "A high-speed camera capturing fast motion. The higher the frame rate, the more faithfully the motion is captured.",
                },
                {
                  type: "keypoints",
                  tone: "result",
                  title: "Result",
                  items: [
                    "An array $x[n] = [0, 0.9, 0, -0.9, …]$, with $x \\in \\mathbb{R}^{T f_s}$.",
                    "The **sample rate** $f_s$ is a human-set knob. Higher $f_s$ → finer time resolution → bigger array.",
                  ],
                },
                {
                  type: "prose",
                  text: "Humans hear up to roughly **20 kHz**. The **Nyquist–Shannon sampling theorem** says that to reconstruct a signal perfectly you must sample at **at least twice** its highest frequency. So the CD standard picked a little headroom above $2 \\times 20{,}000$: $f_s = 44{,}100\\ \\text{Hz}$ — 44,100 samples every second.",
                },
                { type: "figure", figure: "sample-hold", caption: "Red dots are samples, spaced $1/f_s$ apart. Everything between them is gone." },
                { type: "widget", widget: "sampling-aliasing", caption: "Drag the sample rate below Nyquist and watch — and hear — a high tone masquerade as a low one." },
                {
                  type: "quiz",
                  prompt: "You sample a pure 30 kHz tone at $f_s = 44.1$ kHz. What happens?",
                  choices: [
                    { text: "It records cleanly — 44.1 kHz is the CD rate." },
                    { text: "It **aliases** to 14.1 kHz, a tone that was never there.", correct: true },
                    { text: "Nothing — 30 kHz is inaudible so it is discarded." },
                    { text: "The array overflows." },
                  ],
                  explain:
                    "Nyquist for $f_s = 44.1$ kHz is 22.05 kHz. A 30 kHz component is $30 - 22.05 = 7.95$ kHz above it, so it folds back to $22.05 - 7.95 \\approx 14.1$ kHz. Real ADCs put an *anti-aliasing* low-pass filter before the sampler to prevent exactly this.",
                },
              ],
            },
            {
              id: "quantization",
              title: "Quantization — make amplitude discrete",
              lede: "Snap each sample's real-valued pressure to the nearest available level.",
              blocks: [
                {
                  type: "prose",
                  text: "Each sample's pressure is really an arbitrary real number (say `0.912378…`). Quantization forces it to the nearest bin. With 5 levels, $x \\in \\mathbb{V}^{T f_s}$ where $\\mathbb{V} = \\{-1, -\\tfrac12, 0, \\tfrac12, 1\\}$.",
                },
                {
                  type: "keypoints",
                  tone: "result",
                  title: "Result",
                  items: ["$x[n] = [0, 1, 0, -1, 0, …]$ — every value pushed onto the ladder."],
                },
                {
                  type: "prose",
                  text: "**Bit depth** is the precision of that ladder — how many bits describe each sample's height. CD audio uses **16-bit**: $2^{16} = 65{,}536$ levels. More bits → lower quantization noise → more bytes.",
                },
                {
                  type: "aside",
                  variant: "note",
                  title: "Two independent knobs",
                  text: "Sample rate sets the *time* grid; bit depth sets the *amplitude* grid. CD = 44.1 kHz / 16-bit. Studio work is often 48–96 kHz / 24-bit.",
                },
              ],
            },
          ],
        },
        // ── 1.2 ────────────────────────────────────────────────────────
        {
          id: "fourier",
          title: "Fourier Transform + Spectrogram",
          summary:
            "Musical sound is periodic. A periodic wave is a sum of harmonics; their relative weights are timbre. The DFT reads those weights off a signal; the STFT does it in short frames so you also keep *time*.",
          slides: [
            {
              id: "periodicity",
              title: "Musical sound is periodic",
              lede: "The fundamental period is the smallest shift that maps the wave onto itself.",
              blocks: [
                {
                  type: "prose",
                  text: "In acoustics the **fundamental period** $T_0$ is the smallest positive time shift with $x(t + T_0) = x(t)$. The **fundamental frequency** is its reciprocal, $f_0 = 1/T_0$, and that is the **pitch** you hear.",
                },
                {
                  type: "aside",
                  variant: "intuition",
                  title: "Why the examples sound like nothing",
                  text: "At $T_0 = 0.5$ s, $f_0 = 2$ Hz — two repeats a second, far below hearing. Double it a few times (2 → 4 → … → 256 → 512 Hz) and it climbs into the audible band. Pitch is just periodicity fast enough to fuse.",
                },
                {
                  type: "keypoints",
                  items: [
                    "$T_0 = 0.5$ s → $f_0 = 2$ Hz — two fundamental periods per second.",
                    "$T_0 = 0.25$ s → $f_0 = 4$ Hz — four per second.",
                  ],
                },
              ],
            },
            {
              id: "fourier-series",
              title: "Fourier series — a periodic wave is a stack of harmonics",
              lede: "Frequencies are locked to integer multiples of f₀.",
              blocks: [
                {
                  type: "prose",
                  text: "Every periodic sound is a sum of elementary sinusoids whose frequencies are **integer multiples of $f_0$** — the **harmonics**.",
                },
                {
                  type: "formula",
                  tex: "x(t) = a_0 + \\sum_{k=1}^{K} a_k \\, \\sin\\!\\big(2\\pi k f_0 t + \\phi_k\\big)",
                  caption: "$a_k$ = harmonic amplitudes, $\\phi_k$ = phases, $a_0$ = DC offset.",
                },
                {
                  type: "prose",
                  text: "The ear decomposes sound into frequency components: **complex wave = Σ (sinusoid × weight)**. The lowest frequency, $f_0$, sets pitch; its multiples $2f_0, 3f_0, 4f_0, …$ are harmonics. **Timbre is the *relative* pattern of harmonic amplitudes** — which is why a flute and a violin on the same note sound different.",
                },
                {
                  type: "widget",
                  widget: "harmonic-stack",
                  caption:
                    "The lecture example: harmonics at 440 / 880 / 1320 / 1760 Hz with weights 1, ½, ¼, ⅛. Change the weights, watch the wave change shape, and play it.",
                },
                {
                  type: "aside",
                  variant: "note",
                  title: "Same pitch, different shape",
                  text: "Tuning fork ≈ one harmonic (near-pure sine). Flute — a few low harmonics. Voice and violin — many harmonics with formant structure. All can share $f_0$; only the $a_k$ pattern differs.",
                },
              ],
            },
            {
              id: "dft",
              title: "The Discrete Fourier Transform",
              lede: "Time-domain array in, per-frequency energy out.",
              blocks: [
                {
                  type: "prose",
                  text: "The **DFT** moves a signal from the time domain to the frequency domain — the axis perception actually cares about.",
                },
                { type: "formula", tex: "X[k] = \\sum_{n=0}^{N-1} x[n]\\, e^{-j \\frac{2\\pi}{N} k n}" },
                {
                  type: "keypoints",
                  items: [
                    "**Input** — $x[n]$, a block of sound of length $N$.",
                    "**Output** — $X[k]$, a complex array; $|X[k]|$ is the energy of the $k$-th frequency bin.",
                    "$N$ real samples → $N/2 + 1$ useful magnitude bins (the rest are conjugate mirrors).",
                  ],
                },
                {
                  type: "prose",
                  text: "With the right window length and hop, an **inverse DFT** can perfectly rebuild the audio. The **STFT** we normally use is *not* exactly invertible, so practical systems rely on approximate reconstruction.",
                },
              ],
            },
            {
              id: "stft",
              title: "The Short-Time Fourier Transform",
              lede: "A plain DFT throws away *when*. Chop the signal into frames and DFT each one.",
              blocks: [
                {
                  type: "prose",
                  text: "A whole-signal DFT tells you which frequencies are present but not *when*. The **STFT** fixes that: slice the signal into overlapping frames and transform each frame.",
                },
                {
                  type: "formula",
                  tex: "\\text{frame}[k][n] = x[k \\cdot N_h + n] \\qquad \\text{STFT}[k] = \\text{DFT}\\big(\\text{frame}[k]\\big)",
                },
                {
                  type: "keypoints",
                  items: [
                    "$N_h$ — **hop length**, the stride between frame starts.",
                    "$n$ — sample index inside a frame, $0 … \\text{frame\\_size} - 1$.",
                    "$k$ — frame index — *which* slice of time.",
                  ],
                },
                { type: "figure", figure: "stft-framing", caption: "Overlapping frames marching along the signal; each becomes one column of the spectrogram." },
                { type: "widget", widget: "spectrogram", caption: "Play a tone (or sweep it, or use your mic) and watch its STFT scroll by in real time." },
                {
                  type: "aside",
                  variant: "note",
                  title: "The trade you can't dodge",
                  text: "Long frames → sharp frequency, blurry time. Short frames → sharp time, blurry frequency. A **mel** spectrogram then warps the frequency axis to match pitch perception — the (c) plots in the notes.",
                },
              ],
            },
          ],
        },
        // ── 1.3 ────────────────────────────────────────────────────────
        {
          id: "stereo",
          title: "Stereo Audio",
          summary:
            "Two ears localize sound from inter-aural time and level differences. Stereo just stores two channels.",
          slides: [
            {
              id: "two-ears",
              title: "Two ears, two channels",
              blocks: [
                {
                  type: "prose",
                  text: "You have two ears, and that is how you place a sound in space. The brain reads the tiny **time difference** between ears plus **head-shadowing** (level difference) to infer direction.",
                },
                {
                  type: "prose",
                  text: "A wave reaches the left mic (L) and right mic (R) at slightly different times and intensities, so recording gives **two** waveforms. Storage is $x \\in \\mathbb{V}^{T f_s \\times 2}$ — the same array as before with a channel dimension. Playback sends L and R to separate speakers around the listener.",
                },
                {
                  type: "aside",
                  variant: "note",
                  title: "Supplement (加餐)",
                  text: "Meinard Müller, *Fundamentals of Music Processing* — the standard reference text for this whole unit.",
                },
              ],
            },
          ],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────────────
    {
      id: "latent-generation",
      title: "Latent Generation",
      blurb:
        "Modern image / audio / video generators don't touch raw pixels or samples. They compress to a learned latent, then run an iterative generator there. Why that wins, and what it costs — following Sander Dieleman's latents blog.",
      chapters: [
        // ── 1.1 ────────────────────────────────────────────────────────
        {
          id: "why-latents",
          title: "Why generate in latent space?",
          summary:
            "Raw signals are too long to compute on and too unstructured to learn from. Compression is forced to capture macro-structure, which is exactly what a generator needs.",
          slides: [
            {
              id: "sources",
              title: "Sources",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "**Blog** — Sander Dieleman, *Generative modelling in latent space* (sander.ai, 2025-04-15). Skip §6.",
                    "**Paper** — *Jukebox*. Read the overall method; skip the VQ-VAE details.",
                    "**Slides** — 01B and the 01B discussion.",
                  ],
                },
              ],
            },
            {
              id: "plain-version",
              title: "Plain-language version",
              lede: "Why do we need a latent space at all?",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "The goal of generative AI: produce high-fidelity content — images, audio — indistinguishable from the real, continuous, rich world.",
                    "But a computer only handles **discrete, finite** numbers. Sound gets in via **sampling → quantization → encoding** (the whole first unit).",
                  ],
                },
                {
                  type: "prose",
                  text: "Model directly on the raw ~8,000,000-sample array and you hit two walls.",
                },
                {
                  type: "keypoints",
                  title: "a. Can't compute (算不了)",
                  tone: "warn",
                  items: [
                    "**Memory** — storing a multi-million-length sequence plus gradients and activations needs enormous GPU memory.",
                    "**Compute** — attention is $O(n^2)$ in sequence length $n$.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "b. Can't learn (学不会)",
                  tone: "warn",
                  items: [
                    "**Long-range dependency** — music depends on long-term structure; predicting sample 15,000,000 may need information from around sample 100,000.",
                    "**Information decay** — carrying early information losslessly to the end of a 16,000,000-step sequence is nearly impossible.",
                  ],
                },
                {
                  type: "keypoints",
                  tone: "result",
                  title: "So latent space buys",
                  items: [
                    "the **compute** problem — smaller tensors;",
                    "the **structure** problem — compression is *forced* to keep macro-structure.",
                  ],
                },
              ],
            },
          ],
        },
        // ── 1.1.1 ─────────────────────────────────────────────────────
        {
          id: "two-stage",
          title: "Two-stage training",
          summary:
            "Stage 1: train an autoencoder — a codec — on the raw signal. Stage 2: freeze the encoder, map the dataset to latents, train a generator (AR or diffusion) on those. The stages are fully decoupled.",
          slides: [
            {
              id: "the-two-stages",
              title: "The two stages",
              blocks: [
                {
                  type: "keypoints",
                  title: "1 · Representation learning",
                  items: [
                    "Train an **autoencoder**: encoder maps $x \\to z$, decoder maps $z \\to \\hat{x}$.",
                    "Goal — fix the coordinate system and geometry of the latent space. Learn representation and generator together and the latent keeps drifting.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "2 · Distribution modeling",
                  items: [
                    "Take the frozen Stage-1 encoder, map the whole training set to latents, train a generator on them — today usually **autoregressive** or **diffusion**.",
                    "The encoder is **not** updated in Stage 2 — its gradients must not reach the encoder, or the two objectives fight and wreck the latent geometry.",
                    "The decoder is idle during Stage-2 training but essential at **sampling** time to turn $\\tilde{z}$ back into $\\hat{x}$.",
                    "Goal — learn $p(z)$, or $p(z \\mid c)$ for conditional generation.",
                  ],
                },
              ],
            },
            {
              id: "pipeline",
              title: "The pipeline",
              blocks: [
                { type: "figure", figure: "two-stage-pipeline", caption: "Stage 1 trains the codec. Stage 2a trains the generator on frozen latents. Stage 2b samples: generator → latents → decoder → output, both frozen." },
                {
                  type: "keypoints",
                  items: [
                    "**Stage 1** — *round trip* $\\text{Dec}(\\text{Enc}(x))$; it is *lossy*, $\\text{Dec}(\\text{Enc}(x)) \\ne x$. Losses: regression, bottleneck, perceptual, adversarial.",
                    "**Stage 2a** — encoder frozen; train the iterative generator (AR or latent diffusion) with $\\mathcal{L}_{\\text{generator}}$.",
                    "**Stage 2b** — generator and decoder both frozen. Codec training and generative modeling are **fully decoupled**.",
                  ],
                },
                {
                  type: "aside",
                  variant: "aside",
                  title: "Note in the margin",
                  text: "The Stage-2a diagram attaches $\\mathcal{L}_{\\text{generator}}$ only to the latents, which is odd — it is a function of both the latents and the model outputs.",
                },
              ],
            },
            {
              id: "history",
              title: "Why two stages? A short history",
              blocks: [
                {
                  type: "keypoints",
                  title: "a · Latent autoregression",
                  items: [
                    "$P_\\theta(X) = P_\\theta(X_1)\\,P_\\theta(X_2 \\mid X_1)\\,P_\\theta(X_3 \\mid X_2, X_1)\\cdots$",
                    "**VQ-VAE** — a practical recipe for *discrete* latents; reduces multimedia generation to autoregressive language modeling. Motivation: raw-domain models (PixelCNN on pixels, WaveNet on samples) lack long-range structure.",
                    "**VQ-GAN** — VQ-VAE reconstructions are blurry; adding an **adversarial loss** buys much higher perceptual fidelity at the same compression rate.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "b · Cascaded AR model — staged 'skip' prediction",
                  items: [
                    "Split $X$ into a coarse layer $X_c$ and a fine layer $X_f$.",
                    "Skeleton — every 4th pixel: $P_\\theta(X_c) = P_\\theta(X_1)\\,P_\\theta(X_5 \\mid X_1)\\,P_\\theta(X_9 \\mid X_5, X_1)\\cdots$",
                    "Detail — $P_\\Phi\\big(X_f \\mid \\text{Relevant}(X_c)\\big)$, assuming $X_f \\perp \\text{Irrelevant}(X_c) \\mid \\text{Relevant}(X_c)$.",
                    "Fell out of favor: (1) still pixel-space, highly redundant; (2) extracting *Relevant* is hard; (3) better to just let a network compress a latent $Z$ than hand-pick pixels.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "c · Latent diffusion",
                  items: [
                    "Swap the autoregressive Transformer for a U-Net **diffusion** model (LDM).",
                    "Reuse the VQ-GAN autoencoder, drop quantization from the bottleneck, generate **latents** instead of pixels.",
                    "$\\mathcal{L}_{DM} = \\mathbb{E}_{x,\\,\\epsilon \\sim \\mathcal{N}(0,1),\\,t}\\big[\\, \\lVert \\epsilon - \\epsilon_\\theta(x_t, t) \\rVert_2^2 \\,\\big]$",
                  ],
                },
              ],
            },
            {
              id: "engineering-choice",
              title: "It's an engineering trade, not a law",
              blocks: [
                {
                  type: "prose",
                  text: "Under today's hardware and models, splitting representation learning from distribution modeling is the choice that buys the best **perceptual-quality / compute-cost** trade-off.",
                },
                {
                  type: "keypoints",
                  items: [
                    "Ask: which degrees of freedom are the parameters, FLOPs, and sampling steps being spent to fit?",
                    "Capacity spent on imperceptible high-frequency jitter or tiny waveform phase differences contributes ~nothing to perceived quality.",
                  ],
                },
                {
                  type: "discussion",
                  title: "Class discussion",
                  qa: [
                    {
                      q: "Key benefits and drawbacks of two-stage latent generative modeling?",
                      a: [
                        "**+ Pareto improvement in quality / cost** — compress and perceptually align first, shifting compute from perception-irrelevant entropy to perception-relevant information. Better at equal cost; cheaper at equal quality.",
                        "**+ Architecture reuse** — latents keep grid / topology, so CNN / U-Net / attention inductive biases still apply. Transformers get topology back via positional encodings.",
                        "**− Engineering complexity** — two stages mean more moving parts: training, versioning, data flow, evaluation.",
                        "**− Information loss + grid tyranny** — compression is irreversible, and a grid latent still spends capacity on information-sparse regions.",
                      ],
                    },
                    {
                      q: "Will this paradigm last, or do we go back to end-to-end?",
                      a: [
                        "**Dieleman** — end-to-end is aesthetically and engineering-wise appealing, but the cost curve hasn't beaten latent yet; input-space iterative refinement (diffusion) is especially slow and costly. Whether we return depends on the hardware-vs-single-stage economic crossover, and it differs by modality.",
                        "**Professor** — even single-stage models may keep **latent compression as an inductive bias** — the compression idea survives even if the explicit two stages don't.",
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // ── 1.1.1 losses ─────────────────────────────────────────────
        {
          id: "losses",
          title: "The loss functions",
          summary:
            "Stage 1: reconstruction (regression + perceptual + adversarial) and a bottleneck loss. Stage 2: NLL for AR, or diffusion loss. Perceptual and adversarial both exist to patch what plain regression blurs.",
          slides: [
            {
              id: "stage1-reconstruction",
              title: "Stage 1 — reconstruction loss",
              lede: "Make the encoder/decoder round-trip high-fidelity.",
              blocks: [
                {
                  type: "keypoints",
                  title: "a · Regression (L2 / MSE or L1 / MAE)",
                  items: [
                    "Compare input and round-trip **directly in raw input space**.",
                    "Biased toward low frequencies / large structure (that is where signal energy is) — used alone, it blurs.",
                    "MAE (e.g. pixel error) shows up sometimes; MSE is more common.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "b · Perceptual",
                  items: [
                    "Compare input and round-trip **in a neural network's embedding space**.",
                    "Usually a frozen pretrained net extracts features; the loss matches those features between reconstruction and input, recovering high-frequency detail regression drops. In images: LPIPS / VGG features.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "c · Adversarial",
                  items: [
                    "Pushes output onto the true distribution's **local statistics** — high-frequency realism, back onto the 'ground-truth manifold'.",
                    "A discriminator learns real vs reconstructed; the autoencoder learns to fool it, accepting larger deviation from the input for the sake of realism.",
                    "Usually disabled early in training to avoid instability.",
                  ],
                },
              ],
            },
            {
              id: "stage1-bottleneck",
              title: "Stage 1 — bottleneck loss",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "Specific to certain autoencoders, e.g. the discrete VQ-VAE.",
                    "Puts an extra constraint straight on the latents: **cap capacity**, or **regularize distribution / scale / sparsity**.",
                    "Stops the latent from being overloaded with hard-to-model noise, so the Stage-2 generator is cheaper and more stable.",
                  ],
                },
                {
                  type: "aside",
                  variant: "intuition",
                  title: "My read",
                  text: "First reshape the latent into a domain that 'looks more like good data', then let the prior learn on it.",
                },
              ],
            },
            {
              id: "stage2-loss",
              title: "Stage 2 — NLL or diffusion loss",
              blocks: [
                {
                  type: "prose",
                  text: "Negative log-likelihood for autoregressive models, or the diffusion loss.",
                },
                {
                  type: "aside",
                  variant: "note",
                  title: "Tips",
                  text: "Iterative generators today are often **not** autoregressive (Parti, xAI's Aurora, and OpenAI's GPT-4o are notable exceptions). The quantization bottleneck has largely been replaced (VQ-VAE's discrete tokens + AR prior), but the other pieces — especially the reconstruction-loss combination — persist.",
                },
              ],
            },
            {
              id: "perceptual-scale",
              title: "Aside — perception is scale-dependent",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "**Audio** — micro-second-scale amplitude change → **pitch**; hundred-millisecond-scale change → **rhythm / beat**.",
                    "**Vision** — fast local fluctuation of color / intensity → **texture** (grass, fur); stable large-scale structure → **objects** (eyes, contours).",
                  ],
                },
                {
                  type: "prose",
                  text: "**Why Stage-1 perceptual loss makes Stage-2 easier.** The raw signal is full of perception-irrelevant degrees of freedom — the exact position of each blade of grass, tiny waveform phase offsets. NLL / MSE treat every one as a dimension to fit exactly.\n\nIn **pixel space**, two images identical except for grass texture differ across thousands of pixels, so MSE calls it a big error and the model burns capacity fitting high-entropy, perceptually-irrelevant detail.\n\nIn **latent space**, those variations either never enter the latent (compressed away) or map to directions the latent is insensitive to. The model instead learns the low-entropy, stable 'this is grass' representation — the encoder's Jacobian has tiny singular values in those directions, so the induced metric down-weights them.",
                },
              ],
            },
            {
              id: "loss-discussion",
              title: "Class discussion — losses",
              blocks: [
                {
                  type: "discussion",
                  qa: [
                    {
                      q: "How does modeling latents change the loss?",
                      a: [
                        "Same math — NLL / diffusion MSE — but the **domain and metric** change: $-\\log P_\\theta(X) \\to -\\log P_\\theta(\\text{Enc}(X))$.",
                        "Stage-1's reconstruction loss constrains encoder/decoder in input space, which shapes the **latent geometry**, which implicitly sets how sensitive Stage-2's NLL/MSE is to different input changes. Perception-irrelevant freedoms get compressed away.",
                        "So the *same* NLL/MSE, measured in latent space, is effectively more sensitive to perceptually stable, important differences — **perception-agnostic → perception-aware**. Not Euclidean distance in pixel space, but distance after a nonlinear map into a perceptual latent space.",
                        "**Diffusion noise weighting** is a second layer of perceptual reweighting: the latent decides *what information enters the modeling world*; the diffusion weighting decides *the learning weight of each scale* within it (high-noise steps → macro composition, low-noise steps → fine texture).",
                      ],
                    },
                    {
                      q: "How do regression and adversarial loss complement each other?",
                      a: [
                        "Regression alone (especially MSE) → the classic **blur**: natural-signal energy concentrates at low frequencies, so regression preferentially rewards low-frequency fit.",
                        "Regression keeps the low frequencies; adversarial adds high-frequency realism.",
                        "Perceptual / GAN alone can be hard to optimize (local minima, instability), so regression also acts as a **training guardrail**.",
                      ],
                    },
                    {
                      q: "Why run perceptual *and* adversarial together?",
                      a: [
                        "Mechanistically different — perceptual aligns in a frozen feature space; adversarial forces output onto the real distribution's local texture statistics.",
                        "**Professor** — a trick question. They basically accomplish the same thing (fix regression's perceptual gap); running both is more of a **hack** — stacking buffs for stability.",
                      ],
                    },
                    {
                      q: "What does the bottleneck loss do?",
                      a: ["Extra constraint on the latents in the autoencoder stage: cap capacity, or regularize distribution / scale / sparsity — so the latent isn't overloaded with un-modelable noise and Stage-2 stays cheap and stable."],
                    },
                    {
                      q: "If diffusion loss is already 'perceptual', why does latent still matter for diffusion?",
                      a: [
                        "**Professor** — for diffusion the primary value of latent is still **efficiency**: many iterative steps on a small tensor saves huge FLOPs / memory and spends the budget on perception-relevant information.",
                        "Second is **division of labour** — hand texture / detail to the decoder, keep structure modeling on the smaller, more controllable latent.",
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // ── 1.1.2 ─────────────────────────────────────────────────────
        {
          id: "rate-distortion-modelability",
          title: "Rate – Distortion – Modelability",
          summary:
            "Compression isn't just rate vs distortion. A third axis — modelability — measures how hard the latent's distribution is to learn, and it often fights rate.",
          slides: [
            {
              id: "three-terms",
              title: "Three terms",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "**Rate** — how much information the latent carries (bitrate, TSR, token count).",
                    "**Distortion** — the perceptual deviation allowed when decoding the latent back to signal.",
                    "**Modelability** — how hard it is for the generator to learn the latent's distribution $p(z)$.",
                  ],
                },
                {
                  type: "prose",
                  text: "**Equal Shannon information ≠ equal learning difficulty.** (See *V-information*, ICLR '20 — an information framework for the *effective* information extractable under limited compute.)",
                },
                {
                  type: "keypoints",
                  items: [
                    "Extreme de-redundancy to cut rate (entropy coding, aggressive compression) destroys the signal's topology and statistics — what's left looks structureless, like noise — so **modelability drops**.",
                    "To *raise* modelability, latents usually **keep** some local correlation, smoothness, or grid structure ('advanced pixels') even at the cost of higher rate or slightly more distortion.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "Two extended trade-offs",
                  items: [
                    "**rate–distortion–usefulness** (Tschannen) — the representation must also be useful for downstream tasks.",
                    "**rate–distortion–perception** — separate pixel-wise distortion from subjective perceptual quality.",
                  ],
                },
              ],
            },
            {
              id: "rdm-discussion",
              title: "Class discussion — RDM",
              blocks: [
                {
                  type: "discussion",
                  qa: [
                    {
                      q: "Why is modelability opposed to distortion — compress better and it gets *harder* to model?",
                      a: [
                        "Lossless compression removes or scrambles usable structure (entropy coding keeps information but wrecks topology), so residual variation looks structureless and noise-like.",
                        "But generative modeling *needs* usable structure — topology, statistical correlation — to learn the distribution.",
                        "Two representations with the same information can differ wildly in how extractable meaning is (**raw text vs encrypted**). Scramble structure enough and modelability collapses even with zero information loss.",
                      ],
                    },
                    {
                      q: "Why does keeping grid / topology help modelability?",
                      a: [
                        "The latent still has local stationarity and neighborhood correlation, so the generator can reuse weight-sharing inductive biases built for grids (CNN / U-Net), sharing pattern-modeling across positions → better sample efficiency. Transformers inject this via positional encodings.",
                        "It keeps **localizability** — the model and downstream tasks can align, query, or edit specific spatiotemporal positions. A global latent makes that hard.",
                        "**Cost — 'grid tyranny'** — the dog's head is complex, the sky is simple, but a grid spends equal capacity per cell, wasting representation on perceptually easy regions.",
                      ],
                    },
                    {
                      q: "Why is a Transformer a better bias for non-grid data / irregular tokenization?",
                      a: ["Aside from positional encodings a Transformer carries almost no grid bias — contrast with a CNN's explicit grid weight sharing."],
                    },
                    {
                      q: "Why learned autoencoder latents instead of JPEG / MP3?",
                      a: [
                        "Hand-crafted codecs minimize bitrate and don't optimize for generative modelability — steps like Huffman coding actively scramble structure.",
                        "A learned latent trades between compression and structure preservation in a way that suits generation: the prior is easier to learn and cheaper to sample, while perceptual quality holds.",
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // ── 1.1.3 ─────────────────────────────────────────────────────
        {
          id: "controlling-capacity",
          title: "Controlling capacity",
          summary:
            "Latent capacity is set by three knobs — downsampling factor, channels, codebook size — summarized as the tensor-size-reduction factor (TSR). Picking it is the whole game.",
          slides: [
            {
              id: "three-knobs",
              title: "Three knobs, one ratio",
              blocks: [
                {
                  type: "prose",
                  text: "Latents typically preserve spatial / temporal information and grid structure. Their capacity is mostly three dials:",
                },
                {
                  type: "keypoints",
                  items: [
                    "**Downsampling factor** (spatial / temporal resolution) — smaller grid, fewer tokens (256×256 → 32×32).",
                    "**Channels per latent position** — bigger per-token vector holds more information (e.g. 8 channels).",
                    "**Codebook size** (if discrete) — bigger codebook, more bits per token.",
                  ],
                },
                {
                  type: "formula",
                  tex: "\\text{TSR} = \\dfrac{W_{in} \\cdot H_{in} \\cdot C_{in}}{W_{out} \\cdot H_{out} \\cdot C_{out}}",
                  caption: "Tensor size reduction factor — one comparable scalar for 'how much did we compress'.",
                },
                { type: "widget", widget: "tsr-calc", caption: "The lecture's worked example: input `[B, 10, 5, 4, 2]`, bottleneck `[B, 100]` → TSR = 4. Change the shapes." },
              ],
            },
            {
              id: "goldilocks",
              title: "Choosing the right TSR",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "**TSR too large** (too little compression) → latent keeps almost every detail, even noise → reconstruction excellent, but generation is brutal — data too redundant, the model can't cope.",
                    "**TSR too small** (too aggressive) → heavy information loss, blurry output → poor reconstruction, but generation is easy — small data, the model picks up high-level logic fast.",
                    "In Stable Diffusion, $f = 8$ or $16$ is the usual Goldilocks zone.",
                  ],
                },
                { type: "widget", widget: "rate-distortion", caption: "Slide the compression factor and watch reconstruction fidelity and modelability trade against each other." },
              ],
            },
          ],
        },
        // ── 1.1.4 ─────────────────────────────────────────────────────
        {
          id: "shaping-latents",
          title: "Curating & shaping the latent space",
          summary:
            "Curating = which bits of x get into z. Shaping = how they're arranged. VQ-reg and KL-reg, decoupling representation from reconstruction, regularizing for modelability, and diffusion decoders.",
          slides: [
            {
              id: "curate-vs-shape",
              title: "Curating vs shaping",
              blocks: [
                {
                  type: "keypoints",
                  items: [
                    "**Capacity** — how many bits are encoded, relative to the input.",
                    "**Curating** — which information bits pass from $x$ into $z$ (keep what, drop what).",
                    "**Shaping** — how that information sits in $z$ (scale, distribution shape, correlation structure).",
                  ],
                },
              ],
            },
            {
              id: "vq-kl-reg",
              title: "Mainstream regularizers — VQ-reg & KL-reg",
              blocks: [
                {
                  type: "keypoints",
                  title: "VQ-reg (VQGAN)",
                  items: [
                    "Force information to snap to a **codebook**, stopping the encoder from smuggling in fragmented, un-modelable noise.",
                    "**Dieleman** — the real capacity limit may not be 'quantization vs not' but the **encoder's expressiveness itself**; even without quantization you can't stuff in unlimited information without breaking structure. This fuse isn't strictly necessary.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "KL-reg (Stable Diffusion)",
                  items: [
                    "$\\mathcal{L}_{ELBO} = \\mathbb{E}_{q(z \\mid x)}[\\log p(x \\mid z)] - \\text{KL}\\big(q(z \\mid x) \\,\\Vert\\, p(z)\\big)$",
                    "In modern models (LDM) the KL term carries a **tiny** factor $\\beta$. When $\\beta$ is tiny it is no longer a strict ELBO — the link to variational inference is basically cut.",
                    "Its job is now not 'limit capacity' but **suppress outliers** (don't let a sample's latent blow up) and **control scale / dynamic range** so latents land in a train-friendly numeric range.",
                    "→ KL acts mainly as a **shaping** regularizer — scale control, extreme suppression, better numerical conditioning.",
                  ],
                },
              ],
            },
            {
              id: "task-separation",
              title: "Representation learning vs reconstruction",
              blocks: [
                {
                  type: "prose",
                  text: "One decoder is currently forced to serve two masters (**objective coupling / gradient entanglement**): give the encoder a learning signal, *and* render as realistically as possible. The decoder's architecture bias, loss choice, and taste in texture propagate through backprop and shape the encoder's latent — but 'best reconstruction' need not mean 'best latent for prior modeling'.",
                },
                {
                  type: "keypoints",
                  title: "Dieleman's fix — an auxiliary decoder",
                  items: [
                    "**Main decoder** — optimize reconstruction quality, but **stop-grad** to the encoder so it doesn't dictate latent shape.",
                    "**Auxiliary decoder** — simpler, or a different loss, purpose-built to give the encoder a better representation-learning signal.",
                  ],
                },
                {
                  type: "aside",
                  variant: "intuition",
                  title: "The essence",
                  text: "Can we decouple *what latent to learn* (representation learning) from *how to render it back to a high-quality output* (reconstruction / rendering), and lose the hidden side-effects of the objective conflict?",
                },
              ],
            },
            {
              id: "regularizing-modelability",
              title: "Regularizing for modelability",
              blocks: [
                {
                  type: "prose",
                  text: "Recall **V-information**: more information in the latent is not better. Some information is present (high entropy) but the model can't use it. **Goal — maximize *usable* information, not absolute information.**",
                },
                {
                  type: "keypoints",
                  title: "What moves modelability",
                  items: [
                    "**Capacity** — more information in the latent → harder Stage-2.",
                    "**Shaping** — same information, different coordinates / scale / correlation → some are far easier to learn.",
                    "**Curation** — if the latent holds unpredictable noise → Stage-2 is harder.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "Methods",
                  items: [
                    "**a · Co-train a generative prior** — during Stage-1, add a lightweight prior (small AR or small diffusion) over $z$ and backprop *its* loss into the encoder, so the encoder actively makes the latent easy to model.",
                    "**b · Pretrained representation supervision** (DINO, etc.) — make the latent predict a strong pretrained representation. Effectively: 'don't waste capacity on unusable noise; align to known-usable structure.'",
                    "**c · Equivariance regularization** — transform the input (rotate / scale) and require the latent to transform the same way. Smooths the latent's spectrum so CNN / U-Net / attention biases model it more easily.",
                  ],
                },
              ],
            },
            {
              id: "diffusion-decoders",
              title: "Diffusion decoders",
              blocks: [
                {
                  type: "prose",
                  text: "Replace the decoder's single forward pass to $\\hat{x}$ with an **iterative** generation of $\\hat{x}$ from $z$.",
                },
                {
                  type: "keypoints",
                  title: "Pros",
                  items: [
                    "More **principled** objective — noise prediction / score matching is stable.",
                    "Avoids the fragility of tuning a GAN discriminator — fewer training pathologies.",
                    "Often higher reconstruction fidelity.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "Cons",
                  tone: "warn",
                  items: [
                    "**Slow** — the decoder now samples multiple steps; latency hurts.",
                    "It partly **cancels the point of two stages** — the expensive iteration was supposed to live in the small latent space with a one-shot decoder back to pixels.",
                  ],
                },
                {
                  type: "prose",
                  text: "Cases: **DALL·E 3 Consistency Decoder**; **Music2Latent** (Pasini, ISMIR '24).",
                },
                {
                  type: "aside",
                  variant: "note",
                  title: "The way out — distillation",
                  text: "Keep the diffusion decoder's quality but distill sampling down to ~2 steps (or 1), bringing latency back to deployable. DALL·E 3's Consistency Decoder compresses a tens-of-steps decode to 2.",
                },
              ],
            },
            {
              id: "modalities",
              title: "Other topics — latents per modality",
              blocks: [
                {
                  type: "aside",
                  variant: "aside",
                  title: "Author bias",
                  text: "Sander is a big diffusion fan — read the blog with that in mind.",
                },
                {
                  type: "keypoints",
                  title: "Video — a time dimension",
                  items: [
                    "Most models still treat each frame as an image (frame-by-frame).",
                    "Wasteful — adjacent frames are nearly identical, huge temporal redundancy.",
                    "Open problem — compress the time dimension *at the latent level* (motion vectors, etc.). What Sora and others are working on.",
                  ],
                },
                {
                  type: "keypoints",
                  title: "Audio — no consensus",
                  items: [
                    "**Wu+ 2025** — audio is extremely timing-sensitive. An effective audio latent needs **narrow receptive fields** (don't let the encoder see too long a span at once or it loses high-frequency transients) and **variable bitrate** (like MP3 — spend bits on complex passages, save them on quiet ones).",
                  ],
                },
                {
                  type: "keypoints",
                  title: "Language — a natural compression package",
                  items: [
                    "Language was invented by humans for efficient communication, so a tokenizer (BPE) is usually **lossless**. Because it's lossless, text units are called **discrete tokens**, not 'latents'.",
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
