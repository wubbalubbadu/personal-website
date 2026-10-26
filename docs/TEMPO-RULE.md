# Tempo words without a metronome mark

The rule the reader follows when a score names its speed with a word ("Allegro.", "Très modéré") and prints no number.
Code: `app/flute-studio/lib/scoreTempo.ts` (`wordTempo`, `wordSections`), called from `readScoreFacts` in
`components/scoreTheory.ts`. Check: `tools/tempo-sections-check.ts`.

## 1. Which number wins

1. **A number in the bar wins.** A `<metronome>` mark or a `<sound tempo>` (printed or hidden) in a bar sets that bar's
   speed; any word in the same bar is ignored for speed. So every piece with a metronome mark plays as before.
2. **The catalog wins at the opening.** If the piece opens with a word only and the catalog has a `defaultTempo` (the
   uploader's suggestion, or a number set by hand: Syrinx 50, Daphnis 33), that is the opening speed. The word is only
   the label. Later relative words ("Più mosso", "Tempo I") follow from that number.
3. **Otherwise the table below.**
4. **rit., rall., accel., allargando, stringendo** stay as they are (gradual ramps, `readRamps`). The only side effect:
   a word section now counts as a "tempo mark" for a ramp, so a rit. that leads within 4 bars into "Meno mosso" ends
   there, aimed at its speed, as it already does before a printed ♩ = n.

## 2. Which beat the number counts

The printed beat, the same one the reader's metronome clicks for that meter (and the "bpm counts the printed beat"
rule): the beat-type note in simple meters (♩ in 3/4, 𝅗𝅥 in 2/2 and ¢, ♪ in 3/8), three of them in compound meters
(♩. in 6/8, 9/8, 12/8).

The table is in quarter notes for x/4. Converting to the beat:

| Beat | Factor | Allegro (138) becomes |
|---|---|---|
| ♩ (x/4) | × 1 | 138 |
| 𝅗𝅥 (2/2, ¢, 3/2) | ÷ 2 (same quarter speed) | 69 |
| ♩. (6/8, 9/8, 12/8) | × 2/3 (same quarter speed) | 92 |
| ♪ (3/8, 2/8, 5/8, 7/8) | × 1.5 (a short beat is felt quicker, but not twice as quick) | 207 |

These are the factors the uploader (`tools/tempo.mjs`) already uses, so the two agree.

## 3. Words that name a speed

Range in quarter notes per minute, default = middle of the range. Italian ranges are the reader's glossary
(`content/music-terms.json`, the numbers its tooltips already show, including the French and German basics and
très modéré), so only larghissimo, adagietto, molto moderato, mäßig, vite and lebhaft live in `scoreTempo.ts`.

| Word | Range | Default | Side |
|---|---|---|---|
| larghissimo | 20 to 24 | 22 | slow |
| grave | 25 to 45 | 35 | slow |
| largo | 40 to 60 | 50 | slow |
| lento, lent, lentement, langsam | 45 to 60 | 52 | slow |
| larghetto | 60 to 66 | 63 | slow |
| adagio | 66 to 76 | 71 | slow |
| adagietto | 70 to 80 | 75 | slow |
| andante | 76 to 108 | 92 | slow |
| andantino | 80 to 108 | 94 | slow |
| moderato, modéré, modérément, mässig, mäßig | 108 to 120 | 114 | held |
| très modéré, molto moderato | 46 to 66 | 56 | held (glossary: "well below a plain moderato") |
| allegretto | 100 to 128 | 114 | fast |
| allegro, vite | 120 to 156 | 138 | fast |
| vivace, vivo, vif, schnell, lebhaft | 156 to 176 | 166 | fast |
| presto | 168 to 200 | 184 | fast |
| prestissimo | 200 to 240 | 220 | fast |

**Where sources disagree, and what I picked**

- *Allegretto.* The glossary has 100 to 128; the widely copied Wikipedia list has 112 to 120 (older editions 98 to 109);
  old Maelzel metronome faces skip it. Kept the glossary so the tooltip and the playback say the same thing.
- *Andantino.* In the 18th century it meant a little slower than andante; modern usage (and the glossary) means a
  little quicker. Kept "quicker", 80 to 108.
- *Allegro.* Metronome faces print 120 to 168, Wikipedia 120 to 156. Kept 120 to 156 (glossary).
- *Assai vs assez.* Italian "assai" means "very" (Allegro assai = very fast); French "assez" means "rather" (Assez vif =
  fairly lively). They are treated oppositely.
