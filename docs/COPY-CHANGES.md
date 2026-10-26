# Copy changes: studio voice, revision 2

Revision 2 follows Haylie's review of the first pass:

- **Broad idea, not features:** say what something is for, not a few of its features ("interactive sheet music and all kinds of tools", not "tap a note, show the beats, play with a drone").
- **One short line:** no two-sentence subtitles.
- **No cheer lead-ins:** lines like "Scales make everything easier!" are gone.
- **No subtitles for obvious tools:** the tuner, metronome and drone cards show just their names.
- **Native Chinese:** written natively and shorter, not translated. Lines I was unsure of are marked ⚑ for Haylie to check.

No dashes. Fit is checked at desktop, 820 and 375 px in EN and ZH.

## Home: Practice cards (HomePreviewCards.tsx)

| Where | Revision 1 EN | Now EN | Now ZH |
|---|---|---|---|
| Scale Studio (also the Exercises card and Library row) | Scales make everything easier! Unlike a printed book, you can build any scale any way you like. | Unlike a printed scale book, build any scale any way you like. | 不用照着音阶书练，音阶随你搭配。 |
| Long tones (also Exercises, page description) | Long tones grow a lovely sound. Hold a note and see if it stays in tune or droops at the end. | We track your pitch and record your tendencies. | 实时看音准，记录你的音准倾向。 |
| Browse music | Learning a new piece? Tap a note for its fingering, show the beats, or play with a drone. | Learn music with interactive sheet music and all kinds of tools. | 用互动乐谱和各种小工具学曲子。 |
| Breathing Lab (also Exercises, page description) | Good breathing makes long phrases easy. Breathe along with the guide at your own pace. | Guided breathing at a pace you set. | 跟着引导练呼吸，快慢自己定。 |

## Learn cards (Home's Learn row and the Learn page: HomePreviewCards.tsx, learn-pages.ts, translations.ts)

| Where | Revision 1 EN | Now EN | Now ZH |
|---|---|---|---|
| Theory lessons | Reading music makes every new piece easier. Each lesson plays like a little game. | Learn to read staff music through little games. | 通过小游戏学看五线谱。 |
| Rhythm drills (Learn page) | Good rhythm makes any piece sound better. Tap rhythms that keep getting harder, with real bars from the Library mixed in. | Tap rhythms that keep getting harder, with real bars from the Library. | 越点越难的节奏，还有曲库里的真实小节。 ⚑ |
| Fingering chart | Stuck on a note? Find its fingering here, from low B all the way up, with alternates too. | Every fingering from low B up, with alternates. | 全音域指法，附替代指法。 |
| Trill chart | Trills can be sneaky! See which key to wiggle for each one, across four octaves. | Trill fingerings for four octaves, with the moving keys shown. | 四个八度的颤音指法，标出要动的键。 |
| Body & embouchure | Your sound starts with air and lips. Peek inside a 3D model and see what changes as you go higher. | A 3D look at posture, air and the lips, from low notes to high. | 用 3D 模型看姿势、气息和嘴型。 |
| Technique roadmap | Wondering what to learn next? Every flute skill is on one map, so you can see what builds on what. | Every flute skill on one map, and what each one builds on. | 所有长笛技巧一张图，先学什么一目了然。 ⚑ |

## Tools cards (ToolCards.tsx, translations.ts)

| Where | Revision 1 EN | Now EN | Now ZH |
|---|---|---|---|
| Tuner | Being in tune helps everyone sound good together. Play a note and see if it is sharp or flat. | (no subtitle) | (no subtitle) |
| Metronome | A steady beat keeps you honest. Set a tempo or tap one in, then play along. | (no subtitle) | (no subtitle) |
| Drone | A drone helps you hear your tuning. Hold a note underneath and listen for a smooth blend. | (no subtitle) | (no subtitle) |
| Pitch tendency test (+ page description) | Every flute has notes that lean sharp or flat. Play a chromatic scale to find yours. | Find which notes you tend to play sharp or flat. | 找出你容易吹高或吹低的音。 |

## Exercises hub (content/exercise-catalog.ts, ExercisesHub.tsx)

