# Score reader redesign

## Sessions 1 and 2: implemented, device acceptance pending

- [x] Compact practice header with score playback, shared metronome, numeric BPM, page navigation, fullscreen, conditional reset zoom.
- [x] Left panel: markup, metronome settings, tuner, drone, divider, expanded reading aids.
- [x] Consistent icons with labels for unfamiliar actions; remove inert share/more controls; retain working saved music/PDF actions.
- [x] Flat scale settings panel aligned with the tool panel; touch-friendly close and markup controls.
- [x] One shared metronome and drone engine for reader and toolbox; starting metronome does not open toolbox.
- [x] Musical term explanations independently toggleable; touch interaction supported.
- [x] Responsive notation sizing using available reading dimensions; manual override.
- [x] Pinch zoom without zoom buttons, preserving the gesture anchor.
- [x] Remove automatic manual-scroll snap-back; retain initial title and last-system access.
- [x] Preserve reading position through layout changes.
- [x] Build and targeted regression checks.

## Session 3: deferred, untouched

- [ ] Follow the active measure during score playback in page and scroll modes.
- [ ] Suspend following on manual browsing and offer Resume following.
- [ ] Metronome-only playback never moves the score.

## Validation and touched files

Implemented in ScoreViewer.tsx, readerLayout.ts, reader-workspace.css, PracticeAudio.tsx, PracticeIcon.tsx, PracticeToolDock.tsx, practice-tool-dock.css, layout.tsx, ScaleStudio.tsx, and scale-book.css. Regression coverage added in tests/reader-layout.test.mjs.

- Production build: passed (final rerun after small control-state changes).
- Reader layout tests: 4 passed, covering first-page title offset, system-bottom packing, reachable final offsets, manual page indicators, and responsive notation sizing.
- Browser checks: desktop, 820 x 1180 tablet, and 414 x 896 phone viewport. Phone document width matches viewport; fresh opening scrollTop is zero and title appears inside the reading area. Tablet score width fits the reading area and final system is visible at the bottom.
- Header metronome starts with aria-pressed=true and zero open practice-console elements. Stopped after the check.
- Scale settings opens adjacent to left panel with visible Done button.
- Gesture code implemented for trackpad wheel pinch, Safari gestures, and two-touch pinch. Physical trackpad/iPad gesture acceptance is still needed.
- Full-project type checking remains blocked by existing Cloudflare type declarations, translation keys, and vite config errors outside this scope. No errors reported in changed reader/audio files.
- Existing scale-book test runner fails before tests execute because its data-URL loader cannot resolve the pre-existing relative notePatterns import. Scale generation source was not changed.
- Existing ScoreViewer hook/a11y lint debt remains; new shared audio, icon, and layout helper files pass targeted lint.

## Remaining acceptance and limitations

- [ ] Physically test pinch/pan and pen-versus-two-finger interaction on tablet.
- [ ] Review automatic notation density with the user on their own devices; Smaller/Larger/Largest remain available.
- [ ] Existing bitmap ink and pixel-position text annotations are not measure-anchored across reflow. This change retains their storage format; robust annotation anchoring needs separate work.
- [ ] Broader app-wide icon audit is deferred to stay within the usage window.
- [ ] Publish only after approval for the existing public site. Local preview is ready.


## September 13 correction: markup-only checkpoint

- Restored original PracticeToolDock JSX and CSS from the pre-redesign version, retaining shared audio state.
- Matched annotation toolbar reference: white rounded capsule, blue selected tool, icon-only controls, circular ink colors, gray SVG history/delete controls, Close button. Existing pencil/eraser/text/sticky functionality retained; reference-only shape tools were not added.
- Fixed metronome icon/arrow vertical misalignment.
- Browser-verified markup appearance and original metronome panel. Production build checked.
- Broader style restoration and reorganization are paused for the next user-reviewed step. Earlier draft changes to note popup/playback selection/view settings remain in the working tree and are not being presented as fully validated.

## View controls revision

- Compact borderless markup row, with existing blue selected-tool appearance retained.
- View settings is an anchored top-right popup with a dismiss backdrop, close control, exclusive Pages/Scroll radio selection, notation-size slider, and system-spacing slider.
- Reading aids restored to vertically stacked icon-and-label rounded buttons. Chevron collapses the rail and releases its width.
- Customize scales moved below reading aids and renamed to describe its purpose.
- Previous/next page buttons adjacent, followed by the page counter.
- Header metronome only starts/stops; removed its popup arrow. Original Practice Tools design remains untouched.
- Browser verified popup, mode selection, and rail collapse/expand. Production build passed.
- Next proposed step: validate combined note popup, beat guides, and click-to-select playback before taking on automatic playback following.
