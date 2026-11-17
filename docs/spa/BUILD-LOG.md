# Soak build log

What was built and checked in each round, Nov 12 to 13, 2026. Newest last. The short summary is in `docs/SPA-PROTOTYPE.md`.

- Done: world, people, walking, verbs, HUD, sound, steam and water, bots, tab multiplayer, lab toggles, lab index link.

- Also done (Nov 12 night): phone pass at 375 px (HUD wraps, hint moved to the top), bots step around you, night and morning looks checked, falling maple leaves, porch wind chime, lake with dock and boat, frame cost measured (about 3 to 4 ms of script per frame on this Mac, mirror included), server notes in `docs/spa/SERVER-DRAFT.md`.

- Also done (Nov 12, 4:40pm check-in): you arrive by boat and walk in from the dock when you press Come in; number keys 1 to 4 press the verb buttons and Escape gets you up; two more hair shapes (ponytail, curls); a "慢慢来" scroll on the lounge wall; a sauna window that looks out to the plunge and lake; softer gravel; Chinese labels and iPad size (768 x 1024) checked.

- Also done (Nov 12, 8:50pm check-in): lying down or floating, your eyes sit a little higher so you see the room over your belly; walking view bob turns off when the system asks for reduced motion; beads of sweat on hot people in the sauna; a "New look" button in the settings pill re-rolls your person (other tabs see the change).

- Also done (Nov 12, 9:40pm check-in): all 8 hair shapes x 2 towel hats lined up and checked front and back, no poke-through; wet footprints trail behind anyone fresh out of a pool and dry in about 9 seconds; everyone in the sauna turns their head toward the stove when water is poured, and bots look at you when they wave; the daytime moon is fainter.

- Also done (Nov 12, 10:40pm check-in): softer steam haze over your own screen after a pour; thinner steam and slower leaves under reduced motion; seated people now look around and stretch on their own; night is a little brighter so the trees are not black; **bug fixed:** a firefly drifting past your face filled the screen with a white disc, so fireflies now vanish within 1.7 m of your eyes and steam thins right at your face.

- Also done (Nov 12, 11:40pm check-in): a long low tea table with cushions under the lounge's garden window (the floor plan stops short of it, so nobody walks through); faces have a small smile that opens for sighs and flattens in the cold; sweat starts at the temples; the boat rocks at the dock; a creak and a splash as you step off it.

- Also done (Nov 13, 12:30am round, after her feedback): sitting, soaking, lying and floating re-fitted to the gumdrop bodies; arm gestures reworked because short arms vanished into the big head when raised (wave goes out to the side, fan, bucket and stretch make a V, the forehead comes down to the egg); every verb and pose checked from the behind-you camera; first person and the mirror still work; ceiling lamps are paper lanterns with ribs; raked lines in the garden gravel; bots tend to cool off in the plunge after the sauna and warm up after the plunge.

- Also done (same round): when you sit, soak or plunge the camera comes round to face you, and when you lie down it rises to look from above; bots step round people lying on mats; curls hair softened.

- Also done (Nov 13, around 1am to 2am, split by a usage limit): walking has a waddle and a small hop; the camera starts wide over the lake behind the front door card and settles in behind you over about 3.5 seconds as you walk in; it sits 20 percent further back on an upright phone; scroll zoom checked (about 2 m in, about 5.8 m out); soft floor shadows under people; milk checked with the new arms; script cost about 2 ms a frame with the new camera.

- Also done (Nov 13, about 2am): the door curtain lifts when someone walks through; wisps of steam rise around heads in the hot spring; walking back out to the end of the dock ends the visit with a "See you tomorrow." card and a "Go back in" button (checked by reading the page, and going back in works).

- Also done (Nov 13, about 2:05am): arriving bots stop a step beside the door, not on your spot; two tabs retested after the camera, body and face changes (new look, lying on a mat and cucumbers all carry over; a missed cucumber, nap or float state is now repaired by the next heartbeat); phone (375 px), iPad (768 x 1024) and Chinese checked with the bigger settings panel; people were black silhouettes outdoors at night, so night light is stronger; the front door text no longer leaves one orphan word on a phone.

