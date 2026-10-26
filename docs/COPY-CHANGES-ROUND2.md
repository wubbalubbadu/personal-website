# Copy changes: new studio voice

Voice: say why it matters, then what it lets you do. Warm, a little cute, no feature-list fragments, no dashes, no emoji.
Fit checked at 1440, 1024, 820 and 375 px in EN and ZH. Phone home cards clamp at 2 lines; every new home card fits in 2.

## Home: Practice cards (HomePreviewCards.tsx)

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Scale Studio | Any key, any range, any articulation, any pattern. Build your own scale book, and it remembers your tempos. | Scales make everything easier! Unlike a printed book, you can build any scale any way you like. | 练音阶真的很重要！和印好的音阶书不一样，这里的音阶随你搭配，想怎么练就怎么练。 |
| Long tones | Real-time pitch detection: see each note's tuning while you hold it, and where it sags. | Long tones grow a lovely sound. Hold a note and see if it stays in tune or droops at the end. | 好听的音色是从长音里练出来的。吹一个长音，看看它准不准，结尾有没有往下掉。 |
| Browse music | Interactive scores, not PDFs, with practice tools and smart displays built in. | Learning a new piece? Tap a note for its fingering, show the beats, or play with a drone. | 在学新曲子吗？点一下音符就能看指法，还能显示拍子，或者开着持续音一起吹。 |
| Breathing Lab | Breathe along with the guide at a pace you set. | Good breathing makes long phrases easy. Breathe along with the guide at your own pace. | 气息稳了，长乐句也会变轻松。跟着引导一起呼吸，快慢由你决定。 |

## Home Learn row + Learn page (HomePreviewCards.tsx, learn-pages.ts, translations.ts quickTools)

Home and the Learn page used to say different things for the same card; they now match.

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Theory lessons | Home: Hands-on theory lessons that play like little games. / Learn: Interactive tutorial for reading music. | Reading music makes every new piece easier. Each lesson plays like a little game. | 会识谱，学新曲子就快多了。每一课都像个小游戏。 |
| Rhythm drills (Learn only) | Ten new rhythms to tap each time, from quarter notes to sixteenths | Good rhythm makes any piece sound better. Tap new rhythms, from quarter notes to sixteenths. | 节奏稳了，什么曲子都好听。跟着点新的节奏，从四分音符到十六分音符。 |
| Fingering chart | Every note from low B to the top, with alternate fingerings. / Every note from low B up through the altissimo, with alternates | Stuck on a note? Find its fingering here, from low B all the way up, with alternates too. | 某个音不知道怎么按？来这里找，从低音 B 一路到最高音，还有替代指法。 |
| Trill chart | Four octaves of trill fingerings. | Trills can be sneaky! See which key to wiggle for each one, across four octaves. | 有些颤音的指法很刁钻。这里告诉你该动哪个键，四个八度都有。 |
| Body & embouchure | Home: A 3D cutaway of the lips, jaw and air, from low notes to high / Learn: An interactive model of posture, air and the aperture | Your sound starts with air and lips. Peek inside a 3D model and see what changes as you go higher. | 好声音从气息和嘴唇开始。看看 3D 模型里面，越吹越高的时候都有哪些变化。 |
| Technique roadmap | Every flute skill on one map, from air to extended techniques / What to work on next, and what it builds on | Wondering what to learn next? Every flute skill is on one map, so you can see what builds on what. | 不知道接下来练什么？所有长笛技巧都在这张地图上，先学什么、后学什么，一看就懂。 |

## Tools cards (ToolCards.tsx, translations.ts quickTools)

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Tuner | Check pitch | Being in tune helps everyone sound good together. Play a note and see if it is sharp or flat. | 音准对了，大家一起演奏才好听。吹一个音，看看偏高还是偏低。 |
| Metronome | Set or tap tempo | A steady beat keeps you honest. Set a tempo or tap one in, then play along. | 稳稳的拍子最靠得住。设好速度或者点几下，然后跟着吹。 |
| Drone | Hold reference pitches | A drone helps you hear your tuning. Hold a note underneath and listen for a smooth blend. | 持续音能帮你听出音准。让一个音在底下一直响，听听两个音合不合得上。 |
| Pitch tendency test (+ its page metadata) | Play the chromatic scale and see which notes run sharp or flat. | Every flute has notes that lean sharp or flat. Play a chromatic scale to find yours. | 每支长笛都有爱偏高或偏低的音。吹一遍半音阶，把你的那几个找出来。 |

