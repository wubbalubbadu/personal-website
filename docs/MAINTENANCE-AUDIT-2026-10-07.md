# Translation and personal data maintenance

Updated October 7, 2026. Local implementation and verification only.

## Completed

- Chinese roadmap now translates all six regions, all 36 skills and their teaching descriptions, counts, and controls.
- Home headings, loading message, navigation/preview accessibility labels, close-up technique controls, pitch-practice controls, and body/breathing model instructions and controls now support Chinese.
- Current `:annotations:v2` markup follows Include pencil drawings, contributes to its size, and appears in the correct export category.
- Tricky bits with the same ID merge tempo lists. Incoming goal and step settings remain authoritative. Different saved bits are retained.
- Repetition tallies keep the higher count. Reimporting the same code does not inflate counts or reduce a higher local tally.
- Music-status removal stores a timestamped null status. Older codes cannot resurrect a later removal; removed statuses stay hidden from lists.
- Current markup saves per-mark revision and deletion timestamps. Transfer keeps distinct marks and respects newer edits and erasures. Undo restoration receives a new revision on save.
- Transfer confirmation explains the Tricky-bit merge rules in both languages.

## What export includes

Want to learn / Working on / Learned statuses, Tricky bits and tallies, saved sets, practice history, progress, tempos, exercise setups, recent items, language and other cookie-prefixed settings. Markup is optional. Private-music access code remains included by the existing broad collection rule. Audio recording files are excluded.

Device-specific reader-view preferences, rail state, and pet position are excluded. Sync devices remains a manual code/file export and import, followed by reload. There is no background synchronization. Each browser and origin has its own storage.

## Verification

22 focused tests passed for translations, transfer, Tricky bits, and annotations. Production build passed. Typecheck reports only the three pre-existing errors in vite.config.ts and worker/index.ts.

Local browser verified Chinese roadmap and body/breathing UI, including accessible labels; original English preference restored afterward. Close-up translations were checked in source and compilation. Physical iPhone/iPad transfer and visual checks remain pending.

## Limits of older data

Historical tallies are totals without per-device events, so an exact combined total cannot be reconstructed safely. The higher-count rule is conservative and repeat-import safe.

Old markup exports lack revision/deletion timestamps. Same-ID legacy conflicts favor the incoming mark unless a newer timestamp exists. Historical erasures and legacy bitmap removal cannot be reconstructed. New mark edits and erasures use timestamps.

Older favorites lists and saved-bit deletion do not have deletion records, so importing a historical copy can restore those entries. Music-status removals made after this fix carry deletion timestamps.

This closes the gaps identified by the maintenance audit; it does not establish that every screen, generated score label, native browser control, and error state throughout the app has been visually checked in Chinese.
