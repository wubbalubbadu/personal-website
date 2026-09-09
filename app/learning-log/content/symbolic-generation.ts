import type { Unit } from "./types";

/**
 * Unit 6 — "Symbolic Generation" (course §4.1).
 *
 * The language-model foundations behind generating symbolic music. Three
 * chapters:
 *   1. language-models — predict-next-token, the chain rule, n-grams and the
 *      curse of dimensionality, distributed representations.
 *   2. bengio-2003 — "A Neural Probabilistic Language Model".
 *   3. transformer — RNN / seq2seq background, then the Transformer: attention,
 *      positional encodings, the O(n^2) cost, and what music adds.
 *
 * The music-specific models (§4.2 Performance RNN / Music Transformer /
 * Anticipatory, §4.3 REMI / cross-modal) are in `symbolic-music-models.ts`.
 *
 * Transcribed from lecture notes (mixed zh/en).
 */
export const symbolicGenerationUnit: Unit = {
  id: "symbolic-generation",
  title: "Symbolic Generation",
  blurb:
    "The language-model machinery for generating symbolic music. Where language modelling started — n-grams, the curse of dimensionality, Bengio's neural LM — and then the Transformer: attention, positional encodings, and what it costs.",
  chapters: [
    {
      id: "language-models",
      title: "Language models",
      summary:
        "A language model does one thing: given context, predict the next token. Statistical LMs model the joint distribution via the chain rule; n-grams approximate it by counting, and hit the curse of dimensionality; distributed representations are the way out.",
      slides: [
        {
          id: "core-task",
          title: "The core task",
          lede: "Given context, predict the next token.",
          blocks: [
            {
              type: "prose",
              text: "That is the whole job. The token is a **word** in natural language; in **symbolic music** it is a pitch, a duration, or an event token. Music language modelling is every LM technique, applied to music tokens.",
            },
            {
              type: "aside",
              variant: "note",
              title: "The teaching line",
              text: "The lecture follows two core papers: what a language model is and why it matters → what n-grams get wrong → how Bengio 2003 fixes it with distributed representations → how RNN / seq2seq / Transformer pick up from there → applying all of it to music. Intuition over formulas and training minutiae.",
            },
          ],
        },

        {
          id: "statistical-lm",
          title: "Statistical language models",
          blocks: [
            {
              type: "prose",
              text: "A vocabulary $V$ is the set of all tokens; a piece of language is a sequence $w = [w_1, \\dots, w_T] \\in V^T$. The goal is to model the joint distribution $P(w)$ — then you can **sample** it to generate new language. \"Generate text like a human\" (subjective) becomes \"estimate a probability distribution\" (objective).",
            },
            {
              type: "formula",
              tex: "P(w_1^T) = \\prod_{t=1}^{T} P(w_t \\mid w_1^{t-1})",
              caption: "The chain rule. Directly modelling $P(w_1, \\dots, w_T)$ is infeasible — the sequence space has $|V|^T$ possibilities. Modelling $P(w_i \\mid w_{<i})$ instead means the next step has only $|V|$ options.",
            },
            {
              type: "figure",
              figure: "next-token-dist",
              caption: "\"The students opened their ___\" — a distribution over the whole vocabulary. `books` 0.2, `minds` 0.1, `giraffe` ~$10^{-6}$; the $|V|$ probabilities sum to 1.",
            },
            {
              type: "keypoints",
              title: "Where this shows up",
              items: [
                "Grammar / spell check — $P(\\text{their} \\mid \\text{how many quizzes are})$ is low, $P(\\text{there} \\mid \\dots)$ is high.",
                "Speech recognition — pick the transcription with the higher language-model probability among acoustically similar options.",
              ],
            },
          ],
        },

        {
          id: "n-gram",
          title: "N-gram models",
          blocks: [
            {
              type: "formula",
              tex: "P(w_i \\mid w_{<i}) \\approx P(w_i \\mid w_{i-N+1}, \\dots, w_{i-1})",
              caption: "The Markov assumption — the current token depends only on the last $N-1$. Unigram, bigram, trigram, …",
            },
            {
              type: "formula",
              tex: "P(w_i \\mid w_{i-N+1}, \\dots, w_{i-1}) = \\frac{\\operatorname{count}(w_{i-N+1}, \\dots, w_{i-1} \\to w_i)}{\\operatorname{count}(w_{i-N+1}, \\dots, w_{i-1} \\to \\text{any})}",
              caption: "Probabilities are estimated by counting in the training corpus.",
            },
          ],
        },

        {
          id: "curse",
          title: "The curse of dimensionality",
          blocks: [
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "A large discrete vocab times a long context → the number of possible sequences explodes. An N-gram over $|V|$ states needs $|V|^N$ probabilities.",
                "$|V| = 100{,}000$ and a 10-word context → $100000^{10} = 10^{50}$ free parameters. Most sequences seen at test time never appeared in training.",
                "**N too small** → not enough context. A bigram knows $P(\\text{quick} \\mid \\text{are}) = \\tfrac13$ but can't tell \"rabbits are quick\" from \"turtles are quick\".",
                "**N too large** → most n-grams have count 0, so probability 0 (data sparsity).",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "Why classes would help",
              text: "From \"rabbits are fast\", \"cheetahs are quick\", \"turtles are slow\", a trigram cannot generalise to \"rabbits are quick\". But if it knew rabbit and cheetah are both FASTANIMAL, and fast and quick are both FASTWORD, then P(FASTWORD | FASTANIMAL are) = 1 would generalise. The catch: you do not know which words belong in the same class.",
            },
          ],
        },

        {
          id: "distributed-rep",
          title: "The key idea — distributed representation",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**a.** Give every word a **distributed feature vector** $C(i) \\in \\mathbb{R}^m$, with $m \\ll |V|$.",
                "**b.** Express the joint probability of a sequence as a function of those vectors, parameterised by $\\omega$.",
                "**c.** Learn $C$ and $\\omega$ **jointly**.",
              ],
            },
            {
              type: "prose",
              text: "**Why this beats the curse.** If \"dog\" and \"cat\" have similar feature vectors and the probability function is smooth, a small change in features causes only a small change in probability. So one sentence — \"The cat is walking in the bedroom\" — raises the probability of exponentially many *similar* sentences at once.",
            },
            {
              type: "aside",
              variant: "note",
              title: "Vs class-based n-grams (Brown+ 1992)",
              text: "Class-based n-grams use discrete classes (a hard / soft partition). Bengio uses continuous real-valued vectors — a richer, finer-grained notion of similarity. And a high-dimensional vector can carry several unrelated properties at once: if dim 0 is IS_SPORTS_EQUIPMENT and dim 1 is IS_ANIMAL, then plant = [0,0], rabbit = [0,1], ball = [1,0], and bat = [1,1] (both).",
            },
          ],
        },
      ],
    },

    {
      id: "bengio-2003",
      title: "A Neural Probabilistic Language Model",
      summary:
        "Bengio et al. 2003. Parameterise a statistical LM with a neural net: look up a feature vector per context word, run an MLP, softmax over the vocabulary. Trained by minimising average NLL, evaluated by perplexity.",
      slides: [
        {
          id: "contribution",
          title: "What it contributed",
          blocks: [
            {
              type: "keypoints",
              items: [
                "Established **neural parameterisation for statistical LMs** — \"use a neural net to do language modelling\" as a whole paradigm.",
                "Its **distributed word representation** idea evolved directly into word2vec, GloVe, and modern Transformer token embeddings.",
              ],
            },
          ],
        },

        {
          id: "architecture",
          title: "The architecture",
          blocks: [
            {
              type: "formula",
              tex: "P_\\theta(w_i \\mid w_{i-N+1}, \\dots, w_{i-1}) = \\operatorname{SoftMax}\\big(g_\\omega(C(w_{i-1}), \\dots, C(w_{i-N+1}))\\big)",
            },
            {
              type: "formula",
              tex: "x = \\operatorname{cat}\\big([\\,C(w_{i-1}), \\dots, C(w_{i-N+1})\\,]\\big) \\qquad h = \\tanh(d + Hx)",
            },
            {
              type: "formula",
              tex: "y = b + Wx + Uh \\qquad \\text{(logits)}",
              caption: "Table-lookup each context word in $C$, concat into $x$, one $\\tanh$ hidden layer, then logits. The $Wx$ term is an optional direct connection from input to output.",
            },
            {
              type: "figure",
              figure: "bengio-arch",
              caption: "Similar *input* words get similar vectors in $C$; similar *output* words get similar rows in $U$. Similarity is encoded on both sides — that is why it generalises.",
            },
          ],
        },

        {
          id: "logits",
          title: "Logits are log-probs plus a constant",
          blocks: [
            {
              type: "formula",
              tex: "P(w_i = j \\mid \\text{context}) = \\frac{e^{y_j}}{\\sum_{k=1}^{|V|} e^{y_k}} \\qquad\\Longrightarrow\\qquad \\log P(w_i = j \\mid \\text{context}) = y_j - \\log\\!\\Big(\\sum_k e^{y_k}\\Big)",
            },
            {
              type: "prose",
              text: "That second term is the **same constant for every $j$**. So logits are not equal to log-probabilities — they differ by one global, unknown normalisation constant. That is exactly why we say \"the model outputs logits\", not \"the model outputs log-probs\".",
            },
          ],
        },

        {
          id: "training",
          title: "Training — the NLL loss",
          blocks: [
            {
              type: "formula",
              tex: "\\mathcal{L}_{\\text{NLL}} = \\frac{1}{|W|} \\sum_{w_i \\in W} -\\log P_\\theta(w_i \\mid w_{<i})",
              caption: "Maximise the corpus probability = minimise the **average** negative log-likelihood.",
            },
            {
              type: "keypoints",
              items: [
                "**Average, not sum** — \"how accurate is the model per token, on average\". A sum just makes long sequences look worse without meaning the model is worse.",
                "**Why log** — $\\arg\\max \\prod P = \\arg\\max \\sum \\log P$ mathematically, but multiplying many sub-1 probabilities underflows to 0. Logs turn the product into a sum.",
                "Optimise with **SGD + backprop**: sample a batch, $\\theta \\leftarrow \\theta - \\alpha\\, \\partial\\mathcal{L}/\\partial\\theta$, from a random init.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "A recurring theme",
              text: "A lot of modern-ML technique is about numerical stability, not correctness — label smoothing, gradient clipping, mixed-precision training all fall in that bucket.",
            },
          ],
        },

        {
          id: "why-nll",
          title: "Why NLL and not plain likelihood",
          blocks: [
            {
              type: "formula",
              tex: "\\arg\\max_\\theta \\prod P = \\arg\\max_\\theta \\sum \\log P = \\arg\\min_\\theta \\Big(\\!-\\!\\sum \\log P\\Big)",
              caption: "Mathematically equivalent.",
            },
            {
              type: "keypoints",
              title: "But NLL wins in practice",
              items: [
                "**Numerical stability** — no underflow from long products.",
                "**Easier gradients** — log turns products into sums.",
                "**It is cross-entropy** — NLL equals the cross-entropy between the true and predicted distributions, which unifies language modelling with classification.",
              ],
            },
          ],
        },

        {
          id: "evaluation",
          title: "Evaluation — NLL, cross-entropy, perplexity",
          blocks: [
            {
              type: "formula",
              tex: "\\text{NLL}(W_{\\text{test}}) = \\frac{1}{M} \\sum_{i=1}^{M} -\\log P_\\theta(w_i \\mid w_{<i}) \\qquad \\text{PPL}(W_{\\text{test}}) = e^{\\text{NLL}(W_{\\text{test}})}",
              caption: "On a held-out test set of $M$ tokens. Lower is better on both.",
            },
            {
              type: "keypoints",
              items: [
                "Per-word NLL **is** cross-entropy in the LM setting (strictly, cross-entropy $\\ne$ NLL only in more general cases).",
                "Units: $\\ln \\to$ **nats**, $\\log_2 \\to$ **bits**. The bits value is a lower bound on the average bits to encode the test set — Shannon: a language model's quality is its compression power.",
                "**Perplexity** — \"how many equally-likely options does the model think it is choosing among?\" PPL 252 → guessing among 252. It is $1 / (\\text{geometric mean of the true tokens' predicted probabilities})$.",
              ],
            },
            {
              type: "widget",
              widget: "perplexity-lab",
              caption: "Set a predicted distribution over a small vocabulary and watch NLL (nats and bits) and perplexity. Uniform gives PPL = vocab size.",
            },
          ],
        },

        {
          id: "sanity-check",
          title: "The sanity check",
          blocks: [
            {
              type: "prose",
              text: "**Professor** — when you start training a neural language model, its perplexity should be about the **vocabulary size** (a random model spreads probability roughly uniformly). \"A really important sanity check that I feel is commonly overlooked.\"",
            },
            {
              type: "discussion",
              title: "Class discussion — worked numbers",
              qa: [
                {
                  q: "20-word vocab, uniform distribution — NLL and PPL?",
                  a: [
                    "$\\text{NLL} = -\\ln(1/20) = \\ln 20 \\approx 3$ nats.",
                    "$\\text{PPL} = e^{\\ln 20} = 20$.",
                  ],
                },
                {
                  q: "Majority distribution — 100% on the most frequent word, 0% on all others. Average NLL?",
                  a: [
                    "Meeting the common word (say 50% of the time): $-\\ln 1 = 0$.",
                    "Meeting any other word (the other 50%): $-\\ln 0 = +\\infty$.",
                    "Average NLL $= +\\infty$. Assigning exactly zero probability to anything that can occur is catastrophic.",
                  ],
                },
                {
                  q: "DNA unigram: $P(A) = P(T) = 0.2$, $P(C) = P(G) = 0.3$. NLL and PPL vs uniform?",
                  a: [
                    "$\\text{NLL} = -[2(0.2 \\ln 0.2) + 2(0.3 \\ln 0.3)] = -[0.4(-1.609) + 0.6(-1.204)] \\approx 1.366$ nats.",
                    "$\\text{PPL} = e^{1.366} \\approx 3.92$ — a bit below 4, the uniform value, because the distribution is slightly peaked.",
                  ],
                },
                {
                  q: "Brown corpus (~16k vocab), at random init — NLL and PPL?",
                  a: [
                    "Predictions are ≈ uniform $\\approx 1/|V|$, so $\\text{NLL} = \\ln 16000 \\approx 9.68$ nats and $\\text{PPL} \\approx 16{,}000$.",
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "shapes",
          title: "Shapes and parameter count",
          blocks: [
            {
              type: "formula",
              tex: "C: |V| \\times m \\quad x: (n{-}1)m \\quad H: (n{-}1)m \\times h \\quad d: h \\quad W: (n{-}1)m \\times |V| \\quad U: h \\times |V| \\quad b: |V|",
            },
            {
              type: "formula",
              tex: "|V|\\,(1 + nm + h) + h\\,(1 + (n{-}1)m) = 16000(1 + 5\\cdot 60 + 50) + 50(1 + 4\\cdot 60) \\approx 5.6\\text{M}",
              caption: "Parameters for $|V| = 16000$, $m = 60$, $n = 5$, $h = 50$.",
            },
            {
              type: "keypoints",
              tone: "result",
              items: [
                "A standard 5-gram over the same vocab would need $|V|^5 = 16000^5 \\approx 10^{21}$ transition probabilities.",
                "$5.6\\text{M}$ vs $10^{21}$ — that contrast *is* the whole point of the paper.",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "One embedding per word — what about polysemy?",
              text: "Two ways the model copes. The hidden layer adapts each word's contribution to its neighbours (context adaptation) — less structured than later RNN / attention, but present. And the embedding space is high-dimensional, so different senses can live on different axes.",
            },
          ],
        },

        {
          id: "experiment",
          title: "The 2003 experiment",
          blocks: [
            {
              type: "prose",
              text: "3 weeks on 40 CPUs — a very expensive experiment in 2003, a few GPU-hours today. Training a neural net at this scale was a frontier engineering feat at the time.",
            },
            {
              type: "keypoints",
              title: "Findings",
              items: [
                "**Better PPL than the best n-gram** — Brown 312 → 252, AP 117 → 109.",
                "**It uses longer context** — a 5-gram MLP (279) beats a 3-gram MLP (293), while n-grams gain almost nothing going 3 → 5 (sparsity).",
                "**Hidden units help** — 5-gram, no hidden 310 → with hidden 268.",
                "**Interpolating with a trigram still helps** — 276 → 252. \"The fact that simple averaging helps suggests the neural net and the trigram make errors in *different* places.\"",
                "**Direct input→output connections** — converge faster (10 vs 20 epochs) but slightly worse final PPL. Without them the hidden layer is a tighter bottleneck, which may force better generalisation.",
              ],
            },
          ],
        },
      ],
    },

    {
      id: "transformer",
      title: "The Transformer",
      summary:
        "Bengio's model has a fixed context window. RNNs promise unbounded history but pack it into a finite vector. The Transformer drops recurrence entirely: context is attention, order comes from positional encodings, and the price is O(n^2).",
      slides: [
        {
          id: "rnn-background",
          title: "From a fixed window to recurrence",
          lede: "Mikolov+ 2010, Sutskever 2011, Sundermeyer+ 2012, Karpathy 2015.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**The problem with Bengio'03** — it only sees a fixed window of $N-1$ words. If something important sits outside that window, the model has already lost it.",
                "**RNNs** update a hidden state recursively, so in principle they can carry an unbounded history.",
              ],
            },
            {
              type: "figure",
              figure: "rnn-unrolled",
              caption: "N-gram: fixed lookup. Recurrent: a state that feeds back into itself. Unrolled: the same cell applied step by step, each step predicting the next token.",
            },
          ],
        },

        {
          id: "bidirectional",
          title: "Bidirectional RNNs",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Not for generation** — predicting the next token must not peek at the future, so a bidirectional model can't do next-token prediction.",
                "**For understanding tasks** (classification, named-entity recognition, QA) a bidirectional RNN uses context from *both* sides and does better.",
                "That idea evolves directly into BERT's masked language modelling.",
              ],
            },
          ],
        },

        {
          id: "seq2seq",
          title: "Sequence to sequence",
          lede: "Sutskever+ 2014. Support arbitrary x → y tasks.",
          blocks: [
            {
              type: "formula",
              tex: "P_\\theta(y_i \\mid y_{<i},\\, \\operatorname{Enc}_\\phi(x))",
              caption: "$\\operatorname{Enc}_\\phi$ (e.g. a bidirectional RNN) compresses the input sequence into one fixed vector; the decoder is a language model conditioned on it.",
            },
            {
              type: "keypoints",
              items: [
                "This turns **unconditional generation** into **conditional language modelling** — the frame for translation, summarisation, QA, dialogue.",
                "Applications: speech recognition ($x$ = audio, $y$ = transcript); machine translation ($x$ = Chinese, $y$ = Arabic).",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "The bottleneck",
              text: "The encoder has to squeeze the entire input into a single fixed-dimension vector before the decoder sees any of it. It is like reading all of War and Peace and then summarising it in one number. Information is necessarily lost. This bottleneck is exactly what attention was invented to remove.",
            },
          ],
        },

        {
          id: "the-bet",
          title: "The Transformer's bet",
          lede: "Vaswani+ 2017. RNNs have infinite context in theory, very finite context in practice.",
          blocks: [
            {
              type: "prose",
              text: "**The intuition:** an RNN is forced to pack an infinite context into a finite state vector, and that vector fills up.",
            },
            {
              type: "keypoints",
              title: "The Transformer's answer",
              items: [
                "**Drop recurrence** — context is built *entirely* from attention.",
                "**Train in parallel** — an RNN must unroll step by step; a Transformer processes all positions at once.",
                "**Positional encoding** — so the model still knows the order.",
                "**Split encoder and decoder** — the encoder does self-attention; the decoder does self-attention *and* cross-attention onto the encoder's output.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "The professor's framing",
              text: "Attention's essence is not \"a smarter mechanism.\" It is \"I stop trying to compress an infinite amount of context into a finite representation.\"",
            },
          ],
        },

        {
          id: "attention",
          title: "Attention",
          blocks: [
            {
              type: "prose",
              text: "Learn the **relevance** between $M$ outputs and $N$ inputs. Every output can attend to any input position.",
            },
            {
              type: "formula",
              tex: "\\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\!\\left( \\frac{QK^{\\top}}{\\sqrt{d_k}} \\right) V",
              caption: "Scaled dot-product attention. Several of these run in parallel as multi-head attention, then their outputs are concatenated and projected.",
            },
          ],
        },

        {
          id: "pos-enc-idea",
          title: "Positional encodings — the idea",
          lede: "Attention is permutation-invariant, so order has to be injected.",
          blocks: [
            {
              type: "keypoints",
              title: "Naive attempts",
              items: [
                "**Integer position** ($0, 1, 2, \\dots$) — unbounded, and no sense of *relative* distance.",
                "**Normalise to $[0, 1]$ by sequence length** — but \"position 0.5\" is token 5 in a length-10 sequence and token 50 in a length-100 one, so the model never learns a consistent sense of position.",
              ],
            },
            {
              type: "formula",
              tex: "PE_{(pos,\\, 2i)} = \\sin\\!\\big(pos / 10000^{2i/d_{\\text{model}}}\\big) \\qquad PE_{(pos,\\, 2i+1)} = \\cos\\!\\big(pos / 10000^{2i/d_{\\text{model}}}\\big)",
              caption: "The fix: not one number, but a vector whose dimensions are sine/cosine waves at $J$ different frequencies.",
            },
          ],
        },

        {
          id: "pos-enc-clock",
          title: "Positional encodings — the clock",
          blocks: [
            {
              type: "figure",
              figure: "pos-enc-clock",
              caption: "A clock encodes an instant with three hands at three periods: seconds (60 s, fast), minutes (60 min, medium), hours (12 h, slow). Every instant is a unique combination.",
            },
            {
              type: "keypoints",
              items: [
                "Positional encoding does the same, with \"time\" → \"sequence position\" and \"hands\" → \"sine waves\".",
                "**High-frequency waves** turn fast, so they encode fine position differences — \"the previous token\" vs \"this token\".",
                "**Low-frequency waves** turn slowly (hundreds of tokens per cycle), so they encode coarse position — \"start of the sentence\" vs \"end\".",
                "For a repeating sequence like [day, night, day, night], some coordinate of the encoding ends up looking like $[0, 1, 0, 1]$.",
              ],
            },
            {
              type: "widget",
              widget: "positional-encoding",
              caption: "Slide the position and watch the sine coordinates. Fast dimensions flip every step; slow ones barely move.",
            },
          ],
        },

        {
          id: "complexity",
          title: "What it costs",
          blocks: [
            {
              type: "keypoints",
              title: "Per-layer cost ($n$ = sequence length, $d$ = dim, $k$ = kernel, $r$ = restricted window)",
              items: [
                "**Self-attention** — compute $O(n^2 d)$, sequential ops $O(1)$, max path length $O(1)$.",
                "**Recurrent** — $O(n d^2)$, $O(n)$, $O(n)$.",
                "**Convolutional** — $O(k n d^2)$, $O(1)$, $O(\\log_k n)$.",
                "**Restricted self-attention** — $O(r n d)$, $O(1)$, $O(n/r)$.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "The professor on O(n^2)",
              text: "If you accept that any token can be relevant to any other token, O(n^2) is the information-theoretically unavoidable price. Every O(n) attention variant (Linformer, Performer, ...) is doing an approximation — assuming some token-pair dependencies can be ignored. Fine for specific tasks; lossy in the general case.",
            },
            {
              type: "keypoints",
              title: "Impact",
              items: [
                "It created a consistent, predictable relationship between scale and performance — **scaling laws**.",
                "Despite the S4 / Mamba recurrent revival, the Transformer is still the dominant architecture in every applied field.",
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
                  q: "The three ways a Transformer uses multi-head attention.",
                  a: [
                    "**Cross-attention (encoder-decoder)** — decoder queries × encoder keys/values, so the decoder sees the whole input while generating each output token.",
                    "**Self-attention (encoder)** — encoder queries × encoder keys/values, so every input position integrates the whole input.",
                    "**Masked self-attention (decoder)** — decoder queries × decoder keys/values up to the current step, so position $i$ only sees $\\le i$.",
                  ],
                },
                {
                  q: "In Bengio'03 the word embeddings are learned with the model. Transformer embeddings are learned too — so why is the positional encoding a fixed formula?",
                  a: [
                    "The \"right\" positional encoding is knowable **a priori** — we know sequence order matters, whether or not sinusoids are the best way to express it — so it can be handed to the model as an inductive bias.",
                    "Word *meanings* are not knowable a priori, so they have to be learned.",
                  ],
                },
              ],
            },
          ],
        },

        {
          id: "music-challenges",
          title: "What music adds",
          blocks: [
            {
              type: "keypoints",
              tone: "warn",
              items: [
                "**Symbolic music is non-uniform in time.** In text one word is one token. Music has rhythm, note durations, and several notes sounding at once — how do you even tokenise it? This is the core design question of a music LM.",
                "**Very long sequences.** A 3-minute song at fine granularity can be tens of thousands of tokens. How does the model learn long-range structure — the verse / chorus / bridge shape?",
              ],
            },
          ],
        },
      ],
    },
  ],
};
