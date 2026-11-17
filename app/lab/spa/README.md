# Soak (`/lab/spa`)

A shared bathhouse you walk around in. Everything is built from shapes in code (no model files) and every sound is synthesized (no audio files). Status, decisions and the backlog live in `docs/SPA-PROTOTYPE.md`; notes for a real server are in `docs/spa/SERVER-DRAFT.md`.

## How the files fit together

| File | What it owns |
|---|---|
| `page.tsx` | The route. Just renders `Spa`. |
| `Spa.tsx` | The React shell: front door card, pills, verb buttons, settings panel, and the screen overlays. It lazy loads `game.ts` because three.js is big. |
| `copy.ts` | Every word on screen, English and Chinese. Edit copy here. |
| `spa.css` | Styling for the shell only. Nothing 3D. |
| `game.ts` | The running world: the frame loop, input, the camera, the four commands everyone uses (`go`, `spot`, `verb`, `flag`), what each verb does, bots, and messages to other tabs. |
| `nav.ts` | The floor plan as plain data: rectangles you can walk on, the pools, the places to sit or lie (`SPOTS`), and path finding. No three.js, so it is easy to reason about. |
| `world.ts` | The scenery: buildings, pools, garden, lake, lights, and the three times of day. |
| `avatar.ts` | One person: body, face styles, hair, poses, and the arm and head motion for each verb. One seed number decides the whole look. |
| `brain.ts` | What a bot decides to do next. It only calls the same commands a player would. |
| `fx.ts` | Water, steam, droplets, floating words, sky, stars, fireflies, wet footprints. |
| `sound.ts` | Ambience per room and one-shot sounds, all from oscillators and noise. |
| `net.ts` | The message types and the "transport". Today that is other tabs of the same browser. |

## Three ideas worth knowing

1. **One seed, one person.** `lookFromSeed(seed)` returns skin, hair, outfit, hat and name. Other browsers only need the seed to draw the same person.
2. **Events, not positions.** Nobody streams where they are. A click sends "going to (x, z)" once and every browser animates the walk itself. A sitting person costs one heartbeat every two seconds.
3. **One path for everyone.** A click, a bot's decision and a message from another tab all end up in the same four commands in `game.ts`. That is why bots and multiplayer needed almost no code of their own.

## Changing things

- A new place to sit: add it to `makeSpots()` in `nav.ts`, then give it a mesh and a hit pad in `world.ts`.
- A new verb: add it to `VerbId`, `VERB_SECONDS` and `BEATS` in `avatar.ts`, animate it in the big `switch` there, answer its beats in `onBeat` in `game.ts`, and list it in `actionsNow()`, `copy.ts` and the `ICONS` in `Spa.tsx`.
- Walkable floor: the rectangles in `nav.ts`. Rectangles that touch are joined automatically.

## Testing without waiting

In the browser console: `__spa.run(5)` steps the world five seconds, `__spa.tp(x, z, yaw, pitch)` jumps you somewhere, `__spa.front()` turns the camera to your face, `__spa.gallery(false, "none")` lines up every hair shape. Add `?solo` to the address to stay out of the shared room, and `?lang=zh` for Chinese.
