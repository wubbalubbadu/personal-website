# Slur clearance: one attempt, reverted

Local review on October 30, 2026. The existing `liftCollidingSlurs` pass remains unchanged.

- Saved the original source before editing (`slurClearance.before.ts.txt`).
- Recorded the current Arnold rendering at 820px, including every rendered slur path and normalized notehead/stem bounds (`arnold-before-820.json`, 103 paths).
- The five named measure groups had no sampled interior band/bounding-box intersections. This excludes attachment areas within 14 SVG units of the ends and does not establish one staff-space clearance.
- Found a remaining intersection in the system containing measures 124 through 129, on a slur already at the four-space correction cap.
- Made one local attempt (`attempt.patch`): only extend capped slurs when the corrected band still intersects a note/stem, checking the note's left edge, center and right edge. Endpoints stay fixed unless already classified as free system-break endpoints by the existing implementation.
- The attempted render still contained an intersection in that system even at the extended cap. The snapshot contains 100 rendered paths; the unequal path count also prevents a valid all-path equivalence claim.
- Reverted the attempt to the saved source. No OSMD engraving settings changed. Do not make another attempt under this ticket.

Acceptance remains open. No claim of an all-piece comparison, physical iPad verification, close-up verification or PDF-export verification is made. The numeric bounds are a conservative screen-geometry check, not a visual engraving approval.
