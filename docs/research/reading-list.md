# Reading list for the study guide

The papers behind the code in `visual-music-study-guide.md`, grouped by unit. One or two per unit is plenty: read the
paper *after* you have run the code and tried the unit's experiment, so you meet the ideas with questions already in
mind. Links checked November 5, 2026 (DOIs are given as numbers; this research machine could not open doi.org itself,
so each also has a page where the paper or its record was found).

## Background, for all units

- Meinard Müller, *Fundamentals of Music Processing* (Springer, 2nd edition 2021), with the free FMP notebooks from the
  AudioLabs Erlangen ([FMP resources](https://www.audiolabs-erlangen.de/resources/MIR/FMP/)). The best structured course
  in this field; chapters on Fourier analysis, music synchronization (DTW) and onset detection match units 2, 3 and 5.

## Unit 2: pitch

- A. de Cheveigné and H. Kawahara, "YIN, a fundamental frequency estimator for speech and music," *J. Acoust. Soc.
  Am.* 111(4), 1917 to 1930, 2002. DOI 10.1121/1.1458024 ([a copy hosted by a university](https://cagnazzo.wp.imt.fr/files/2013/05/2002_JASA_YIN.pdf)).
  Read sections II and III: the steps the unit 2 script implements, in the authors' words.
- M. Mauch and S. Dixon, "pYIN: A fundamental frequency estimator using probabilistic threshold distributions," ICASSP
  2014, 659 to 663. DOI 10.1109/ICASSP.2014.6853678 ([open copy on CORE](https://core.ac.uk/download/30696897.pdf)).
  Short. Explains why pYIN covered 98% of the breathy demo note with no octave jumps.

## Unit 3: onsets

- J. P. Bello, L. Daudet, S. Abdallah, C. Duxbury, M. Davies and M. Sandler, "A Tutorial on Onset Detection in Music
  Signals," *IEEE Trans. Speech and Audio Processing* 13(5), 1035 to 1047, 2005. DOI 10.1109/TSA.2005.851998
  ([a copy used in a university course](https://www.cs.bu.edu/fac/snyder/cs583/Literature%20and%20Resources/bello_onset_tutorial.pdf)).
  The source of most of aubio's detection functions; the unit 3 script implements four of them.

## Unit 5: alignment and score following

- S. Dixon, "Live Tracking of Musical Performances using On-Line Time Warping," DAFx 2005
  ([DAFx archive record](https://dafx.de/paper-archive/details/o-kAKlRZ1QVrnYxd28nF0g)); the same algorithm as
  "An On-Line Time Warping Algorithm for Tracking Musical Performances," IJCAI 2005
  ([PDF](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2005/ijcai05.pdf)). What matchmaker's `oltw_dixon.py` implements.
- A. Arzt and G. Widmer, "Simple Tempo Models for Real-time Music Tracking," SMC 2010
  ([PDF](https://www.cp.jku.at/research/papers/Arzt_Widmer_SMC_2010.pdf)). The basis of matchmaker's default follower
  and its tempo model.
- C. Cancino-Chacón et al., "The ACCompanion: Combining Reactivity, Robustness, and Musical Expressivity in an Automatic
  Piano Accompanist," IJCAI 2023 ([proceedings page](https://www.ijcai.org/proceedings/2023/641),
  [arXiv](https://arxiv.org/abs/2304.12939v2)). A whole system: following, predicting, and adapting to a soloist.
- The matchmaker paper: "Matchmaker: An Open-source Library for Real-time Piano Score Following and Systematic
  Evaluation" ([arXiv](https://arxiv.org/pdf/2510.10087)). How the methods compare on the same data.

## Unit 6: music theory as numbers

- D. Herremans and E. Chew, "Tension ribbons: Quantifying and visualising tonal tension," TENOR 2016
  ([preprint](https://www.dorienherremans.com/sites/default/files/paper_tenor_dh_preprint_small.pdf)). Three tension
  measures on the spiral array (cloud diameter, cloud momentum, tensile strain), drawn as ribbons over the score. An
  implementation is in partitura, Apache-licensed:
  [`partitura/musicanalysis/tonal_tension.py`](https://github.com/CPJKU/partitura/blob/HEAD/partitura/musicanalysis/tonal_tension.py)
  (see `cloud_diameter`, `center_of_effect`, `CloudDiameter`, `TensileStrain`).
- E. Chew's spiral array, as summarised in [this paper](https://escholarship.org/content/qt1503n3d5/qt1503n3d5.pdf?t=sgisix).
- S. Larson, *Musical Forces: Motion, Metaphor, and Meaning in Music* (Indiana University Press, 2012)
  ([Project MUSE](https://muse.jhu.edu/book/13634)). Chapter 13 describes the "What Next" computer model; no code is
  public.

## Unit 7: mapping and expressive performance

- J. Langner and W. Goebl, "Visualizing Expressive Performance in Tempo-Loudness Space," *Computer Music Journal*, 2003
  ([PDF](https://www.continuum-hypothesis.com/music/Langner-VisualizingExpressivePerformance-2003.pdf)). The "Performance
  Worm": one of the oldest and clearest mappings from playing to a picture.
- O. Lartillot, C. Cancino-Chacón and C. Brazier, "Real-time visualisation of fugue played by a string quartet," SMC
  2020 ([arXiv](https://arxiv.org/abs/2006.10168v1)). Pre-composed, score-followed visuals: the closest precedent to a
  visual score.

## Unit 8: bodies and air

- F. Heller et al., "An Augmented Flute for Beginners," NIME 2017 ([NIME record](https://nime.org/proc/nime2017_fheller/)).
  Sensors for the air jet, shown graphically.

## Unit 9: testing whether visuals mean anything

- M. Erdmann, M. von Berg and J. Steffens, "Development and evaluation of a mixed reality music visualization for a live
  performance based on music information retrieval," *Frontiers in Virtual Reality*, 2025
  ([article](https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full)). The random-baseline method that the
  Raindrops blind test borrows.
