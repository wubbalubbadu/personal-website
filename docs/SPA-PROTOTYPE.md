# Soak, the shared bathhouse (`/lab/spa`)

Open `http://localhost:3000/lab/spa` (linked from `/lab`). Built Nov 12 to 13, 2026 in one unattended stretch. Local only, nothing committed. Type check and lint are clean for `app/lab/spa`.

- How the code fits together: `app/lab/spa/README.md`
- Round by round record of what was built and checked: `docs/spa/BUILD-LOG.md`
- Notes for a real multiplayer server: `docs/spa/SERVER-DRAFT.md`

## What it is

A small bathhouse you wander as a little figurine: a warm floor lounge, a sauna, a hot spring, a cold plunge and a lake. Other people are there too. Nobody can chat; there are a few verbs per room and a wave. The structure is borrowed from sansatemple.com (anonymous people, few verbs, no chat); the look, the place and the people are its own. Free roam, no enforced hot, cold, rest loop.

## Decisions waiting on Haylie

All of these can be tried live in the settings pill (top right).

| Decision | Options | Current default |
|---|---|---|
| Body shape | Gumdrop, Bean, Dumpling | Gumdrop |
| Face style | Dots, Sleepy, Goofy ("Before" is the old literal face, for comparison only) | Dots |
| Name tag over your own head | keep or remove | shown |
| Goodbye card when you stand at the end of the dock for two seconds | keep or remove | on |
| Default time of day | always dusk, or "My clock" (follows the visitor's real time) | dusk |
| The name | "Soak" / 泡一泡 is a placeholder | |
| The lake | added so the cold plunge has a view; keep? | kept |
| Sitting at the tea table | small new feature, not built | |

Once body and face are picked: delete the losing options and fit every pose to the winner.

## Not verified (needs her or a real device)

- **All sound.** Everything is synthesized and nobody has listened to it. Expect some of it to be ugly.
- Pinch zoom, touch drag feel, and the automatic quality drop on a slow phone.
- The "no 3D graphics" message (could not be triggered here).
- Reduced motion behaviour (the preview does not have that setting on).
- Multiplayer beyond two tabs of one browser. There is no server yet.

## Her calls so far

- Nov 12: little people like the temple's, not animals. No laugh verb. 3D with funny characters in a believable space (pixel art belongs to the separate study room idea).
- Nov 13: camera behind your own avatar so you can see yourself (first person kept as "Your eyes" in settings). People were "too exact and realistic" and "ugly" with separate hands and shoulders: now one smooth body with nub arms, squashed heads, simple faces.
- Nov 13: annoyed that work idled between hourly check-ins. Fixed with a 10 minute safety net and long rounds.

## What is in it now

- **Place:** lounge (towel mats, snack counter, milk fridge, tea table, lockers, scroll, real-time clock, working mirror), sauna (two bench tiers, glowing stove, window to the lake, chimney smoke), covered link, porch with a curtain that lifts, hot spring (rocks, spout, yuzu, steam), cold plunge (ice, a duck), garden (raked gravel, stepping stones, lanterns, maples, bamboo, basin), lake with dock and boat, mountains with lit windows at night, clouds, moon, twinkling stars, fireflies, falling leaves. Dusk, night, morning, or "My clock".
- **People:** one seed number makes the whole look and a name in English and Chinese. Uniform on dry land, towel wrap in the sauna and water. Rosy and steaming when hot, blue and shivering when cold. They waddle, stretch, look around, glance at whoever sits down beside them, and leave wet footprints.
- **You:** camera behind you (drag to orbit, scroll or pinch to zoom, it slides in at walls and stays above water). Click or tap the floor to walk; WASD and arrows too. Number keys 1 to 4 press the verb buttons, Escape gets you up. You arrive by boat and walk in.
- **Verbs:** lie down, cucumbers, nap, crack an egg, drink milk, pour water (steam for the whole sauna), fan, sigh, float, dunk, bucket, wave, get up.
- **Crowd:** bots use the same commands as a player, wave back, cool off after the sauna, go home by boat and get replaced. Quiet, Cosy or Busy.
- **Multiplayer:** two tabs of one browser see each other (arrival, walking, verbs, new look, lying down, cucumbers). The oldest tab runs the bots.
- **Shell:** the front door card says how many people are inside; verb buttons show their key; settings stick across reloads; Chinese throughout; phone (375 px) and iPad (768 x 1024) layouts checked; screen reader label on the 3D view.

## Layout (metres, x west to east, z north to south)

- Sauna cabin: x -13..-8.2, z -2.5..2.5. Covered link to the lounge: x -8.2..-6.
- Lounge: x -6..4, z -3.5..3.5. Porch: x -2.5..0.5, z 3.5..6.5. Dock: z 6.4..10.8.
- Cold plunge deck: x -13..-8, z 3.3..4.6, pool south of it.
- Garden: x 4.6..15, z 1.6..6. Hot spring north of it.
- Exact walkable rectangles and sitting spots are in `app/lab/spa/nav.ts`.

## Backlog

Polish only (she asked for no new features on Nov 5), and most of it follows her picks above.

1. After her picks: delete unused body and face options, refit seat heights and props to the winner.
2. Sound pass once she has listened and said what is ugly.
3. Tune by feel once she has played: idle drift speed, settle bounce, how often bots wave, camera distance.
4. Real phone pass: pinch zoom, quality drop, touch targets.
5. The lounge feels empty at Quiet crowd; fewer mats or a second low table.
6. Parked ideas: sitting at the tea table, massage chair, back scrub, ping pong, seasonal sky, real server.

## Testing tip

If she is playing in the Browser pane, do not reload or drive her tab. Open a second tab at `/lab/spa?solo` (solo keeps it out of her room, so no chime and no stranger on her dock). Edits still hot reload her tab.

The Browser pane throttles animation when hidden. In the console, `__spa.run(5)` steps the world 5 seconds by hand and `__spa.tp(x, z, yaw, pitch)` jumps you somewhere. `__spa.gallery(false, "none")` stands one person of every hair shape in the garden. `__spa.front()` swings the camera round to your own face. Screenshots can show a stale frame: step a few single frames with short waits between (`run(0.034)`) before capturing.

## Rules

Local only. No commit, push or deploy. tsc and lint clean after each step. Verify in the browser preview.