- Also done (Nov 13, about 2:15am): the behind-you camera can no longer dip under the floor, a pool surface or the lake; left alone for 25 seconds, the view drifts slowly round you (off under reduced motion); a "My clock" option under Time follows the visitor's real time of day (not the default); footsteps knock on wood and thud on stone and gravel; spout drops stop at the water; the 3D view has a screen reader label; `?solo` in the address keeps a tab out of the shared room (for testing while she plays in another tab).

- Also done (Nov 13, about 2:25am): people already sitting nearby look over when someone settles beside them; bots within about 3.5 m wave back when a real person waves (checked: three waved back in the sauna); a small squash and spring when anyone sits, lies down or gets up; breath mist from chilled people outdoors; floating yuzu and ice sink out of sight when they drift into the camera.

- Also done (Nov 13, about 2:35am, robustness): sound pauses while the tab is in the background; if frames stay slow for about three seconds the game draws fewer pixels, and on a second drop turns shadows off (logic only, not tried on a slow device); a plain message replaces the Come in button when 3D graphics cannot start (not triggered in testing); all of a person's materials are freed when they leave or get a new look (four new looks in a row ran clean); `app/lab/spa/README.md` explains how the files fit together and how to add a spot or a verb.

- Also done (Nov 13, about 2:50am): because she called the people ugly, three body shapes to choose between under **Body** in the settings pill: **Gumdrop** (current default), **Bean** (a taller smooth pill whose arms stay tucked away until a gesture needs them), **Dumpling** (short and round under a bigger head). Settings now stick across reloads in this browser (time, crowd, view, body, faces, sound); a `?solo` tab neither reads nor overwrites them.

- Also done (Nov 13, written about 3am, checked about 7am after a usage limit): smoke rises from a chimney above the sauna (seen at dusk); a wall of numbered lockers in the lounge (seen); a stone water basin by the garden door (seen); thin clouds high in the sky (seen at dusk and night, after moving them above the mountain tops); lit windows scattered on the far hills at night (seen, after placing them on the slopes by ray test; they had been buried inside the mountains).

- Also done (Nov 13, about 7am): the goodbye card now needs about two seconds of standing still at the end of the dock, so passing by no longer ends the visit; floating and the egg checked on Bean, the plunge and pouring checked on Dumpling, milk checked in first person, morning clouds seen; the lab index line and `docs/LAB-STATUS.md` no longer say "first person".

- Also done (Nov 13, about 7:15am, atmosphere): a soft halo round every lamp, stronger at night (seen at dusk); warm light spilling from windows and doors onto the ground at night (written, not clearly seen in my one night shot); stars in two layers that brighten and dim out of step (not checkable in a still); sandals left by the hot spring steps and on the plunge deck; stepping stones across the gravel from the garden door to the spring (seen).

- Also done (Nov 13, about 7:25am): window light on the ground made stronger and seen at night; sandals by the hot spring seen.

- Also done (Nov 13, about 7:45am): all twelve verb icons reviewed at a larger size, none needed fixing; verb buttons show their key (1, 2, 3, esc) on mouse and keyboard devices; a clear focus ring for anyone moving with the Tab key; the front door card says how many people are inside right now (seen: "7 people are inside right now").

- Also done (Nov 13, about 8am, soak test): simulated 20 minutes of bots. Seat bookkeeping stayed clean and memory counts stayed flat as bots came and went (about 487 geometries throughout). **Bug found and fixed:** two bots meeting at the porch and dock doorway aimed at the same point, pushed each other off it and stood there for five minutes; the fallback that lets a blocked bot squeeze past never ran. Now it does, and a head-on meeting at that doorway clears in about 6 seconds (four trials). Bot visits now last 4 to 25 minutes instead of 4 to 10, so the room no longer empties all at once.

- Also done (Nov 13, about 8:10am): bots now cross doorways anywhere across their width instead of all aiming at the exact middle. Second soak test after the fixes: 20 simulated minutes, no bot stalled longer than 5 seconds, bookkeeping clean, geometry count flat at 488, and between 3 and 7 bots present throughout.
