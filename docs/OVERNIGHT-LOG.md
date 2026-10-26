# Where things stand (October 23, 2026)

Everything below is local on localhost:3000. Nothing is committed or deployed.

**In main, built October 19 to 23:** embouchure redesign; Breathing Lab and its home card; fingering and trill charts; endless rhythm drills; score following, playback start, transpose; Köhler page total fix; warmer copy (two rounds, docs/COPY-CHANGES.md); advanced metronome with ghost and random gaps, tool sounds and A calibration; tempo words, tempo history, tempo ladder; Customize scales grouping, new scale patterns, status chips; Library shelf view and composer timeline; mock audition, Today card, starter routine, difficult passages list; offline sheet music, accompaniment files with tap-along sync, clearing practice history by month; theory phone pass, Learning Log phone pass, phone CSS cleanup; saved exercises model and personal settings; technique variants in close-up, compare long-tone attempts, tidier note names; COMPONENTS.md and DESIGN.md updated; /lab landing pages with the PS1 cat (Cat host at /lab/home-1).

**Started but not built (no patch, paused):** sight-reading generator, blind intonation and attack map, warm-up melodies, breath budget, tendency test extras, markup manager, overtone playground, memory mode, interval X-ray, recommend me a piece.

**Needs you:**
- Approve or edit the Cat host copy (/lab/home-1).
- Tempo ladder: keep the last tempo or go back to the start?
- Real-device checks: mic in mock audition, offline sheet music, the new tool sounds, iPad swipes for score following.
- /lab/cat-host (made by Codex): keep or delete.
- answers.ts says "master's in flute performance"; Cat host says "flutist at New England Conservatory". Pick one.

---

# Overnight log (Oct 19 to 20, 2026)

Local only, nothing committed. Every applied patch has a copy saved, so any one can be reversed.