| Where | Revision 1 EN | Now EN | Now ZH |
|---|---|---|---|
| Extended Techniques (coming soon) | The fun, strange sounds a flute can make, like flutter tonguing, harmonics and singing while you play. | The unusual sounds a flute can make. | 长笛的各种特殊音色。 |
| Tonguing Drills (coming soon) | Clean tonguing makes fast notes sparkle. Practice single, double and triple tonguing. | Drills for clean, fast tonguing. | 练干净、快速的吐音。 |
| Tricky bits card, nothing saved yet | Every piece has a hard spot. Save those bars from the score and practise them here. | Save hard bars from any piece and practise them here. | 把难的小节存下来，在这里反复练。 |
| Tricky bits page, empty | Nothing here yet! When a few bars give you trouble, select them in the score and tap the bookmark. | When a few bars give you trouble, select them in the score and tap the bookmark. | 遇到难的小节，在乐谱里选中，点一下书签。 |

## Technique roadmap region intros (translations.ts)

| Where | Revision 1 EN | Now EN | Now ZH |
|---|---|---|---|
| Air & foundation | Everything starts here. Breath, balance and embouchure work together for a steady sound. | Breath, balance and embouchure working together for a steady sound. | 呼吸、平衡和口型配合，吹出稳定的声音。 |
| Sound & expression | Where your playing starts to sound like you, through pitch, dynamics, color, vibrato and phrasing. | Shaping your sound: pitch, dynamics, color, vibrato and phrasing. | 音准、力度、音色、颤音和乐句。 |
| Articulation | How notes begin and end. Air, tongue and fingers learn to move together. | How notes begin and end, with air, tongue and fingers together. | 音的开头和结尾，气息、舌头和手指一起配合。 ⚑ |
| Fingers & patterns | Nimble fingers come from scales, trills and patterns you play again and again. | Scales, trills and patterns for nimble fingers. | 音阶、颤音和常见音型，练出灵活的手指。 |
| Reading & musicianship | Turning the page into music, with rhythm, keys, harmony and careful listening. | Rhythm, keys, harmony and listening. | 节奏、调性、和声与聆听。 |
| Extended techniques | The playful, surprising sounds a modern flute can make. | The unusual sounds of the modern flute. | 现代长笛的特殊音色。 |

## Page descriptions (EN only; search results and link previews)

| Where | Revision 1 EN | Now EN |
|---|---|---|
| Studio | A friendly place to practice flute. Build your own scales, check your tuning on long tones, and read scores that show fingerings and beats. | A flute practice studio with scales, long tones, interactive sheet music and more. |
| Exercises | Scales, long tones and breathing for flute, plus the hard spots you saved from your pieces. | Scales, long tones and breathing for flute, plus the hard bars you saved. |
| Scale Studio | Scales make everything easier! Build any scale any way you like, with fingerings for every note. | Build any scale any way you like, with fingerings for every note. |
| Long tones | Long tones grow a lovely sound. Hold a note and see if it stays in tune or droops at the end. | We track your pitch and record your tendencies. |
| Breathing Lab | Good breathing makes long phrases easy. Breathe along with the guide at your own pace. | Guided breathing at a pace you set. |
| Fingering chart | Stuck on a note? Flute fingerings from low B up through the altissimo, with alternates too. | Flute fingerings from low B up through the altissimo, with alternates. |
| Trill chart | Trills can be sneaky! Flute trill fingerings across four octaves, showing which key to wiggle for each one. | Flute trill fingerings across four octaves, with the moving keys shown. |
| Tricky bits | The hard spots from your pieces, with your tempos and how many times you have played them. | Hard bars from your pieces, with your tempos and reps. |
| Pitch tendency test | Every flute has notes that lean sharp or flat. Play a chromatic scale to find yours. | Find which notes you tend to play sharp or flat. |

## ⚑ Chinese lines to check

- **Rhythm drills, 越点越难的节奏，还有曲库里的真实小节:** "真实小节" might read stiffly. "曲库里的乐句" is an alternative.
- **Roadmap, 一目了然:** a common phrase, but it can feel a little bookish. Plain alternative: "所有长笛技巧画在一张图上。"
- **Articulation region, 音的开头和结尾:** the most literal of the set. A shorter option is "起音、收音，气息和舌头的配合。"
- **音准倾向:** I used this in Long tones because the Tools test is already named 音准倾向测试. If it feels technical, "看看你哪些音容易偏" is simpler.

## Left alone

- Theory lesson scripts, button labels, tooltips.
- Rhythm drills page description ("Endless rhythms to tap, getting harder as you go, with bars from pieces in the Library."): already a plain single line from the rhythm-drills work.
