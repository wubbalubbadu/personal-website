import type { Note } from "./index";

/**
 * VidMusician: Video-to-Music Generation with Semantic-Rhythmic Alignment via
 * Hierarchical Visual Features. Reading notes — the interesting move is doing
 * semantic *and* rhythmic conditioning on a fully frozen MusicGen, training
 * ~25M parameters instead of a backbone.
 */
export const vidMusician: Note = {
  id: "vidmusician",
  title: "VidMusician",
  kind: "Paper note",
  summary:
    "Score a video with a frozen MusicGen: slow global CLIP features carry mood through cross-attention, fast local patch features carry rhythm through in-attention. ~25M trainable params.",
  slides: [
    {
      id: "pitch",
      title: "The pitch",
      lede: "Hand a frozen text-to-music model a video and get back a soundtrack that matches both the mood and the cuts.",
      blocks: [
        {
          type: "prose",
          text: "**Video-to-music (V2M)**: input a silent clip, output a fitting instrumental. *VidMusician* does it by bolting two conditioning paths onto a **pretrained, frozen MusicGen** rather than training a music model from scratch.",
        },
        {
          type: "keypoints",
          title: "A soundtrack has to match two different things",
          items: [
            "**Semantics** — theme, atmosphere, instrumentation. Slow-moving; a scene's *feel* changes over seconds, not frames.",
            "**Rhythm** — accents and hits landing on cuts and strong motion. Needs near-frame-accurate placement.",
            "Most prior V2M handles one or the other. Motion-driven methods (dance, gait) get rhythm but only for human-centred video, not ads or animation.",
          ],
        },
        {
          type: "keypoints",
          title: "Why not just train a V2M model",
          tone: "warn",
          items: [
            "The music quality people actually want lives in large text-to-music models (MusicGen). Retraining a backbone on V2M data is expensive and tends to lose it.",
            "Prior conditioning is at the **cross-attention level only** — too coarse to place an accent on a specific music token without disturbing harmony and arrangement.",
          ],
        },
      ],
    },
    {
      id: "idea",
      title: "Divide and conquer by timescale",
      blocks: [
        {
          type: "prose",
          text: "Split the visual signal by how fast it moves. **Slow, global** features drive semantics; **fast, local** features drive rhythm. Different features, different injection points, and the backbone never moves.",
        },
        { type: "figure", figure: "v2m-two-branch", caption: "Two visual streams off the same video, injected into a frozen MusicGen at two different attention sites." },
        {
          type: "keypoints",
          items: [
            "**Foundational model** — pretrained MusicGen: an autoregressive decoder over EnCodec tokens. Fully frozen.",
            "**Semantic Conditioning Module** — global visual features → new cross-attention.",
            "**Rhythm Conditioning Module** — local visual features → in-attention inside the self-attention stack.",
          ],
        },
      ],
    },
    {
      id: "semantic",
      title: "Semantic branch — video frames as pseudo-text",
      lede: "1 fps CLIP features, pushed through T5 so MusicGen reads them like a prompt.",
      blocks: [
        {
          type: "keypoints",
          title: "Extract",
          items: [
            "Sample the video at **1 fps**.",
            "Run each frame through the **CLIP-ViT** image encoder, keep the `[CLS]` token.",
            "Stack them into a global sequence $V_S = [\\,s_i = E(v_i)[0]\\,]$, with $s_i \\in \\mathbb{R}^{1\\times D}$.",
          ],
        },
        {
          type: "keypoints",
          title: "Map into T5's text-embedding space",
          items: [
            "**Embedding Manager $E(\\cdot)$** — a linear layer placing each $s_i$ in T5's input space.",
            "**T5 encoder $T(\\cdot)$** — LoRA-tuned so it treats these *visual pseudo-tokens* as if they were text embeddings.",
            "**Projector $P(\\cdot)$** — maps T5's output to the conditioning dimension MusicGen expects.",
          ],
        },
        { type: "formula", tex: "F_S = P\\big(T(E(V_S))\\big)" },
        {
          type: "keypoints",
          tone: "result",
          items: [
            "Add a cross-attention in **every** MusicGen layer with $F_S$ as keys/values.",
            "Drives overall style / mood / instrumentation. It's a slow signal (1 fps), so no frame-level sync is asked of it.",
          ],
        },
      ],
    },
    {
      id: "rhythm-signal",
      title: "Rhythm branch — change is the signal",
      lede: "How do you tell a music token \"the picture just jumped here, put an accent\"?",
      blocks: [
        {
          type: "keypoints",
          title: "Extract",
          items: [
            "Same video at **25 fps**, through the same CLIP-ViT — but keep the **patch** features, not `[CLS]`.",
            "Patch features react sharply to motion inside a shot and to things entering or leaving frame. Their **rate of change** is what tracks rhythm.",
          ],
        },
        {
          type: "keypoints",
          title: "Turn it into a per-frame intensity",
          items: [
            "Cosine similarity between adjacent frames' patch features. Low similarity → big visual change → candidate accent or transition. High similarity → still image → steady music.",
            "Convert to a distance, prepend a 1 to keep length, then linearly interpolate up to **50 fps** to line up with the MusicGen token grid.",
          ],
        },
        { type: "formula", tex: "d_t = 1 - \\operatorname{sim}(p_t,\\, p_{t-1}), \\qquad d_0 = 1", caption: "$p_t$ = patch features of frame $t$. Larger $d_t$ = more drastic change." },
      ],
    },
    {
      id: "in-attention",
      title: "Rhythm branch — in-attention, not cross-attention",
      blocks: [
        {
          type: "prose",
          text: "Feeding $d$ to a cross-attention has two problems: attention weight **spreads across many keys**, so precise time alignment is lost, and cross-attention is $O(L^2)$ in a long token sequence.",
        },
        {
          type: "keypoints",
          title: "In-attention (after MuseMorphose / MusiConGen)",
          items: [
            "A **Zero-Linear** projection $O(\\cdot)$, then a chain of **Identity-Linear** layers $L_j$, produce a per-block modulation vector $F_{Rj}$.",
            "Add it to the hidden state right before block $j$'s first self-attention.",
            "Only the first $\\tfrac{3}{4}$ of blocks get it.",
          ],
        },
        { type: "formula", tex: "F_{Rj} = L_j\\big(L_{j-1}(\\cdots L_1(O(d)) \\cdots)\\big), \\qquad h_{j+1} = B_j\\big(h_j + F_{Rj}\\big)" },
        {
          type: "aside",
          variant: "intuition",
          title: "Why Zero-Linear",
          text: "It starts at zero, so at initialisation the rhythm branch is a no-op. It can only *gradually* learn to nudge timing — it never abruptly overwrites the backbone's harmony and arrangement.",
        },
      ],
    },
    {
      id: "training",
      title: "Training — two stages, backbone frozen",
      blocks: [
        {
          type: "keypoints",
          items: [
            "MusicGen's autoregressive decoder is frozen the whole way through.",
            "**Stage 1** — train the semantic module only.",
            "**Stage 2** — add the rhythm module, initialised so $F_R^{(j)} = 0$, so Stage-1 semantics survive the hand-off.",
          ],
        },
        {
          type: "keypoints",
          title: "What actually trains (PEFT)",
          tone: "result",
          items: [
            "The linear projectors + T5 LoRA + the rhythm module: about **24.79M** parameters.",
            "For contrast, VidMuse trains **1.88B**.",
          ],
        },
      ],
    },
    {
      id: "data",
      title: "DVMSet",
      blocks: [
        {
          type: "keypoints",
          items: [
            "**3839** video–music clips: promo videos, commercials, compilations, animation.",
            "Deliberately *not* dance or performance footage — the point is to cover video where no human body is driving the rhythm.",
          ],
        },
        {
          type: "keypoints",
          title: "Preprocessing",
          items: [
            "Scraped from YouTube / Bilibili by keyword (\"food commercial\", \"promo video\", \"anime compilation\", …).",
            "**Demucs** to strip vocals and keep the backing track; loudness-normalise; cut to 60 s; manual filtering.",
          ],
        },
      ],
    },
  ],
};
