# Rhythm lesson: note lengths

The lesson focuses on reading duration symbols. The staff-and-notes lesson supplies pitch context. Measures, time signatures, rests, dots, and ties follow separately. Each click is explicitly defined as a quarter-note pulse for these examples, not as a universal rule about beats.

| Screen | Explanation | Interaction |
| --- | --- | --- |
| Rhythm | Rhythm is the pattern of long and short sounds. | Compare five patterns using the same pitches. Duration bars show length; this introductory playback has no metronome. |
| Note shapes | Show whole, half, quarter, eighth, sixteenth from left to right. | Tap a symbol. Highlight and explain its open/filled head, stem, or flag. All five remain visible. |
| Note values | Each row divides the same total duration. | Reveal a branching tree one row at a time through sixteenths. Parents stay in place, branches draw downward, and children fade in below. Tap any row to hear it over four quarter-note clicks. |
| Flags | One flag halves a quarter note; two halve it again. | Compare two eighths and four sixteenths in the same pulse. |
| Beams | Beams replace flags without changing duration. | Draw one beam for eighths, then two for sixteenths. Keep a keyboard-accessible join control. |
| Hold the note | A longer note sustains continuously across clicks. | Press and hold the cat for quarter, half, and whole notes. Release after the full duration. Show the count above the cat. Grade elapsed hold duration, not note-onset gaps. Give early/late feedback. Pointer cancellation does not count as an answer. |
| Your melody | Combine pitches and lengths in a phrase. | Drag notes vertically or use arrow keys; select note lengths from engraved symbols. Reuse a complete saved lesson-one phrase when available. |

## Interface requirements

- Genuine VexFlow/Gonville engraved outlines for all rhythm glyphs. Open heads remain transparent so staff lines pass through them.
- No decorative line beneath selected noteheads. Use a subtle selection halo, distinct from ledger lines.
- Stable stage, action slots, cat, Listen button, next-exercise slot, footer, and transcript boundary.
- Shared layout, previous links, and named next-topic links across both lessons.
- Equal course cards use Open lesson consistently. Finishing saves completion and adds a green border/check to the card.
- Unpitched, softly enveloped hi-hat pulses replace the pitched metronome click.
- Course index fits the screen. Rhythm lesson has a fixed outer viewport; only its compact review transcript scrolls.
- One teaching sentence and one Cookie invitation/feedback surface. Prompts reflect the current state and never suggest a disabled action.
- Global English/Chinese setting. Pointer, touch, and keyboard controls; reduced-motion support.
- Tone and metronome events share an audio clock. Smooth release on interruption, cleanup on unmount, and recovery after a closed audio context.

The hold exercise is a duration exercise, not a full rhythmic-performance assessment. The first metronome click starts the first pulse; releasing on the fourth click is early for a whole note because its fourth pulse must finish.