## Exercises hub cards + Library exercise rows (content/exercise-catalog.ts `detail`, ExercisesHub.tsx)

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Scale Studio | Every scale in one place: major, minor, chromatic, whole tone and more | Scales make everything easier! Unlike a printed book, you can build any scale any way you like. | 练音阶真的很重要！和印好的音阶书不一样，这里的音阶随你搭配，想怎么练就怎么练。 |
| Long tones | Held notes and De la sonorité, with live pitch feedback (old ZH said something different: "covers your own range") | Long tones grow a lovely sound. Hold notes or play De la sonorité and watch your pitch live. | 好听的音色是从长音里练出来的。吹长音或 De la sonorité，实时看自己的音准。 |
| Breathing Lab | Diaphragmatic support and air control | Good breathing makes long phrases easy. Breathe along with the guide at your own pace. | 气息稳了，长乐句也会变轻松。跟着引导一起呼吸，快慢由你决定。 |
| Extended Techniques (coming soon) | Flutter, harmonics, singing while playing | The fun, strange sounds a flute can make, like flutter tonguing, harmonics and singing while you play. | 长笛还能发出好多奇妙的声音，比如花舌、泛音，还有边唱边吹。 |
| Tonguing Drills (coming soon) | Single, double, and triple tonguing | Clean tonguing makes fast notes sparkle. Practice single, double and triple tonguing. | 吐音干净，快的段落才会亮晶晶。练练单吐、双吐和三吐。 |
| Tricky bits card, nothing saved yet | Save a few bars from a piece, then practise them here. | Every piece has a hard spot. Save those bars from the score and practise them here. | 每首曲子都有难啃的地方。把那几个小节从乐谱里存下来，在这里反复练。 |

## Empty state

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Tricky bits page, empty (trickyBits.empty) | Nothing saved yet. Select a few bars in a piece and tap the bookmark. | Nothing here yet! When a few bars give you trouble, select them in the score and tap the bookmark. | 这里还是空的。遇到难的几个小节，在乐谱里选中它们，再点一下书签。 |

## Technique roadmap region intros (translations.ts roadmap.regions[].description)

Skill descriptions inside each region were left alone: they are short technical definitions.

| Where | Old EN | New EN | New ZH |
|---|---|---|---|
| Air & foundation | How breath, balance, and embouchure create a steady flute sound. | Everything starts here. Breath, balance and embouchure work together for a steady sound. | 一切从这里开始：呼吸、平衡和口型一起配合，吹出稳定的声音。 |
| Sound & expression | Control pitch, dynamics, color, vibrato, and the direction of a phrase. | Where your playing starts to sound like you, through pitch, dynamics, color, vibrato and phrasing. | 让演奏有你自己的味道：音准、力度、音色、颤音和乐句。 |
| Articulation | Coordinate air, tongue, and fingers for clear and varied note shapes. | How notes begin and end. Air, tongue and fingers learn to move together. | 音怎么开始，怎么结束。让气息、舌头和手指学会一起动。 |
| Fingers & patterns | Develop efficient finger motion through scales, trills, and recurring patterns. | Nimble fingers come from scales, trills and patterns you play again and again. | 灵活的手指，来自一遍又一遍的音阶、颤音和音型。 |
| Reading & musicianship | Connect notation, rhythm, harmony, listening, and musical style. | Turning the page into music, with rhythm, keys, harmony and careful listening. | 把谱面变成音乐：节奏、调性、和声，还有用心去听。 |
| Extended techniques | The contemporary sound world of the flute. | The playful, surprising sounds a modern flute can make. | 现代长笛那些好玩又出人意料的声音。 |

## Page metadata descriptions (EN only; search results and link previews)

| Where | Old EN | New EN |
|---|---|---|
| Studio layout | An all-in-one flute music viewer and practice helper with playback, drones, fingering, rhythm tools, and teaching markup. | A friendly place to practice flute. Build your own scales, check your tuning on long tones, and read scores that show fingerings and beats. |
| Exercises | Focused flute exercises for scales, tone, and finger coordination. | Scales, long tones and breathing for flute, plus the hard spots you saved from your pieces. |
| Scale Studio | (none) | Scales make everything easier! Build any scale any way you like, with fingerings for every note. |
| Long tones | (none) | Long tones grow a lovely sound. Hold a note and see if it stays in tune or droops at the end. |
| Breathing Lab | (none) | Good breathing makes long phrases easy. Breathe along with the guide at your own pace. |
| Fingering chart | Standard flute fingerings from low B through the altissimo, with alternates. | Stuck on a note? Flute fingerings from low B up through the altissimo, with alternates too. |
| Trill chart | Flute trills across four octaves with engraved notation, half-step and whole-step fingerings, and animated key movement. | Trills can be sneaky! Flute trill fingerings across four octaves, showing which key to wiggle for each one. |
| Tricky bits | Passages you are drilling, with tempos and repetitions. | The hard spots from your pieces, with your tempos and how many times you have played them. |

## Left alone on purpose

- Theory lesson scripts, button labels, tooltips, aria labels.
- Rhythm drills page metadata ("Ten short rhythms to tap, each a little harder than the last."): already plain, and the rhythm-drills session is still changing that page.
- Breathing Lab pattern details (breathing/timing.ts): another session's patch touches that file.
- Dead strings never rendered anywhere (`library.intro`, `exercises.intro`, `practicePage.intro`/`routineIntro`/`historyEmpty`, `trickyBits.homeBlurb`, `quickTools.browseMusicDetail`/`scaleStudioDetail`/`fingeringChartDetail`/`trillChartDetail`/`exercisesDetail`, `home.noSavedYetDetail`, exercise-catalog `description`). Worth deleting in a cleanup pass rather than rewording.
