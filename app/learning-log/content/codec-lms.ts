import type { Chapter } from "./types";

/**
 * Music Audio Generation · §2.2 — Codec Language Models.
 *
 * The non-diffusion branch of §2: quantize the signal to discrete tokens, then
 * model those tokens with a next-token language model. Three chapters:
 *   1. codec-language-models — the framing: discrete autoencoder + LM.
 *   2. vq-vae               — the foundational discrete autoencoder, + VQ-VAE-2.
 *   3. musicgen             — one decoder-only Transformer over EnCodec's RVQ
 *                             tokens; the codebook-interleaving problem.
 *
 * Transcribed from lecture notes (mixed zh/en) plus the VQ-VAE and MusicGen
 * method sections, including the class-discussion questions.
 */

const codecLanguageModels: Chapter = {
  id: "codec-language-models",
  title: "Codec Language Models",
  summary:
    "The other half of §2. Instead of iterative denoising in a continuous latent, quantize the signal to discrete tokens and model them with a next-token language model. Same autoencoder idea — discrete bottleneck.",
  slides: [
    {
      id: "two-families",
      title: "Two families, one autoencoder",
      lede: "Latent diffusion and codec LMs both start by autoencoding. They differ in the bottleneck and the generator.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Latent diffusion** — a *continuous* autoencoder. $E: x \\to z \\in \\mathbb{R}^{T f_h \\times d}$, then an iterative denoiser runs in $z$-space.",
            "**Codec LM** — a *discrete* autoencoder. $E$ then a quantizer $Q$ maps the latent to tokens $\\mathbf{v} \\in \\mathbb{V}_N^{T f_h}$, with $\\mathbb{V}_N = \\{0, 1, \\dots, 2^N - 1\\}$; then $Q^{-1}$ (codebook lookup) and $D$.",
            "Both were pioneered by van den Oord+ (NeurIPS '17 — VQ-VAE).",
          ],
        },
        {
          type: "figure",
          figure: "codec-vs-ldm",
          caption: "Top: LDM autoencoder, continuous latent. Bottom: codec-LM discrete autoencoder — an extra quantize step $Q$ against a codebook, and its inverse lookup $Q^{-1}$.",
        },
      ],
    },

    {
      id: "codebook",
      title: "Codebook quantization",
      lede: "Each latent vector is quantized independently against a shared codebook.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "Encoder output $z \\in \\mathbb{R}^d$. Codebook $\\in \\mathbb{R}^{d \\times k}$ — $k = 2^n$ points living in the *same* space as the encoder output.",
            "Quantize $z$ to its **nearest neighbour** in the codebook: $\\; \\arg\\min_j \\operatorname{dist}(z, e_j)$.",
            "The codebook carves the embedding space into Voronoi cells — every encoder output in a cell collapses to that cell's code.",
          ],
        },
        {
          type: "widget",
          widget: "vq-quantize",
          caption: "Drag the encoder output; it snaps to the nearest codebook vector. The shaded regions are the Voronoi cells.",
        },
        {
          type: "aside",
          variant: "note",
          title: "Piano Genie",
          text: "To put a VQ-VAE in Piano Genie, the encoder outputs one embedding per expert note and a learnable codebook of 8 vectors is initialised; each embedding is quantized to its nearest codebook entry, and that entry is what the decoder sees. It works in most settings, though it is not yet clear how to use it for the interpretability properties they wanted.",
        },
      ],
    },

    {
      id: "generation",
      title: "Generation = next-token prediction",
      blocks: [
        {
          type: "prose",
          text: "A codec LM is a plain **next-token predictor**: trained with cross-entropy, sampled one token at a time. This is the split from diffusion — no iterative $x_T \\to x_0$ refinement, just a growing prefix.",
        },
        {
          type: "formula",
          tex: "g_\\theta : \\mathbb{V}^* \\to \\mathbb{R}^{2^N}, \\qquad p_\\theta(x_k \\mid x_{<k}) = \\operatorname{softmax}\\big(g_\\theta(x_{<k})\\big)",
          caption: "The model maps a history of codes to logits over the next code.",
        },
        {
          type: "keypoints",
          items: [
            "**Diffusion** has a *symmetric* model type signature — $f_\\theta : \\mathbb{R}^{T f_h \\times d} \\to \\mathbb{R}^{T f_h \\times d}$, same shape in and out, applied many times.",
            "**Codec LM** maps a variable-length prefix to a distribution over one next symbol, applied autoregressively.",
          ],
        },
      ],
    },

    {
      id: "tradeoffs",
      title: "Where the discrete choice bites",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Plus** — discrete tokens drop straight into the Transformer / language-model machinery, with all its scaling know-how.",
            "**Minus** — the quantizer's $\\arg\\min$ is non-differentiable (zero gradient), so training needs the **straight-through estimator** plus auxiliary losses (next chapter).",
            "**Minus** — you inherit **codebook collapse** (codes going unused) and a hard **quantization-error floor** on reconstruction.",
          ],
        },
      ],
    },
  ],
};

