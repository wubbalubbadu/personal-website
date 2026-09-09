import type { Unit } from "./types";
import { codecLmChapters } from "./codec-lms";

/**
 * Unit 4 — "Music Audio Generation" (course §2). Two branches:
 *   §2.1 Latent diffusion — Stable Diffusion (the reference LDM, an image
 *        model) then Stable Audio (the same recipe on 44.1 kHz stereo music).
 *   §2.2 Codec language models — VQ-VAE (the foundational discrete autoencoder)
 *        then MusicGen. Those chapters live in `content/codec-lms.ts` and are
 *        spread in below.
 *
 * Transcribed from lecture notes, including the class-discussion questions and
 * the figure-reading exercises the student wrote up afterwards.
 */
export const musicAudioGenUnit: Unit = {
  id: "music-audio-generation",
  title: "Music Audio Generation",
  blurb:
    "Two ways to actually generate music audio. **§2.1 Latent diffusion** — Stable Diffusion as the reference model, then Stable Audio on real 44.1 kHz stereo. **§2.2 Codec language models** — quantize to discrete tokens and run a next-token model: VQ-VAE, then MusicGen.",
  chapters: [
    {
      id: "stable-diffusion",
      title: "Latent Diffusion — Stable Diffusion",
      summary:
        "Pixel-space diffusion is too expensive to scale. Split it: a perceptual autoencoder compresses the image, and the diffusion model runs entirely in that small latent. Text and other conditions enter through cross-attention.",
      slides: [
        {
          id: "timeline",
          title: "Where latent diffusion came from",
          lede: "By late 2021 diffusion made the best images — but only slowly, or only small.",
          blocks: [
            {
              type: "keypoints",
              title: "Previous work",
              items: [
                "**2015** — diffusion appears as a technique, on toy datasets.",
                "**2018** — StyleGAN, the unconditional image-generation SOTA.",
                "**2020** — DDPM: high-quality *unconditional* images from diffusion.",
                "**Jan 2021** — DALL·E 1: autoregressive *conditional* image generation.",
                "**Jun 2021** — \"Diffusion Models Beat GANs\": OpenAI does high-quality conditional images with **pixel-wise** diffusion.",
                "**Dec 2021** — Latent Diffusion Models.",
              ],
            },
            {
              type: "prose",
              text: "**The problem.** DALL·E and VQ-GAN kicked off the AI-art boom in 2021, but the models were either slow or capped at low resolution (256×256). The bottleneck: running diffusion **directly in high-resolution pixel space** (e.g. 1024×1024).",
            },
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "Every denoising step is a full U-Net pass over a huge tensor — and training also backprops through it.",
                "Sampling takes hundreds to thousands of steps, so wall-clock time and energy blow up.",
              ],
            },
          ],
        },

        {
          id: "two-stages",
          title: "The core move — two decoupled stages",
          lede: "\"Diffusion is high quality; pixel space is expensive. Move the diffusion into a perceptually-equivalent, lower-dimensional latent.\"",
          blocks: [
            {
              type: "figure",
              figure: "ldm-architecture",
              caption: "Pixel space (encoder $\\mathcal{E}$, decoder $\\mathcal{D}$) on the left; all the diffusion happens in the green latent block; conditions enter the U-Net through cross-attention.",
            },
            {
              type: "keypoints",
              title: "Stage A · Perceptual compression",
              items: [
                "Build an autoencoder that moves image $x$ into a low-dimensional $z$ which drops pixel-level noise but keeps the core semantics.",
                "**Perceptually equivalent** — a human sees roughly the same image (structure, semantics, local realism preserved); some pixel-level high-frequency minutiae are allowed to go.",
              ],
            },
            {
              type: "keypoints",
              title: "Stage B · Semantic generation",
              items: [
                "Train a diffusion model *in $z$-space*: denoise from noise to a latent, then decode back to an image.",
                "$z$ is 8–16× smaller per side than $x$, so training and inference speed up sharply.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Who runs when",
              text: "The encoder compresses the training data for the generative model. The decoder is not used during Stage-B training at all — only at inference, to turn a sampled latent back into pixels.",
            },
          ],
        },

        {
          id: "perceptual-compression",
          title: "Stage A — perceptual compression",
          lede: "The goal is not pixel-perfect reconstruction. It is to hand Stage B a stable, modelable latent interface.",
          blocks: [
            {
              type: "prose",
              text: "**Why not just a plain VAE?** Train the autoencoder with only an L2 / L1 reconstruction loss and it learns to predict *pixel averages* — blurred edges, washed-out texture.",
            },
            {
              type: "keypoints",
              title: "So the reconstruction loss is a stack",
              items: [
                "**Perceptual loss** — compare $x$ and $\\hat{x}$ in a pretrained CNN's feature space, to keep semantics aligned.",
                "**Patch-based adversarial loss** — a discriminator forces the decoder to restore local realism: texture, fur, edges.",
              ],
            },
            {
              type: "formula",
              tex: "z = \\mathcal{E}(x), \\qquad \\tilde{x} = \\mathcal{D}(z) = \\mathcal{D}(\\mathcal{E}(x)), \\qquad f = H/h = W/w",
              caption: "The downsampling factor $f$. The paper finds $f \\in \\{4, 8, 16\\}$ is the sweet spot — larger $f$ saves compute but loses information; smaller $f$ nears pixel space, higher quality but costlier.",
            },
            {
              type: "keypoints",
              title: "Mild compression serves Stage B's inductive bias",
              items: [
                "Stage B runs a **U-Net** in latent space — a stack of conv layers, whose bias is **locality** and **2-D spatial structure**. It assumes the input is tightly correlated on a 2-D plane.",
                "Older methods squeezed the latent to something tiny and very discrete, then modeled it with a 1-D autoregressive Transformer — which **breaks the 2-D structure** (image as token sequence).",
                "LDM keeps $z$ as $h \\times w \\times c$, so the U-Net's convolutions capture local correlation directly. That is why a *milder* compression rate is the right call.",
              ],
            },
            {
              type: "keypoints",
              title: "Regularizing the latent",
              items: [
                "**KL-reg** — a slight KL penalty nudges the latent toward a standard normal, keeping it continuous.",
                "**VQ-reg** — a vector-quantization layer (VQ-GAN style) gives the latent discrete prototypes; sometimes better for semantic modeling.",
              ],
            },
          ],
        },

        {
          id: "ldm",
          title: "Stage B — the latent diffusion model",
          lede: "Standard diffusion, then swap the coordinate system from x to z.",
          blocks: [
            {
              type: "prose",
              text: "**Diffusion recap.** A forward process $q$ gradually adds Gaussian noise; a learned reverse process $p_\\theta$ walks it back.",
            },
            {
              type: "formula",
              tex: "q(x_t \\mid x_{t-1}) = \\mathcal{N}\\big(x_t;\\, \\sqrt{1 - \\beta_t}\\, x_{t-1},\\, \\beta_t I\\big) \\qquad q(x_t \\mid x_0) = \\mathcal{N}\\big(x_t;\\, \\sqrt{\\bar\\alpha_t}\\, x_0,\\, (1 - \\bar\\alpha_t) I\\big)",
              caption: "The noising chain, and its closed form — the \"jump\" property lets you sample $x_t$ in one shot.",
            },
            {
              type: "formula",
              tex: "p_\\theta(x_{t-1} \\mid x_t) = \\mathcal{N}\\big(x_{t-1};\\, \\mu_\\theta(x_t, t),\\, \\Sigma_\\theta(x_t, t)\\big)",
              caption: "The reverse step: given the current blurry state, predict the mean and variance of a slightly cleaner one.",
            },
            {
              type: "figure",
              figure: "diffusion-chain",
              caption: "Forward: add noise, $x_0 \\to x_T$. Reverse: the network removes a little noise at each step, $x_T \\to x_0$.",
            },
            {
              type: "prose",
              text: "Expand the variational bound, simplify the per-step KL between two Gaussians, and the training target collapses to **matching the mean** — which reparametrizes into **predicting the noise**:",
            },
            {
              type: "formula",
              tex: "\\mu_\\theta(x_t, t) = \\frac{1}{\\sqrt{\\alpha_t}}\\left( x_t - \\frac{\\beta_t}{\\sqrt{1 - \\bar\\alpha_t}}\\, \\epsilon_\\theta(x_t, t) \\right) \\qquad\\Longrightarrow\\qquad L \\;\\propto\\; \\big\\lVert \\epsilon - \\epsilon_\\theta(x_t, t) \\big\\rVert_2^2",
              caption: "Every intermediate $x_t$ has the full image dimensionality, so the U-Net's compute grows with resolution squared. That is the cost LDM attacks.",
            },
            {
              type: "keypoints",
              title: "The coordinate swap: x → z",
              items: [
                "Insert the autoencoder. $z = \\mathcal{E}(x)$ compresses e.g. $512\\times512\\times3$ down to $64\\times64\\times4$.",
                "$z$ still has 2-D spatial structure — it has just shed the pixels a human cannot perceive.",
                "Same loss, new domain:",
              ],
            },
            {
              type: "formula",
              tex: "L_{\\text{LDM}} := \\mathbb{E}_{\\mathcal{E}(x),\\, \\epsilon \\sim \\mathcal{N}(0,1),\\, t}\\Big[\\, \\big\\lVert \\epsilon - \\epsilon_\\theta(z_t, t) \\big\\rVert_2^2 \\,\\Big]",
            },
            {
              type: "aside",
              variant: "note",
              title: "Reweighted objective (Ho+ 2020) — why undersample the *early* steps?",
              text: "Small $t$ = tiny pixel-level touch-ups, largely imperceptible detail. Put too much training weight there and the model burns capacity \"pixel-peeping.\" Undersampling small $t$ shifts the learning effort onto the structural / semantic denoising steps in the mid-to-high-noise range.",
            },
            {
              type: "discussion",
              qa: [
                {
                  q: "What is a U-Net and why is it a strong inductive bias here?",
                  a: [
                    "**Contracting path** — a standard CNN: convolutions + downsampling progressively shrink the image while growing the channel count.",
                    "**Expanding path** — up-convolutions grow the feature maps back to full size.",
                    "**Skip connections** — feature maps from the contracting side are *concatenated* (not added, as in ResNet) onto the matching size on the expanding side, so the decoder sees both high-level semantics (from the bottleneck) and high-resolution detail. Essential for fine output.",
                    "It matches 2-D local correlation in images extremely well.",
                  ],
                },
                {
                  q: "LDMs generalize to higher resolutions than they trained on (Figure 8). Why — and how does it fail?",
                  a: [
                    "The latent is a 2-D grid and the U-Net is fully convolutional, so it extends \"sliding-window\" style to a larger canvas.",
                    "Failure modes: global coherence can break, textures repeat, seams / boundary artifacts appear, and attention gets unstable on memory at very large sizes.",
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "cross-attention",
          title: "Conditioning — cross-attention",
          lede: "One generic interface for text, layout, other images.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "A domain-specific encoder $\\tau_\\theta$ **projects** the condition $y$ (e.g. text) into an intermediate sequence of vectors $\\tau_\\theta(y)$.",
                "**Query** comes from the U-Net's own intermediate features; **Key** and **Value** come from $\\tau_\\theta(y)$.",
              ],
            },
            {
              type: "formula",
              tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left( \\frac{QK^{\\top}}{\\sqrt{d}} \\right) V \\qquad Q = W_Q^{(i)}\\, \\varphi_i(z_t),\\quad K = W_K^{(i)}\\, \\tau_\\theta(y),\\quad V = W_V^{(i)}\\, \\tau_\\theta(y)",
            },
            {
              type: "formula",
              tex: "L_{\\text{LDM}} := \\mathbb{E}_{\\mathcal{E}(x),\\, y,\\, \\epsilon,\\, t}\\Big[\\, \\big\\lVert \\epsilon - \\epsilon_\\theta\\big(z_t, t, \\tau_\\theta(y)\\big) \\big\\rVert_2^2 \\,\\Big]",
              caption: "The conditional training target.",
            },
            {
              type: "keypoints",
              title: "Text encoder",
              items: [
                "Turns \"cat\" into a vector carrying visual-semantic information.",
                "In practice, OpenAI's **CLIP ViT-L/14** text encoder.",
              ],
            },
          ],
        },

        {
          id: "cfg",
          title: "Classifier-free guidance",
          lede: "At sampling time, push the prediction away from the unconditional one.",
          blocks: [
            {
              type: "formula",
              tex: "\\epsilon_{\\text{guided}} = \\epsilon_{\\text{uncond}} + s \\cdot \\big( \\epsilon_{\\text{cond}} - \\epsilon_{\\text{uncond}} \\big)",
              caption: "Compute the noise prediction both with and without the prompt, then extrapolate along the difference.",
            },
            {
              type: "widget",
              widget: "guidance-scale",
              caption: "Slide the guidance scale $s$ and watch prompt-adherence trade against diversity.",
            },
            {
              type: "keypoints",
              items: [
                "Larger $s$ → the image sticks more tightly to the prompt, but sample **diversity drops**.",
                "$s = 1$ recovers the plain conditional model; $s = 0$ ignores the prompt entirely.",
              ],
            },
            {
              type: "keypoints",
              title: "Why generated text comes out garbled",
              tone: "warn",
              items: [
                "**Compression loss** — Stage A can drop the thin strokes of glyphs.",
                "**Unstable prediction** — text is highly discontinuous in pixel space, so the U-Net's noise-prediction target struggles to line up with a glyph's sharp discrete boundary.",
              ],
            },
          ],
        },

        {
          id: "ablation",
          title: "Choosing the compression factor",
          lede: "The single most consequential knob in the whole system.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "$f = 1$ (pixel space) — slow, hard to converge.",
                "$f = 32$ — over-compressed; the decoder cannot restore detail and quality collapses.",
                "$f = 4\\text{–}8$ — the golden zone. LDM-4/8 clearly beat the other scales at equal compute.",
              ],
            },
            {
              type: "widget",
              widget: "rate-distortion",
              caption: "Reconstruction fidelity falls and modelability rises as $f$ grows — until the latent is gutted. The band is the $f = 8\\text{–}16$ Goldilocks zone.",
            },
            {
              type: "prose",
              text: "**Class-discussion problem.** If $x \\in \\mathbb{R}^{H \\times W \\times 3}$, $z \\in \\mathbb{R}^{h \\times w \\times c}$, and $f = H/h = W/w$, what is the tensor-size-reduction factor of $z$ relative to $x$?",
            },
            {
              type: "formula",
              tex: "\\text{TSR} = \\frac{H \\cdot W \\cdot 3}{(H/f)\\cdot(W/f)\\cdot c} = \\frac{3}{c}\\, f^{2}",
              caption: "The $f$ gets **squared** because it applies along two spatial dimensions.",
            },
            {
              type: "quiz",
              prompt: "Stable Diffusion uses $f = 8$ and $c = 4$ latent channels. What is the TSR (RGB in)?",
              choices: [
                { text: "$6$" },
                { text: "$48$", correct: true },
                { text: "$24$" },
                { text: "$192$" },
              ],
              explain:
                "$\\text{TSR} = \\tfrac{3}{c} f^2 = \\tfrac{3}{4}\\cdot 64 = 48$. So a $512\\times512\\times3$ image becomes a $64\\times64\\times4$ latent — 48× fewer numbers.",
            },
            {
              type: "widget",
              widget: "tsr-calc",
              caption: "Check it in the calculator — type `B, 3, 512, 512` in and `B, 4, 64, 64` out for the Stable Diffusion case (TSR 48).",
            },
            {
              type: "discussion",
              title: "Class discussion",
              qa: [
                {
                  q: "From Figure 5 alone, which f would you pick?",
                  a: [
                    "**Professor:** probably LDM-16 — it looks to reach the same quality as LDM-8 and LDM-4 despite compressing harder. Not obvious from that figure why the authors preferred LDM-8 / LDM-4.",
                  ],
                },
                {
                  q: "How do FID and IS work, and what do they miss?",
                  a: [
                    "**FID** compares the *distribution* of generated images against a set of real images.",
                    "**IS** is computed from the entropy and diversity of a pretrained classifier's predictions.",
                    "Neither captures aesthetics or creativity. \"Diversity\" is usually defined as coverage of the existing data manifold, not the ability to extrapolate to genuinely new points.",
                  ],
                },
                {
                  q: "The authors claim to \"democratize\" high-res synthesis. Evidence? Limits?",
                  a: [
                    "The experiments do show a large drop in training / inference compute (faster training progress, higher throughput in Figures 5–6).",
                    "But training still used A100s — \"democratized\" only relative to pixel-space diffusion.",
                  ],
                },
                {
                  q: "Key differences between images and audio, and what they mean for diffusion's portability?",
                  a: [
                    "**Frequency content.** Audio changes violently in time — 44.1 kHz, tens of thousands of swings per second, dense fast fluctuation. Natural images are spatially smooth: away from edges, sky / skin / walls change gradually.",
                    "**Perception.** Eyes are acute to edges, shapes, compositional hierarchy. Musical structure is more abstract, and a tiny phase shift that wrecks the L2 distance between two clips can be perceptually inaudible.",
                  ],
                },
                {
                  q: "Why might a VQ-regularized latent give better samples despite worse reconstruction?",
                  a: [
                    "Modelability view: the quantization constraint **curates away** hard-to-model noise and high-frequency debris, so the latent distribution is more regular and diffusion learns $p(z)$ more easily.",
                    "The cost is decoder freedom at reconstruction time — hence slightly worse round-trip fidelity.",
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "reading-figures",
          title: "Reading the paper's figures",
          lede: "Two figure-critique exercises — a transferable skill for reading any paper.",
          blocks: [
            {
              type: "figure",
              figure: "perceptual-vs-semantic",
              caption: "Distortion vs. rate. The flat right region is perceptual compression; the steep left region is semantic compression.",
            },
            {
              type: "discussion",
              title: "Rewrite the Figure 2 caption so it actually explains the figure",
              qa: [
                {
                  q: "A clearer caption",
                  a: [
                    "**Perceptual compression (right, flat region)** — handled by the autoencoder. It removes high-frequency detail imperceptible to humans; the curve is flat, so the bit rate can be cut a lot for very little added distortion (RMSE).",
                    "**Semantic compression (left, steep region)** — modeling the conceptual composition and structure of the data. The curve goes near-vertical: compressing further now costs enormous distortion.",
                  ],
                },
              ],
            },
            {
              type: "discussion",
              title: "What is misleading about Figure 4?",
              qa: [
                {
                  q: "The risk, and a caption fix",
                  a: [
                    "The selection process is not described, so the samples may be cherry-picked rather than typical.",
                    "It also does not say whether these are *reconstructions* or *generated* images.",
                    "The caption should state something like \"randomly selected,\" and if the images are generated, give the prompt.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "stable-audio",
      title: "Stable Audio",
      summary:
        "Stable Diffusion's recipe on 44.1 kHz stereo music. Two things are genuinely new: conditioning on text well (a purpose-trained CLAP encoder) and generating variable-length audio (timing embeddings).",
      slides: [
        {
          id: "recipe",
          title: "The same recipe, now on 44.1 kHz stereo",
          lede: "VAE + latent diffusion + cross-attention — the parts you already know.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "A **VAE** downsamples the waveform ~1024× into a latent; a **diffusion U-Net** generates in that latent; conditions enter by **cross-attention**. All from the Stable Diffusion chapter.",
                "What is new for music: getting **text conditioning** to actually work, and generating **variable-length** audio (12 s, 30 s, 95 s) from one model.",
              ],
            },
          ],
        },

        {
          id: "text-cond",
          title: "Text conditioning — a purpose-trained CLAP",
          blocks: [
            {
              type: "keypoints",
              items: [
                "They trained their **own CLAP** text encoder (~108M params) instead of using an off-the-shelf one.",
                "The **next-to-last layer** embeddings condition better than the final layer — stronger control and text–audio alignment.",
                "Their encoder beats both open-source CLAP and T5 embeddings on this task.",
                "**Injection:** text tokens and timing tokens form one sequence, fed to the U-Net by cross-attention.",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "Why train your own CLAP instead of reusing T5",
              text: "Domain match — the label vocabulary, timbre distribution, and music/SFX mix of the training data sit closer to the task, so text–audio alignment is more direct. CLAP embeddings also live in a shared space that is friendlier to mixing / interpolating prompts. T5 gives you general text semantics but no guarantee that the *audio-controllable* dimensions are even encoded; CLAP's objective is exactly text-audio alignment.",
            },
            {
              type: "keypoints",
              title: "The cost",
              tone: "warn",
              items: [
                "**Generalization risk** — in-house text may skew toward a \"stock-music description\" style; open-domain prompts (long narrative, metaphor, niche cultural references) may be weaker.",
                "Training a CLAP encoder is expensive.",
                "**Evaluation-loop risk** — if you later evaluate with retrieval / embeddings from the *same* distribution, metrics can look good while the listening experience does not improve (representation leakage).",
              ],
            },
          ],
        },

        {
          id: "timing-cond",
          title: "Timing conditioning — the setup",
          lede: "Two goals: variable length, and a sense of where you are in the song.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Variable-length generation** — the user might want 12 s, 30 s, or 95 s, all from one model.",
                "**Time-position awareness** — the model should know \"what second am I at\" and \"how long until the end\", so it can behave differently at the start, the middle, and the end (like a human).",
              ],
            },
            {
              type: "keypoints",
              title: "Two timing numbers",
              items: [
                "`seconds_start` — the current chunk's start second inside the full audio file.",
                "`seconds_total` — the full audio file's total duration in seconds.",
              ],
            },
            {
              type: "figure",
              figure: "timing-conditioning",
              caption: "Left: the audio file is longer than the training window, so a 95 s window is cropped from inside it. Right: the file is shorter, so it is padded with silence out to the window length.",
            },
          ],
        },

        {
          id: "timing-mech",
          title: "Timing conditioning — the mechanism",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Training and generation both work in a fixed maximum **95.1 s window** — random-crop it from longer audio, silence-pad it from shorter audio.",
                "For **each second** of the window, build one timing embedding (per-second embeddings).",
                "Treat that string of timing embeddings as a sequence of condition tokens, **concatenate it with the text embedding along the sequence dimension**, and feed the whole thing into the U-Net's cross-attention.",
              ],
            },
          ],
        },

        {
          id: "rtf",
          title: "Real-time factor — and why the fixed window costs you",
          blocks: [
            {
              type: "formula",
              tex: "\\text{RTF} = \\frac{\\text{generated audio length}}{\\text{time taken to generate it}} = \\frac{95}{8} = 11.875",
            },
            {
              type: "widget",
              widget: "rtf-calc",
              caption: "Generate 95 s in 8 s → RTF 11.875 (faster than real time). Drag both.",
            },
            {
              type: "keypoints",
              items: [
                "**Latency RTF** — the minimum time to produce one output. Matters for a single user's wait.",
                "**Throughput RTF** — the effective factor once you batch many requests. Matters for API-scale serving.",
                "The paper does not separate the two; the professor thinks it should.",
              ],
            },
            {
              type: "quiz",
              prompt: "Stable Audio takes 8 s to generate a 95 s clip. Roughly how long to generate a 30 s clip?",
              choices: [
                { text: "~2.5 s — it scales linearly with length" },
                { text: "~8 s — it still runs the full 95 s window", correct: true },
                { text: "~30 s — real time" },
                { text: "instant — 30 s is below the minimum" },
              ],
              explain:
                "Training crops everything to the 95.1 s window and silence-pads shorter targets, so generating 30 s still runs the full 95 s of diffusion compute (the last 65 s is silence). Generation time does **not** scale with target length. The stated answer is 3.75× real time.",
            },
            {
              type: "aside",
              variant: "note",
              title: "VAE output shape, worked",
              text: "For 256 s of stereo input at 44.1 kHz with a 32× VAE downsample: (256 · 44100 · 2) / 32 = 64 · 11025 latent elements.",
            },
          ],
        },

        {
          id: "eval",
          title: "Evaluating it",
          blocks: [
            {
              type: "keypoints",
              title: "Quantitative",
              items: [
                "**Fréchet Distance** — similarity between the statistics of the generated set and a reference set in a feature space.",
                "**KL divergence** — semantic / condition-consistency.",
                "**CLAP score** — text–audio alignment.",
              ],
            },
            {
              type: "keypoints",
              title: "Qualitative (human)",
              items: [
                "Audio quality (lo-fi with artefacts vs hi-fi), text alignment, musicality (melody & harmony).",
                "**Stereo correctness** — is the spatial image appropriate.",
                "**Musical structure** — does the song contain an intro, development, and/or outro.",
              ],
            },
            {
              type: "discussion",
              title: "Class discussion",
              qa: [
                {
                  q: "How to balance objective metrics against subjective artistic judgement in creative audio generation?",
                  a: [
                    "**Professor** — humans are actually poor at judging *diversity* (it means holding many outputs in mind at once). Human evaluation is the gold standard for *quality*; automatic metrics may be better at capturing diversity.",
                  ],
                },
                {
                  q: "Does this method work equally well across genres?",
                  a: [
                    "Electronic and pop fit well — clear patterns, repetitive rhythm. Jazz is hard — irregular rhythm, lots of micro-variation, unusual chords, hard to tell if generated jazz is actually good. Rap is hard — lyric content, semantic coherence, complex rhyme; and many sub-genres (trap, drill, boom bap, gospel).",
                    "**Professor** — ironically, models tend to *excel* at \"virtuosic\" genres like jazz that humans consider harder. Music with very long structure (classical forms that repeat across minutes) is the real problem.",
                  ],
                },
                {
                  q: "What artistic / workflow elements does Stable Audio's control miss?",
                  a: [
                    "It captures general audio attributes but tends to miss repetition and weaker-mode *intentional* structure — and it is **worst at structural development**, better at intros and outros.",
                    "Meaningful lyrics are hard; personal style and context are hard to convey through the control inputs; low-coverage genres suffer from data bias.",
                    "**Professor** — symbolic control (e.g. MIDI) would raise the tool's value for creative work.",
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "params",
          title: "Self-study — where do the parameters go?",
          lede: "Questions the class did not get to; worked out afterward.",
          blocks: [
            {
              type: "keypoints",
              title: "How big is the latent autoencoder?",
              items: [
                "VAE 133M · Diffusion 907M · text encoder (RoBERTa) 110M.",
                "The timing embedders are a rounding error; the latent AE is $133 / (133 + 907 + 110) \\approx 11\\%$ of the system.",
              ],
            },
            {
              type: "keypoints",
              title: "Per-level \"total TSR\" of the diffusion U-Net",
              items: [
                "4 levels — channels $[1024, 1024, 1024, 1280]$, downsampling factors $[1, 2, 2, 4]$.",
                "Raw length $L$ samples (stereo → 2 channels); the VAE downsamples 1024×, so the latent time length is $L / 1024$.",
                "Feature-map size at level $i$: $N_i = C_i \\cdot \\dfrac{L}{1024 \\cdot ds_i}$.",
              ],
            },
            {
              type: "formula",
              tex: "\\text{TSR}_i = \\frac{N_\\text{raw}}{N_i} = \\frac{2L}{C_i \\cdot \\frac{L}{1024 \\cdot ds_i}} = \\frac{2048 \\cdot ds_i}{C_i} \\quad\\Rightarrow\\quad \\text{level 0: } \\frac{2048 \\cdot 1}{1024} = 2",
            },
            {
              type: "discussion",
              qa: [
                {
                  q: "What might the timing-accuracy evaluation be missing?",
                  a: [
                    "The paper's timing-reliability check is basically an **energy-threshold silence detector** run on the output to find the end point — and the authors admit it has false positives.",
                    "It only measures *when the audio goes silent*, not *whether the structure sounds like an ending*. Music endings are not strictly silent — fade-outs, sustained final notes, reverb tails.",
                    "It weakly checks `seconds_total` and barely checks the semantics of `seconds_start`.",
                  ],
                },
                {
                  q: "Is 95 s \"long-form\"? What structure can it capture?",
                  a: [
                    "Not really — the genuinely hard case is very long structure (classical forms spanning minutes or hours).",
                    "**Can** capture: a coarse intro → development → outro three-part shape; local motifs, rhythmic feel, timbre consistency, short-range repetition.",
                    "**Can't** reliably capture (needs minute-scale context): multi-return verse–chorus loops (the core of a 2–4 min song), long-range key changes and narrative arcs, classical / orchestral long forms.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    ...codecLmChapters,
  ],
};
