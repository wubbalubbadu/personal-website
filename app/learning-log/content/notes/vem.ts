import type { Note } from "./index";

/**
 * Video Echoed in Music (VeM): Semantic, Temporal, and Rhythmic Alignment for
 * Video-to-Music Generation. Reading notes — same goal as VidMusician but on a
 * latent-diffusion backbone, with a much deeper (three-level) video parse and a
 * masked cross-attention so each shot only conditions its own stretch of music.
 */
export const videoEchoedInMusic: Note = {
  id: "vem",
  title: "Video Echoed in Music (VeM)",
  kind: "Paper note",
  summary:
    "Video-to-music on a latent-diffusion backbone. Parse the video at three levels (global / storyboard / frame), condition each stretch of music only on the shot it lines up with, and bend accents onto the cuts with an AdaLN adapter.",
  slides: [
    {
      id: "pitch",
      title: "The pitch",
      lede: "Same video-to-music goal as VidMusician, but a latent-diffusion backbone and a much deeper video parse.",
      blocks: [
        {
          type: "prose",
          text: "*VeM* is a **latent-diffusion** V2M system. It names two failure modes in prior work: shallow video understanding gives weak **mood / theme** alignment, and weak **temporal + rhythmic** alignment means beats don't land on cuts.",
        },
        {
          type: "keypoints",
          title: "Five things a video → music mapping has to respect",
          items: [
            "The overarching theme, atmosphere, and emotional impact.",
            "Segmentation into coherent shots.",
            "Narrative and visual composition *within* a shot.",
            "Each shot's temporal bounds and duration.",
            "Frame-accurate timing of visual changes.",
          ],
        },
        {
          type: "keypoints",
          tone: "result",
          items: [
            "Those collapse onto **three levels** — Global, Storyboard, Frame.",
            "Three modules: a **Hierarchical Video Parser** (perception), a **TB-Aligner + Adapter** (rhythm), and a **latent music diffusion** model (generation).",
            "Ships **TB-Match**, a dataset from e-commerce ads and short video, weighted toward rhythmic hit-points.",
          ],
        },
      ],
    },
    {
      id: "global",
      title: "Global level — what is this video about",
      blocks: [
        { type: "figure", figure: "v2m-three-levels", caption: "Each level of the parse maps to a different musical attribute and enters the diffusion model at a different place." },
        {
          type: "keypoints",
          title: "Video understanding",
          items: [
            "**Qwen-VL-7B** → one global caption (\"A cinematic shot of a futuristic city with neon lights at night…\").",
            "**CLAP** text encoder → conditioning embedding $f_t^{C}$.",
            "Sets **Theme / Atmosphere** for the whole score — sci-fi vs pastoral vs suspense.",
          ],
        },
        {
          type: "keypoints",
          title: "Music emotion recognition — training only",
          items: [
            "**Spleeter** → keep the instrumental stem.",
            "**MusicAgent** → up to 50 emotion / style tags (uplifting, tense, romantic, acoustic).",
            "**CLAP** text encoder → $f_t^{T}$. Nudges **Instrumentation & Tonality** — an \"acoustic\" cue pushes toward guitar or piano, not synth.",
          ],
        },
      ],
    },
    {
      id: "storyboard",
      title: "Storyboard level — shot by shot",
      blocks: [
        {
          type: "keypoints",
          title: "Segmentation",
          items: [
            "**ResNet(2+1)D-18** finds shot boundaries by inter-frame dissimilarity → each shot's start $s_i$ and duration $d_i$.",
            "A learnable **continuous-time MLP** encodes those to $f_s^{story_i},\\, f_d^{story_i}$.",
            "Tells the music *when* to change section — verse into chorus.",
          ],
        },
        {
          type: "keypoints",
          title: "Description",
          items: [
            "**Qwen-VL-7B** per shot → a local caption (\"The kitten hid in the grass, squinted its eyes…\").",
            "**CLAP** → $f_t^{story_i}$. Local narrative + emotion: fast jumps → denser rhythm, a wide static shot → sparser instrumentation.",
          ],
        },
        {
          type: "keypoints",
          title: "Visual features",
          items: [
            "**MAViL** (Masked Audio-Video Learners) per shot → $f_v^{story_i}$, projected into a shared video–audio latent.",
            "MAViL was pretrained by aligning video with audio, so it pulls generated **timbre** toward the picture's texture.",
          ],
        },
      ],
    },
    {
      id: "diffusion",
      title: "Latent music diffusion",
      blocks: [
        {
          type: "keypoints",
          items: [
            "A **VAE** compresses a mel spectrogram $X$ to a latent $z_0$.",
            "A **T-UNet** denoises in that latent; standard DDPM forward / reverse.",
            "The vanilla attention blocks are swapped for **SG-CAtt** (next slide).",
          ],
        },
        { type: "formula", tex: "q(z_t \\mid z_0) = \\mathcal{N}\\!\\big(z_t;\\ \\sqrt{\\bar\\alpha_t}\\, z_0,\\ (1-\\bar\\alpha_t) I\\big)" },
        { type: "formula", tex: "\\mathcal{L} = \\mathbb{E}_{z_0,\\,\\epsilon,\\,t,\\,c}\\Big[\\, \\big\\lVert \\epsilon - \\epsilon_\\theta(z_t,\\, t,\\, c) \\big\\rVert^2 \\,\\Big]", caption: "Predict the noise, conditioned on $c$ = the concatenated video features." },
      ],
    },
    {
      id: "sg-catt",
      title: "Storyboard-Guided Cross-Attention",
      lede: "Make each shot's conditioning act only on the stretch of music that lines up with it.",
      blocks: [
        {
          type: "keypoints",
          title: "Build the keys and values",
          items: [
            "Per shot $i$, concatenate global + shot-specific features: $f_{att}^{i} = \\{\\, f_t^{C} \\,\\Vert\\, f_t^{T} \\,\\Vert\\, f_t^{story_i} \\,\\Vert\\, f_v^{story_i} \\,\\Vert\\, f_s^{story_i} \\,\\Vert\\, f_d^{story_i} \\,\\}$.",
            "Stack over shots → $F_{att}$. Then $K = F_{att} W_K$, $V = F_{att} W_V$, $Q = z_t W_Q$.",
          ],
        },
        { type: "formula", tex: "\\text{sMask}_{x,y} = \\begin{cases} 1, & s^i \\le x,\\ \\ y < s^i + d^i \\\\ 0, & \\text{otherwise} \\end{cases}", caption: "On only where music time $x$ falls inside shot $i$'s window along the condition axis $y$." },
        { type: "formula", tex: "\\text{Attention}(Q,K,V) = \\operatorname{softmax}\\!\\Big(\\text{sMask} \\odot \\tfrac{QK^\\top}{\\sqrt{d}}\\Big) V" },
        {
          type: "aside",
          variant: "note",
          title: "What the mask buys",
          text: "It's the \"this caption only affects its own segment\" guarantee. Without it, a late shot's description could colour the opening bars.",
        },
      ],
    },
    {
      id: "tb-as",
      title: "Frame level — is this cut also a beat?",
      lede: "TB-As: Transition-Beat Aligner & Adapter.",
      blocks: [
        {
          type: "keypoints",
          title: "Detect (labels)",
          items: [
            "**PySceneDetect** → per-frame 0/1 transition track $f_b^{frame\\text{-}v}$.",
            "**RNN beat detector** (Böck et al., 2016) → per-frame beat track $f_b^{frame\\text{-}m}$.",
          ],
        },
        {
          type: "keypoints",
          title: "Aligner",
          items: [
            "Supervision is the **intersection** $f_b^{frame} = f_b^{frame\\text{-}v} \\cap f_b^{frame\\text{-}m}$ — frames that are a cut *and* a beat.",
            "A **ResNet(2+1)D-18** learns to predict those \"transition-stomp\" frames from video alone. Frozen after training.",
          ],
        },
        { type: "formula", tex: "\\mathcal{L}_{BCE} = -\\tfrac{1}{N} \\sum_{i} \\big[\\, f_b^{frame_i} \\log \\hat f_b^{frame_i} + (1 - f_b^{frame_i}) \\log(1 - \\hat f_b^{frame_i}) \\,\\big]" },
        {
          type: "keypoints",
          title: "Adapter",
          items: [
            "Takes the Aligner's per-frame stomp probability (16 fps) → two sequences $\\gamma_i,\\, \\beta_i$.",
            "**AdaLN** in every UNet encoder block: $z_i \\leftarrow z_i + \\gamma_i\\, z_i + \\beta_i$.",
            "Modulates the *distribution* (rhythm), not the content.",
          ],
        },
      ],
    },
    {
      id: "training",
      title: "Training — three phases",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**Phase 1** — pre-train the VAE (mel reconstruction) and the TB-Aligner (BCE) independently, then freeze both.",
            "**Phase 2** — train the T-UNet + timing embedder on Global + Storyboard conditioning only, with TB-As bypassed. This is where SG-CAtt is learned. CLAP and MAViL stay frozen.",
            "**Phase 3** — bring in the frozen Aligner, train just the TB-Adapter to bend accents onto the cuts. Music quality already exists from Phase 2, so this is only a nudge.",
          ],
        },
      ],
    },
    {
      id: "eval",
      title: "Eval, and what's still broken",
      blocks: [
        {
          type: "keypoints",
          title: "Objective",
          items: [
            "**Quality** — IS, FAD, KLD.",
            "**Semantics** — CLAP score, LanguageBind score.",
            "**Timing** — duration-weighted tw-CLAP / tw-LB.",
            "**Rhythm** — BIoU (generated vs ground-truth beats), TBIoU (transitions vs beats within a 0.5 s window).",
          ],
        },
        { type: "formula", tex: "\\text{TBIoU} = \\dfrac{|T_v \\cap B_m|}{|T_v \\cup B_m|}", caption: "$T_v$ = video transition times, $B_m$ = music beat times." },
        {
          type: "keypoints",
          title: "Human",
          items: [
            "50 raters — 30 film / music experts, 20 not — over 16 videos.",
            "VeM against CMT, Diff-BGM, M2UGen, VidMuse, GVMGen. Top-1 preference plus MOS-Q (quality) and MOS-A (alignment).",
          ],
        },
        {
          type: "keypoints",
          title: "Open problems",
          tone: "warn",
          items: [
            "Dense cuts against a steady beat period → you can't land every cut. Need the shared multimodal *change points*, not every transition.",
            "Wants exposed knobs — mask and adapter strength as explicit parameters — and an edit-then-generate hybrid (RISE-style seamless cut-points, then generative fill).",
          ],
        },
      ],
    },
  ],
};