const vqVae: Chapter = {
  id: "vq-vae",
  title: "VQ-VAE",
  summary:
    "The foundational discrete autoencoder (DeepMind). A learned codebook replaces the Gaussian latent; the straight-through estimator gets gradients past the arg-min; a three-term loss trains encoder, codebook, and decoder. Then VQ-VAE-2's hierarchy.",
  slides: [
    {
      id: "idea",
      title: "From continuous sampling to discrete lookup",
      blocks: [
        {
          type: "prose",
          text: "A normal VAE uses a continuous latent $z \\sim \\mathcal{N}(\\mu, \\sigma^2)$. That invites **posterior collapse**: if the decoder is strong enough — especially an autoregressive decoder — it can fit the data on its own, $q(z \\mid x)$ drifts to the prior, the latent carries no information, and representation learning fails.",
        },
        {
          type: "keypoints",
          items: [
            "Posterior collapse comes from **strong decoder + KL term** acting together.",
            "VQ-VAE makes the latent a **discrete index that must pass through the bottleneck**, and turns the KL term into a constant — so there is no longer a gradient pushing the latent to be empty.",
          ],
        },
        {
          type: "aside",
          variant: "note",
          title: "From the paper",
          text: "A model that encodes useful information in the latent will have a non-zero KL term and a small cross-entropy term. Straightforward VAE implementations mostly fail at this — most runs set the posterior equal to the prior, driving the KL term to zero.",
        },
      ],
    },

    {
      id: "vs-vae",
      title: "VQ-VAE vs VAE",
      blocks: [
        {
          type: "keypoints",
          title: "VAE",
          items: [
            "Encoder reads the image, outputs a set of **parameters** ($\\mu$, $\\sigma$).",
            "A continuous posterior $q(z \\mid x)$ is defined by those parameters; sample one continuous vector $z$ from it.",
            "Decoder rebuilds the image from $z$.",
          ],
        },
        {
          type: "keypoints",
          title: "VQ-VAE",
          items: [
            "Encoder reads the image, outputs a **continuous feature map** $z_e(x)$.",
            "Prepare a codebook (say $K = 1024$). At every spatial position, nearest-neighbour-quantize the feature vector (K-means-like) → a grid of discrete indices $k(x) \\in \\{1, \\dots, K\\}^{H' \\times W'}$.",
            "Look up → the quantized feature map $z_q = e_k$ (the decoder sees a spatial arrangement of codebook vectors).",
          ],
        },
      ],
    },

    {
      id: "flow",
      title: "Encode → quantize → decode",
      blocks: [
        {
          type: "formula",
          tex: "\\mathcal{C} = \\{e_1, e_2, \\dots, e_K\\}, \\; e_i \\in \\mathbb{R}^D \\qquad \\mathbf{z}_q(x) = \\operatorname{Quantize}(E(x)) = \\mathbf{e}_k, \\; k = \\arg\\min_j \\lVert \\mathbf{z}_e(x) - \\mathbf{e}_j \\rVert_2",
          caption: "$K$ = number of latent categories, $D$ = dimension of each code vector.",
        },
        {
          type: "figure",
          figure: "vqvae-quantize",
          caption: "Encoder $E(x) = z_e$ (shape $H' \\times W' \\times D$ — the image cut into cells, each a $D$-vector); nearest-codebook lookup; decoder $\\hat{x} = D(z_q) = D(e_k)$.",
        },
        {
          type: "aside",
          variant: "note",
          title: "The discrete latent's shape follows the modality",
          text: "1-D for speech, 2-D for images, 3-D for video — the quantizer is the same, only the grid of indices changes shape.",
        },
      ],
    },

    {
      id: "ste",
      title: "The straight-through estimator",
      lede: "The arg-min is a discrete pick — its derivative is zero, so gradients can't reach the encoder.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Forward** — use the quantized value $\\mathbf{z}_q$.",
            "**Backward** — copy $\\mathbf{z}_q$'s gradient straight onto $\\mathbf{z}_e$: $\\; \\partial \\mathcal{L} / \\partial \\mathbf{z}_e \\approx \\partial \\mathcal{L} / \\partial \\mathbf{z}_q$.",
          ],
        },
        {
          type: "formula",
          tex: "\\mathbf{z}_q = \\mathbf{z}_e + \\operatorname{sg}[\\mathbf{z}_q - \\mathbf{z}_e]",
          caption: "Forward: the $\\mathbf{z}_e$ terms cancel and you are left with $\\mathbf{z}_q$. Backward: $\\operatorname{sg}[\\cdot]$ (stop-gradient) has no gradient, so it flows straight to $\\mathbf{z}_e$.",
        },
        {
          type: "figure",
          figure: "straight-through-estimator",
          caption: "Solid = forward (quantize). Dashed = backward: the decoder's gradient at $z_q$ is pasted onto $z_e$, skipping the arg-min.",
        },
      ],
    },

    {
      id: "loss",
      title: "The three-part loss",
      blocks: [
        {
          type: "formula",
          tex: "\\mathcal{L} = \\underbrace{\\lVert x - D(\\mathbf{e}_k) \\rVert_2^2}_{\\text{reconstruction}} + \\underbrace{\\lVert \\operatorname{sg}[\\mathbf{z}_e] - \\mathbf{e}_k \\rVert_2^2}_{\\text{VQ / codebook}} + \\beta \\underbrace{\\lVert \\mathbf{z}_e - \\operatorname{sg}[\\mathbf{e}_k] \\rVert_2^2}_{\\text{commitment}}",
        },
        {
          type: "keypoints",
          items: [
            "**Reconstruction** — trains encoder + decoder; makes the chosen code $\\mathbf{e}_k$ carry enough to rebuild $x$.",
            "**VQ / codebook** — freezes the encoder (via $\\operatorname{sg}$), pulls the chosen code $\\mathbf{e}_k$ toward the encoder output. The codebook entries become the *cluster centres* of the data.",
            "**Commitment** — freezes the codebook (via $\\operatorname{sg}$), keeps the encoder output from hopping between codes. $\\beta \\approx 0.25$.",
          ],
        },
        {
          type: "keypoints",
          title: "Why the KL term \"disappears\"",
          items: [
            "VQ-VAE's posterior is **deterministic** (a one-hot nearest-neighbour pick) with a fixed / uniform prior, so the KL is a constant and drops out of the loss.",
            "A normal VAE's collapse largely comes from *minimising* KL pushing the posterior toward the prior. With KL constant, there is no reward for emptying the latent.",
          ],
        },
      ],
    },

    {
      id: "ema",
      title: "Updating the codebook by EMA",
      lede: "More stable than SGD on the codebook — it is a moving-average K-means.",
      blocks: [
        {
          type: "formula",
          tex: "N_i^{(t)} = \\gamma N_i^{(t-1)} + (1-\\gamma)\\, n_i^{(t)} \\qquad m_i^{(t)} = \\gamma m_i^{(t-1)} + (1-\\gamma) \\sum z \\qquad e_i^{(t)} = \\frac{m_i^{(t)}}{N_i^{(t)}}",
          caption: "$n_i$ = how many times code $e_i$ was picked this batch. Count, then vector-sum, then re-centre.",
        },
        {
          type: "prose",
          text: "The codebook update no longer relies on gradients — it just tracks the running statistics of which encoder outputs landed in each cell.",
        },
      ],
    },

    {
      id: "bits-dim",
      title: "Does bits/dim tell you quality?",
      blocks: [
        {
          type: "formula",
          tex: "\\text{bits/dim} = \\frac{\\text{NLL in bits}}{\\text{number of dimensions}}",
        },
        {
          type: "keypoints",
          items: [
            "CIFAR-10 bits/dim: VAE **4.51**, VQ-VAE **4.67**, VIMCO **5.14**.",
            "VQ-VAE is slightly *worse* on bits/dim than the plain VAE here — **lower NLL does not mean higher perceptual quality**.",
          ],
        },
      ],
    },

    {
      id: "discussion-mechanics",
      title: "Class discussion — the mechanics",
      blocks: [
        {
          type: "discussion",
          qa: [
            {
              q: "At a high level, how does backprop handle the discontinuous quantization step?",
              a: [
                "**Decoder** — trained by the reconstruction loss only; its job is to turn a code back into the signal, it does not care where the code came from.",
                "**Encoder** — trained by reconstruction (through the straight-through estimator) *plus* the commitment loss; it must both carry useful information and stay near a code.",
                "**Codebook** — trained by the VQ loss (or EMA); it acts like a moving cluster centre, drifting toward the encoder outputs assigned to it. STE steals the reconstruction gradient for the encoder, so the codebook does not get it.",
              ],
            },
            {
              q: "Quantize embeddings $[[0.75, 0], [0.75, 0.75], [0.25, 0.25]]$ against codebook $\\{0{:}[0,0],\\, 1{:}[0,1],\\, 2{:}[1,0],\\, 3{:}[1,1]\\}$.",
              a: [
                "Indices **2, 3, 0**.",
                "$[0.75, 0] \\to$ id 2: $(0.75 - 1)^2 + (0 - 0)^2 = 0.0625$, the smallest of the four distances.",
              ],
            },
            {
              q: "$z_e(x)$ vs $z_q(x)$?",
              a: [
                "$z_e(x)$ — the encoder's continuous output. Lives in continuous space, differentiable.",
                "$z_q(x)$ — $z_e$ snapped to its nearest codebook vector. Lives in the finite set $\\{e_1, \\dots, e_K\\}$, discrete, non-differentiable.",
              ],
            },
            {
              q: "VQ-VAE audio experiments: VCTK, $f_s = 48000$ mono, downsampling factor 64, 512 codes. Bits to store the tokens for 2 s of audio?",
              a: [
                "$2 \\text{ s} \\times 48000 \\tfrac{\\text{samples}}{\\text{s}} \\times \\tfrac{1}{64} \\tfrac{\\text{tokens}}{\\text{sample}} \\times \\log_2 512 \\tfrac{\\text{bits}}{\\text{token}}$",
                "$= 2 \\times 48000 \\times \\tfrac{1}{64} \\times 9 = \\mathbf{13500}$ bits.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "discussion-picture",
      title: "Class discussion — the bigger picture",
      blocks: [
        {
          type: "discussion",
          qa: [
            {
              q: "Why is the straight-through estimator reasonable here, and how does the estimate change during training?",
              a: [
                "We are *also* training the codebook and encoder to shrink the error the quantization step introduces, so the gap between $z_e$ and $z_q$ narrows and the STE estimate **improves** over training.",
                "**Professor** — the key idea is that we backprop *as if the quantization step hadn't happened*. That is reasonable precisely because the rest of training is working to make that approximation true.",
              ],
            },
            {
              q: "Learned codes predict phonemes but not speaker identity. Why — and how would this change at other compression rates?",
              a: [
                "**Information bottleneck** — higher compression forces the code to keep only the factors most critical and stable for reconstruction.",
                "Speaker identity is a **conditionable / separable** factor: if the decoder can get it from elsewhere, the tokens lean toward encoding *content* (phoneme / linguistic).",
                "Phonemes are short, local, composable — a natural fit for discrete codes. Speaker is long, slowly varying, stylistic.",
                "**Harder compression** (sparser, slower tokens) → tokens catch long structure / semantic chunks. **Lighter compression** (denser, faster) → tokens degrade toward low-level acoustics: pitch, periodicity, timbre detail.",
                "**Professor** — adjusting compression is only a coarse, implicit control knob. Precise control is an open problem — the motivation for later disentanglement / factorized-code / multi-stream work.",
              ],
            },
            {
              q: "How does VQ-VAE's lasting impact differ from its original framing?",
              a: [
                "**Lasting impact** — a practical recipe for training discrete autoencoders, and the idea of *discrete latents + an autoregressive prior*.",
                "**Original framing** — an alternative to the VAE, whose value was representation learning (interpretable features) and generative potential, evaluated via the decoder's log-probabilities.",
              ],
            },
            {
              q: "Does VQ-VAE's success across image / audio / video argue that discrete latents are universal?",
              a: [
                "**For** — every modality has structure a discrete code can capture: local composition, semantic units, repeated patterns. Discrete tokens also make long-range modelling easier for an LM / Transformer.",
                "**Against** — the signal level still holds lots of continuous variation (timbre detail, micro-timing, smooth motion, lighting), and forcing it discrete adds quantization error and loss.",
                "**Best guess** — layered / hybrid: continuous low level + discrete high level, or multi-scale multi-rate like Jukebox's hierarchical VQ-VAE. The professor: nature is both discrete and continuous; the real question is how to combine them.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "two-stage",
      title: "VQ-VAE can't generate — the two-stage fix",
      blocks: [
        {
          type: "keypoints",
          items: [
            "VQ-VAE alone cannot sample new data: the latent is a discrete index $k$ with no continuous prior like $z \\sim \\mathcal{N}(0, I)$ to draw from.",
            "**Stage 1** — train the VQ-VAE: a codec that compresses and reconstructs well.",
            "**Stage 2** — on the grid of discrete indices, train a strong autoregressive prior $p(k)$ (PixelCNN, Transformer).",
            "**Sample** — prior → a sequence of indices → codebook lookup → decode.",
          ],
        },
      ],
    },

    {
      id: "vqvae2",
      title: "VQ-VAE-2 — hierarchy + strong prior",
      lede: "Top level manages the outline; bottom level manages the texture.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "A **multi-scale latent space** splits the image into semantics vs texture.",
            "**Top-level latent (global)** — very low resolution (e.g. a 32×32 image down to 8×8). Object layout, shape.",
            "**Bottom-level latent (local)** — higher resolution (e.g. 1/16 or 1/8 of the image). Texture, edges, fine detail — produced *under* the top level's global frame.",
          ],
        },
        {
          type: "keypoints",
          title: "Hierarchical encoding",
          items: [
            "**Bottom encoder** $E_b$: image $x \\to h_\\text{bottom}$.",
            "**Top encoder** $E_t$: downsample $h_\\text{bottom}$ further → deeper $h_\\text{top}$.",
            "**Separate quantization** — each level has its own codebook.",
          ],
        },
        {
          type: "formula",
          tex: "\\hat{x} = D_\\text{bottom}\\big(z_\\text{bottom},\\; D_\\text{top}(z_\\text{top})\\big)",
          caption: "Conditional decoding is top-down: the top reconstruction feeds the bottom decoder.",
        },
        {
          type: "figure",
          figure: "vqvae2-hierarchy",
          caption: "Bottom encoder, then top encoder on its features; two codebooks; the decoder runs top-down.",
        },
      ],
    },

    {
      id: "vqvae2-prior",
      title: "VQ-VAE-2 — the prior",
      blocks: [
        {
          type: "formula",
          tex: "p(z_\\text{top}) = \\prod_i p(z_{\\text{top}, i} \\mid z_{\\text{top}, <i}) \\qquad p(z_\\text{bottom} \\mid z_\\text{top}) = \\prod_i p(z_{\\text{bottom}, i} \\mid z_{\\text{bottom}, <i},\\; z_\\text{top})",
        },
        {
          type: "keypoints",
          items: [
            "Model the **top prior** alone with a strong AR model (deep PixelCNN, or a Transformer with self-attention).",
            "Then the **conditional bottom prior** — the heart of VQ-VAE-2. The bottom codes are no longer generated independently; they are conditioned on the top codes.",
            "Because $z_\\text{top}$ has already fixed the global consistency, the bottom prior only has to worry about **local smoothness** — far less long-range dependency to learn.",
            "**Sample** — top → bottom (conditional) → decode.",
          ],
        },
        {
          type: "formula",
          tex: "\\mathcal{L}_\\text{total} = \\mathcal{L}_\\text{reconstruction} + \\sum_{l \\in \\{\\text{top}, \\text{bottom}\\}} \\big( \\mathcal{L}_{\\text{vq}, l} + \\beta \\, \\mathcal{L}_{\\text{commitment}, l} \\big)",
        },
      ],
    },
  ],
};

const musicGen: Chapter = {
  id: "musicgen",
  title: "MusicGen",
  summary:
    "One decoder-only Transformer doing next-token prediction over EnCodec's RVQ tokens — no cascade. The trick is the codebook interleaving pattern: how to serialise K parallel token streams into one sequence. MusicGen picks the delay pattern.",
  slides: [
    {
      id: "what",
      title: "What MusicGen is",
      lede: "Meta, June 2023. Single-stage, decoder-only, autoregressive on discrete audio tokens.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "A GPT-style **decoder-only Transformer** doing next-token prediction directly on **EnCodec's RVQ tokens** — no semantic → coarse → fine cascade.",
            "It systematically compares **codebook interleaving patterns** (flattening / parallel / delay) and settles on **delay**.",
          ],
        },
        {
          type: "keypoints",
          title: "Lineage",
          items: [
            "**pGSLM** (Sep 2021) — introduced the *delay pattern* for multi-stream speech tokens.",
            "**EnCodec** (Oct 2022) — the conv codec + RVQ that MusicGen tokenises with.",
            "**MusicLM** (Jan 2023) — text→semantic→acoustic *cascade*, the thing MusicGen simplifies.",
            "Mousai, Noise2Music (early 2023) — diffusion approaches in the same window.",
          ],
        },
      ],
    },

    {
      id: "why",
      title: "Why collapse the cascade",
      blocks: [
        {
          type: "keypoints",
          tone: "warn",
          items: [
            "High-fidelity music needs 44.1 / 48 kHz to cover the full band → **very long sequences**.",
            "Music is **multi-instrument** with complex harmony and melody; humans are very sensitive to disharmony, so error tolerance is low.",
            "Prior SOTA (MusicLM) used a **cascade**: semantic tokens → coarse acoustic → fine acoustic. That means slow multi-stage inference, high compute, and **error accumulation** between stages.",
          ],
        },
        {
          type: "prose",
          text: "MusicGen's bet: turn audio into *modelable* discrete tokens once, then let a single strong sequence model do everything.",
        },
      ],
    },

    {
      id: "encodec",
      title: "Tokenization — EnCodec + RVQ",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**EnCodec** (Défossez+ 2022) — conv encoder → quantizer → conv decoder, trained for high-fidelity reconstruction with reconstruction + adversarial losses.",
            "It uses **Residual Vector Quantization (RVQ)** to produce *multi-stream* discrete tokens.",
          ],
        },
        {
          type: "formula",
          tex: "x \\in \\mathbb{R}^{T \\cdot f_s} \\xrightarrow{\\;E\\;} z \\xrightarrow{\\;\\text{RVQ}\\;} Q \\in \\{1, \\dots, M\\}^{T' \\times K} \\xrightarrow{\\;D\\;} \\hat{x}",
          caption: "For 30 s of audio: token frame rate $f_r = 50$ Hz, RVQ depth $K$ (number of quantizers), codebook size $M = 2048$. So $Q \\in \\{1,\\dots,M\\}^{30 f_r \\times K}$.",
        },
      ],
    },

    {
      id: "rvq",
      title: "How RVQ stacks residuals",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Codebook 1** quantizes $z \\to c_1$ — main energy, low frequency, coarse shape.",
            "**Codebook 2** quantizes the *residual* $r_1 = z - \\operatorname{embed}(c_1) \\to c_2$ — detail, high frequency.",
            "**Codebook 3** quantizes $r_2$, and so on.",
            "So $c_2, c_3, c_4$ are meaningless without $c_1$: an explicit causal hierarchy $\\; c_1 \\to c_2 \\to c_3 \\to c_4$.",
          ],
        },
        {
          type: "figure",
          figure: "rvq-residual",
          caption: "Each codebook quantizes what the previous one left over. The sum of the code embeddings approximates $z$.",
        },
      ],
    },

    {
      id: "interleaving-problem",
      title: "The problem: K streams, one sequence",
      blocks: [
        {
          type: "prose",
          text: "A Transformer models a **1-D sequence**, but EnCodec hands you a $T \\times K$ matrix. You need a mapping from that matrix to *the order the model predicts things in* — the **codebook interleaving pattern**. Different patterns are different autoregressive factorizations; some are exact, some are approximations.",
        },
        {
          type: "figure",
          figure: "codebook-interleaving",
          caption: "Rows = the $K$ codebooks, columns = time frames; the number in a cell is which autoregressive step emits it. Flattening (exact, long), parallel (short, wrong), delay (the compromise).",
        },
      ],
    },

    {
      id: "flatten-parallel",
      title: "Flattening vs parallel",
      blocks: [
        {
          type: "keypoints",
          title: "Flattening",
          items: [
            "Emit $c_{t,1}, c_{t,2}, c_{t,3}, c_{t,4}, c_{t+1,1}, \\dots$ — an **exact** AR factorization.",
            "But sequence length ×$K$ and attention cost $O(N^2 K^2)$ — memory and compute blow up.",
          ],
        },
        {
          type: "keypoints",
          title: "Parallel",
          items: [
            "Predict all $K$ codebooks at step $t$ at once — shortest sequence, fastest.",
            "**Wrong independence assumption** — predicting $c_{t,2}$ cannot see $c_{t,1}$, which violates RVQ's residual dependency. Audio quality tanks: the high-frequency detail ($c_2, c_3\\dots$) doesn't line up with the low-frequency outline ($c_1$).",
          ],
        },
      ],
    },

    {
      id: "delay",
      title: "The delay pattern",
      lede: "Flattening's dependency, parallel's short sequence.",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Time-shift** each codebook. Codebook $k$'s frame $t$ goes to sequence position $S = t + (k - 1)$.",
            "So Transformer step $i$ predicts $(c_{i,1},\\; c_{i-1,2},\\; c_{i-2,3},\\; c_{i-3,4})$ together — each codebook still sees the one below it, just from an earlier step.",
            "Sequence length is $N + (K - 1)$, not $N \\times K$.",
          ],
        },
        {
          type: "aside",
          variant: "note",
          title: "A paper error the professor caught",
          text: "§3.1 says \"the delay pattern translates 30 s of audio into 1500 autoregressive steps.\" With the delay pattern the number of sequence steps is N + (K − 1), so it is 1503, not 1500.",
        },
      ],
    },

    {
      id: "arch",
      title: "Architecture & sampling",
      blocks: [
        {
          type: "figure",
          figure: "musicgen-arch",
          caption: "Audio → EnCodec + delay pattern → token streams → decoder-only Transformer → shift back + decode → audio. Text / melody condition it by cross-attention.",
        },
        {
          type: "keypoints",
          items: [
            "**Input** — *sum* (not concat) the $K$ delay-aligned token embeddings, then add a sinusoidal positional embedding. Under the delay pattern the $K$ codebooks at one step already correspond to different real times ($t$, $t-1$, …), and the model learns that.",
            "**Output** — $K$ linear heads, one per codebook, predicting the next step's $K$ tokens.",
            "**Flash Attention** for the long sequences.",
          ],
        },
        {
          type: "keypoints",
          title: "Sampling",
          items: [
            "Top-$k$ with $k = 250$; temperature 1.0.",
            "**CFG** — train with 20% condition dropout; at inference $\\text{logits} = \\text{logits}_\\text{uncond} + w \\cdot (\\text{logits}_\\text{cond} - \\text{logits}_\\text{uncond})$, $w = 3.0$.",
          ],
        },
      ],
    },

    {
      id: "conditioning",
      title: "Conditioning — text & melody",
      blocks: [
        {
          type: "keypoints",
          title: "Text",
          items: [
            "**T5** (default) — pure-text pretraining; universal, strong at following instructions and complex sentence structure.",
            "**CLAP** — audio-text paired pretraining; lower FAD but higher CLAP score, better on audio-specific prompts.",
            "**Professor** — CLAP's continuous, semantically rich space suits *style transfer* and *mixing multiple text prompts*; T5 is better at obeying instructions.",
            "**Injection** — cross-attention: text embedding as Key/Value, audio tokens as Query.",
          ],
        },
        {
          type: "keypoints",
          title: "Melody",
          items: [
            "Feed a reference clip in raw and the model just learns to **copy-paste** it, not re-arrange it.",
            "**Information bottleneck** — Demucs to strip drums / accompaniment → **chromagram** → computed with a **large time window**, which blurs exact timing and timbre and keeps only \"roughly C major here\" contour.",
            "That forces the model to re-imagine the note detail and style itself — real **style transfer**.",
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
              q: "VQ-VAE's audio tokens vs MusicGen's EnCodec tokens — key high-level differences?",
              a: [
                "**Compression target** — VQ-VAE compresses harder and leans toward high-level structure (~phoneme). EnCodec targets high-fidelity reconstruction, so its tokens are lower-level and more detailed.",
                "**Token structure** — VQ-VAE: a 1-D sequence, $\\mathbb{V}^N$, one discrete id per position. EnCodec: RVQ gives a 2-D token grid, $\\mathbb{V}^{N \\times K}$.",
              ],
            },
            {
              q: "Bitrate of EnCodec vs the VCTK VQ-VAE experiment?",
              a: [
                "**VCTK VQ-VAE** — $48000 \\times \\tfrac{1}{64} \\times \\log_2 512 = 48000 \\times \\tfrac{1}{64} \\times 9 = 6750$ bps $= 6.75$ kbps. (The notes flag the true figure as ~2.25 kbps after a correction.)",
                "**EnCodec** — $32000 \\times \\tfrac{1}{640} \\times 4 \\times \\log_2 2048 = 32000 \\times \\tfrac{1}{640} \\times 4 \\times 11 = 2200$ bps $= 2.2$ kbps.",
              ],
            },
            {
              q: "Memorization across model scales — what does the analysis show, and what might it miss?",
              a: [
                "Memorization is measured by matching generated tokens against training tokens. Figure 2b shows MusicGen does **not** over-memorize → good generalization.",
                "But the match is on tokens only — two different token sequences that *sound* the same (similar note / harmony distribution) would slip past the check.",
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const codecLmChapters: Chapter[] = [codecLanguageModels, vqVae, musicGen];