- 23:50 Applied the copy rewrite (warmer voice, EN and ZH). Review every change in docs/COPY-CHANGES.md.
- 23:50 Already in main: embouchure, Breathing Lab, home breathing card, fingering and trill charts, rhythm drills v1, score following v2, studio home layout fix.
- 23:50 Still working: rhythm drills endless mode, advanced metronome, tempo words, scales panel and status chips, mock audition, PS1 mascot, landing variants (now phone first, informative first).
- 23:50 Hourly check-in scheduled (:47). It resumes stalled sessions, applies finished patches and starts backlog items.
- 04:05 Applied: mock audition, Customize scales panel + status chips, tempo words (rule in .claude/worktrees/friendly-raman-e1f3bd/TEMPO-RULE.md). Updated rhythm drills to the endless mode with real bars from the Library.
- 04:05 Rhythm drills: its Learn card description clashed with the copy rewrite, so I wrote it by hand in the new voice (learn-pages.ts). If that patch is ever reversed, exclude learn-pages.ts.
- 04:05 tsc and lint clean after all four. Main's dev server had stopped; restarted on localhost:3000.
- 04:05 Usage limit reset at 4am: resumed advanced metronome, PS1 mascot, landing variants.
- 04:05 The app does not allow starting new sessions from an automated check-in, so backlog items went to idle sessions instead: theory lessons phone pass (rhythm drills session), phone CSS cleanup (charts session), clear history by month (mock audition session).
- To decide: mock audition recording was not tested (the preview pane blocks the mic); try it on a real device.
- 04:56 Applied: advanced metronome, clear history by month, theory lessons phone pass, phone CSS cleanup (118 lines removed), PS1 mascot (/lab/mascot), landing variants (/lab, /lab/home-1 to 3). tsc and lint clean; all touched pages return 200.
- 04:56 Metronome clashed in studio-shared.css only; I added `.tools-panel` to the text-action and view-switch selectors by hand instead.
- 04:56 Assigned: landing session puts the real mascot and Animalese voice into its directions; tempo-words session moves excerpt tempo and tally beside the printed tempo mark; scales session writes a Personal settings proposal (doc only); copy session builds the composer timeline.
- 04:56 Could not assign the shared stepper (Breathing Lab session) or the embouchure Chinese and phone pass: the app pauses session-to-session messages after 10 in a row until you type something. Send any message in the main session to unpause.
- To review in the morning: /lab (landing directions, LANDING-AUDIT.md in .claude/worktrees/upbeat-hypatia-fde397), /lab/mascot, Tools panel metronome "More", /flute-studio/transfer month deletion.
- 09:56 No new patches since 04:56. The four sessions assigned at 04:56 (landing mascot, excerpt tempo, settings proposal, composer timeline) ended in an error after a few turns, most likely the usage limit again. I can't resend until you type in the main session (message cap). Say "keep going" there and I will restart them.
- 10:15 Restarted after the 9am reset: landing mascot, excerpt tempo, settings proposal, composer timeline. Assigned embouchure Chinese and phone pass. The shared stepper task could not be sent (the safety check timed out twice); it goes out at the next check-in.
- 10:56 Applied: Personal settings proposal (docs/PERSONAL-SETTINGS-PROPOSAL.md, seven decisions for you at the top), landing pages with the real mascot and Animalese voice (/lab), excerpt tempo and tally beside the printed tempo mark, composer timeline (Library, List / Timeline switch), embouchure Chinese and phone pass. tsc and lint clean.
- 10:56 Assigned the shared stepper to the Breathing Lab session. That empties the backlog; new work needs your direction.
- 11:03 Applied the shared Stepper (10 steppers in 4 places). tsc and lint clean. Backlog is empty.
- 11:56 Every backlog item is done and applied. I stopped the hourly check-in so it doesn't wake up with nothing to do; it starts again when there's new work.
- 15:21 New batch handed out: transpose, Today card on Home, tempo history, offline sheet music, accompaniment files, theory housekeeping + reader Chinese. Hourly check-in restarted with a next backlog (technique transformations, difficult passages list, starter routine, compare attempts).
- 20:22 Applied tempo history (saves your top tempo per day; small chart in the tempo pill, reader tempo menu and a "Getting faster" card in My Studio). tsc clean, no lint errors.
- 20:22 Resumed after the 8:20pm reset: transpose, Today card, offline music, accompaniment, theory housekeeping. Assigned: technique variants in close-up (scales session), starter routine (Breathing Lab session). Still queued: difficult passages list, compare long-tone attempts.
- 20:33 Applied: theory housekeeping + reader Chinese, offline sheet music (check on a real iPad after deploy; private pieces untested), transpose (View > Key), Today card on Home, technique variants (groups of 3 and 4) in close-up.
- 20:33 Accompaniment files and Cookie's starter routine clashed with newer work, so I merged them by hand: ScoreViewer.tsx (accompaniment beside the new transpose key control) and HomeStudioCards.tsx (only the starter card kept, because the Today card now covers Today and Working on). Those two can't be reversed with git apply -R; their patches are saved as *.handmerged.
- 20:33 tsc and lint clean; studio pages return 200.
- 20:33 Assigned: difficult passages list (copy session), compare long-tone attempts (embouchure session). Backlog empty after these; the hourly check-in will apply them.
- 23:41 Fixed: the left rail folded then opened when entering the studio. Its saved state is now set before the first paint (root layout script + html[data-rail]); verified open and folded both draw correctly from the first frame. Sessions are paused until the 1:20am reset; the hourly check-in resumes them and has a new backlog (n to t).
- 23:44 You said the limit reset: started a new session for the Library header + Shelf view (List / Shelf / Timeline beside a shorter search). Resumed difficult passages and compare attempts. Assigned now: play start and position, tempo ladder loop, saved exercises model, accompaniment sync, Learning Log phone pass, COMPONENTS/DESIGN update. Still queued: Köhler page total bug.
- 04:33 Applied the COMPONENTS.md and DESIGN.md update (this week's components). Resumed 8 sessions after the 4:30am reset.
- 04:33 From your notes: copy revision 2 (copy session), settings built with your 7 answers (scales session), Cat host as the lead landing candidate with table and room scenes (landing session), fancier tuner/metronome/drone sounds and A=442 calibration (mascot session; also added to docs/TODO.md). Köhler page bug still queued.
- 09:32 Applied playback start (selection, else last tap or stop, else the top) with a now-playing marker. Resumed 9 sessions after the 9:30am reset; Köhler page bug assigned to the score-following session. Library shelf, passages list and saved exercises have patches from 04:35 that I'll apply only once their sessions say they're final.
- 21:13 Applied Library header + Shelf view (COMPONENTS.md hand-merged). /lab/cat-host (window version) is Codex's, not ours; landing session told to continue from /lab/home-1 with the cat free on the page. Resumed 8 sessions after the 2:30pm reset.
- 21:15 Applied the tempo ladder (select bars, stairs icon on the selection pill; COMPONENTS.md merged). Decision for you: after the ladder, should the tempo go back to where you started (now it stays at the last pass)? 8 sessions still working.
- 01:43 Applied: compare long-tone attempts, difficult passages list, copy revision 2 (see docs/COPY-CHANGES.md), tool sounds + tuner A=438 to 446 (merged; nobody has listened to the sounds yet). tsc and lint clean. Resumed Cat host, saved exercises/settings, Köhler, accompaniment sync, Learning Log after the 1:40am reset.
- 02:06 Applied: Köhler page total fix (pages cut for a fixed height), Cat host polish on /lab/home-1 (cat free on a fading desk), saved exercises model, settings with your 7 answers + registry, accompaniment tap-along sync. tsc and lint clean, pages 200. Waiting on you: Cat host copy lines, tempo ladder end tempo. Learning Log phone pass still auditing.
- 02:07 Backlog n to t is done except the Learning Log phone pass (nudged to finish). No new work without your direction.
- 02:20 Applied the Learning Log phone pass (no sideways scroll at 375 and 390 in Read and Slides). All queued work is now in main.
- 03:07 Nothing left to apply or assign, so I stopped the hourly check-in. It will start again with the next batch you approve.
- 16:52 New batch of 13 experiments from the idea bank (scale patterns, tidier note names, ghost metronome, sight-reading generator, blind intonation + attack map, warm-up melodies, breath budget, tendency test variants + history, markup manager, overtone playground, memory mode, interval X-ray, recommend me a piece). All hit the 4:50pm limit; 10 resumed, the last 3 resume at the next check-in.
- 21:52 The scratchpad folder holding applied-patch copies was cleared by the system. Rebuilt the record in docs/.applied-patches (git-ignored). Main is unaffected. None of the 13 new experiments had finished before the 4:50pm and 9:50pm limits; resuming them now.
- 08:47 No patches from the last batch: every session errored within seconds of the 9:52pm resume (most likely the usage limit again) and nothing has run since. I can't message them until you type, so I stopped the hourly check-in. Say "keep going" to restart the 13 experiments.
- 13:21 You said keep going and wrap up at a comfortable place (new week). Resumed 10 of the 13 experiments; the hourly check-in resumes the other 3, applies results, then stops and writes a final summary here and in docs/TODO.md.
- 13:42 Wrapping up: 13 sessions at once kept burning each 5-hour window within minutes with little progress. Only the three with patches nearly done (ghost metronome, note names, scale patterns) are finishing; the other ten experiments are paused with no patch and will be listed as unfinished.
- 16:25 Review step 1: moved Codex's /lab/cat-host (and its test) to the Trash and removed its links; Cat host intro now says master's in flute performance at NEC.
- 14:42 Review fixes: reader toolbar Record label no longer Georgia; metronome icon same size as others (removed its 1.12 scale); chevron matches the − and +; − + and chevron get the same round hover; TempoPill keeps its own look inside the ladder popover. Tempo ladder rework sent to its session (timeline with cookie marker, manual step up, no notes, minimal text).
- 14:45 Record's serif came from a legacy global rule in app/globals.css (.tool span Georgia); deleted it at the source instead of overriding. Cat host direction changed: cat inside a retro handheld with the /lab/mascot art and scenes, two device takes; sent to the landing session.
- 14:52 Applied: tempo ladder rework (timeline with cookie marker, loop and tally, manual step up or back, cut-off loop end fixed) and the handheld Cat host (PSP style /lab/home-1, Game Boy style /lab/home-1b).
- 17:11 Reader toolbar tempo is now the shared TempoPill (large; its metronome button replaces the separate Metronome tool), with the chevron restyled in its own rule; removed my override block. Phone toolbar kept at two rows. COMPONENTS.md updated. Cat host v2 (everything inside the console, cat speaks as Haylie, menu on the screen, sound on) sent to the landing session.
- 17:13 Toolbar tempo: tried the blue TempoPill, Haylie preferred the grey box, so it's restored. Fixes kept at their source: Record font (globals.css), metronome icon size (scale removed), chevron weight (its own rule). COMPONENTS.md notes the decision.
