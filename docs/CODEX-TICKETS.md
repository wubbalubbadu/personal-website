# Codex tickets (October 26, 2026)

Rules for every ticket: read AGENTS.md, app/flute-studio/COMPONENTS.md and DESIGN.md first. Local edits only; do not commit,
push or deploy. No em or en dashes in UI copy. Fix things at the component or rule that owns them, never with a new
!important override block. Verify at 375px, 820px and desktop; run `npx tsc --noEmit` and eslint on touched files.

## 1. Popover button style paints TempoPill white
- **Where:** the tempo ladder setup and any TempoPill inside a `.reader-settings-panel` popover.
- **Problem:** a generic popover button rule gives TempoPill's − / + a white circle at rest. There is a temporary
  override at the end of `reader-workspace.css` ("Inside a reader popover (the tempo ladder)").
- **Done when:** the rule that causes it is found (check computed styles in the browser) and scoped so it skips
  `.tempo-pill`; the override block is deleted; TempoPill looks the same in a popover as on Scale Studio.

## 2. Remaining one-off tempo controls onto shared components
- **Where:** `.tempo-step` / `.tempo-field` in `components/FixedScoreViewer.tsx`, `ScaleTemposPanel.tsx`,
  `KeyExerciseViewer.tsx`; the tools panel metronome in `PracticeToolDock.tsx`.
- **Decided:** the reader toolbar keeps its grey tempo box (Haylie chose it over the blue TempoPill on Oct 25).
- **Done when:** these use the same grey toolbar tempo box (or the shared Stepper where it is not a toolbar), with one
  hover behaviour (darken only); COMPONENTS.md "Not reused yet" item 1 updated.

## 3. Dead reader toolbar CSS
- **Where:** `studio-shell.css` and `reader-workspace.css`, rules for `.tempo-group>.tool` (the separate Metronome
  tool was inside the tempo group; check whether it still exists) and other superseded toolbar rules.
- **Method:** record computed styles of the reader toolbar at 375, 820 and 1280 before deleting; diff after each
  batch; restore any batch that changes anything.
- **Done when:** dead rules removed with zero visual change, before/after numbers in the report.

## 4. Plain grey action button: one component
- **Where:** COMPONENTS.md "Not reused yet" item 5 lists six copies (`.emb-action`, `.bl-start`, `.rd-button`, ...).
- **Done when:** one shared button (component or class in studio-shared.css) used by all of them, no visual change.

## 5. ItemCard component
- **Where:** `.working-card` in `practice/practice-page.css`; candidates `.tricky-card`, `.tricky-preview-card`.
- **Done when:** a `components/ItemCard` used by My Studio and tricky bits; COMPONENTS.md updated.

## 6. Breathing model in the sketch style
- **Where:** `app/flute-studio/embouchure/Breathing.tsx` (the 3D torso on the Breathing tab).
- **Goal:** match the new toon/sketch look of the embouchure model without thick black outlines on the bones; keep
  the mirrored inhale/exhale arrows and colours.
- **Done when:** both tabs look like one family; screenshots of inhale and exhale at desktop and phone.

## 7. Slur clearance (existing ticket)
- See docs/TODO.md "Ticket: slurs cut through high notes (Arnold, Fantasy for Flute Solo)". Follow its rules: one
  attempt, revert point first, only colliding slurs change.

## Not for Codex yet (need Haylie)
- Studio home and overall UI rework (needs a planning session).
- Keep or remove: Offline music (Sync devices) and Compare long-tone attempts.
- Mock audition issues (she will describe them).
- Cat landing (/lab, its own session).