- *Très modéré.* No standard reference gives a number. "Moderato" means held back, so "very" holds it back further.
  The glossary already says 46 to 66 ("well below a plain moderato"), which fits how Syrinx is usually played (about 50
  to 60; its catalog has 50, which wins). Kept it, and gave "molto moderato" the same range. Fauré's "Andante molto
  moderato" (printed ♩ = 84, so the number wins) would come out at 76 by this rule.

## 4. Words that change a speed word

Applied inside the head word's range (the first speed word in the marking):

| Modifier | Effect | Example |
|---|---|---|
| a second speed word | the head's end nearer the second word | Allegro moderato 120, Allegretto vivo 128, Andante moderato 108 |
| con moto, mosso, bewegt | three quarters of the way up | Andante con moto 100 |
| molto, assai, di molto, très, sehr | fast word: top of range; slow word: bottom | Allegro assai 156, Très lent 45, Molto adagio 66 |
| ma non troppo, non troppo, non tanto, mais pas trop, assez, poco / un poco (before the word), etwas | toward moderato: fast word bottom, slow word top | Allegro ma non troppo 120, Adagio non troppo 76 |
| -etto, -ino | already their own words (allegretto, andantino, larghetto, adagietto) | |

Molto or très with a "held" word (moderato) uses the très modéré entry instead.

## 5. Words that change speed relative to the current one

No reference gives a number; teaching usage is "a notch or two on the metronome", about 10 to 20 percent. Picked:

| Words | Factor |
|---|---|
| più mosso, più vivo, più allegro, più animato, plus animé, plus vite, mouvementé, schneller, bewegter | × 1.15 |
| poco più mosso, un poco più…, un peu animé, un peu mouvementé, un peu plus vite, etwas schneller | × 1.08 |
| … with "mais très peu", "pochissimo" | × 1.05 |
| molto più mosso, beaucoup plus | × 1.25 |
| meno mosso, più lento, più moderato, più tranquillo, plus lent, moins vite, moins animé, langsamer, ruhiger | ÷ 1.15 (and ÷ 1.08, ÷ 1.05, ÷ 1.25 with the same qualifiers) |

The factor scales the current section's number, in its own beat.

## 6. Words that return

| Words | Goes back to |
|---|---|
| Tempo I, Tempo primo, Tempo 1, 1° tempo, 1er mouvement | the opening section's speed |
| a tempo, au mouvement (au mouvᵗ, au mouv), im Tempo | the speed before the last relative change (Più mosso … a tempo). With no relative change before it, nothing changes: it only ends a rit., which the ramp already does |
| l'istesso tempo | no change |
| the same speed word again (Syrinx: "au Mouvᵗ (très modéré)") | the speed that word had earlier in the piece: one word, one speed per piece |

Within one bar the strongest kind wins: a number, then a speed word, then a relative word, then a return word (Köhler 4,
bar 46 "Più moderato." with "a tempo.": più moderato).

## 7. On screen

The number in the reader's tempo box is the suggestion; the word is its label (the tooltip on the tempo box, and the
field's accessible name): "Allegro. No number is printed, so this is a suggested speed. Change it any time." Changing the
number keeps the proportions between sections, as with printed marks.

## 8. Library check (`tools/tempo-sections-check.ts`, before and after)

Unchanged: every piece with a metronome mark or a `<sound tempo>` (Ode to Joy, Le Cygne, Gluck, Pavane, Bumble Bee,
Köhler 15 with its hidden 100, the pop and folk songs), plus the Reichert scale books and Mendelssohn (no tempo words).

Changed (none of these had any tempo section before):

| Piece | Sections after |
|---|---|
| Leonore 3, opening | 1: ♩ = 71 Adagio (no catalog number, so the table) |
| Syrinx | 1: ♩ = 50 Très modéré (catalog); 9: 53 Un peu mouvementé (mais très peu); 26: 50 au Mouvᵗ (très modéré) |
| Daphnis 176 | 1: ♩ = 33 Très lent (catalog); "au Mouv!" after rit. only ends the rit. |
| Köhler 1, 2, 5, 7 to 12, 14 | the opening word only, at the catalog number (Tempo I and a tempo come back to it, so no new section) |
| Köhler 3 | 1: ♩ = 138 Allegro; 52: 159 Più vivo |
| Köhler 4 | 1: ♩. = 94 Allegretto vivo; 46: 82 Più moderato |
| Köhler 6 | 1: ♩ = 138 Allegro; 52: 159 Più mosso |
| Köhler 13 | 1: ♩. = 62 Andantino; 25: ♩ = 107 Più mosso (bar 32 "un poco rit. a tempo." only ends its rit.) |

Ramps are the same as before in every piece.
