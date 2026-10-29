# Cookie Flute Studio home study

Three local prototypes compare the containers and layout around the existing animations. The current landing page remains unchanged. These are alternatives to judge, not a selected redesign.

## Hold these constant

- Four activities: Scale Studio, Long tones, Browse music, and Breathing Lab.
- Reuse the current animated previews and real destination links.
- Keep the activity names and short descriptions consistent between alternatives.
- White background, the studio system font, and restrained color. Musical notation and the demonstrations provide the identity.
- Preserve keyboard focus, readable mobile layouts, and the previews' reduced-motion behavior.
- The study page supplies `LanguageProvider`: BreathingPreview uses Sequence, which reads that context. The other animation components can render independently, but the group must keep this wrapper.

| Token | Value | Role |
|---|---|---|
| White | `#ffffff` | Page and containers |
| Ink | `#292a33` | Primary text |
| Muted | `#71747e` | Descriptions |
| Line | `#e4e4e7` | Separators and subtle outlines |
| Purple | `#79588e` | Selected activity and focus |
| Pale | `#f1f1f2` | Quiet controls |

Font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif`. Use left-aligned labels and descriptions, with centered notation inside each demonstration.

## Quiet cards

White containers with 18px corners, a fine outline or separator, and no shadow. Put the title above the demonstration so the page reads as a set of activities before it reads as a gallery of illustrations.

```text
Practice
+-------------------+  +-------------------+
| Scale Studio      |  | Long tones        |
| existing demo     |  | existing demo     |
| short description |  | short description |
+-------------------+  +-------------------+
| Browse music      |  | Breathing Lab     |
| existing demo     |  | existing demo     |
| description       |  | description       |
+-------------------+  +-------------------+
Reference links
```

**Hypothesis:** The cards can work if their surfaces stop competing with the musical content.

**Tradeoff:** This retains the familiar scanning pattern, but repeated boxes may still feel too uniform. On mobile, the cards stack with the activity name immediately visible.

## Open page

Remove the outer containers. Pair text and animations in wide, asymmetric rows, with whitespace separating activities. Keep reference charts as plain links rather than more illustrated tiles.

```text
Practice

Scale Studio          [ wide scale demo            ]
short description

[ pitch trace demo           ]    Long tones
                                  short description

[ music demo             ]   [ breathing demo        ]
Browse music                 Breathing Lab
short description            short description

Theory lessons    Fingering chart    Trill chart
```

**Hypothesis:** The animations can belong to the page itself instead of looking like pictures inside feature cards.

**Tradeoff:** The composition offers more variation, but it uses more vertical space and could slow scanning. On mobile, the two large features become text followed by demonstration; Browse music and Breathing Lab stack with their demonstrations above their titles.

## One preview

A list of four activities selects one large demonstration. Show its description and an explicit link to open the real destination. Selecting an activity changes the preview; it does not navigate unexpectedly.

```text
Practice
Scale Studio          [                           ]
  description         [ one selected demo         ]
Long tones            [                           ]
  description
Browse music
  description
Breathing Lab
  description
                      Open selected activity

Reference links
```

**Hypothesis:** One focused demonstration can make the page feel calmer and more intentional than several animations running together.

**Tradeoff:** It gives each activity room, but visitors must make a selection to see the other previews. On mobile, place the activity selector above the demonstration and keep the destination action easy to find.

## Compare before choosing

Use the same viewport and examine each alternative briefly before interacting.

- **First glance:** Where does your eye land, and is that where you want to begin?
- **Scannability:** Can you find scales, music, and a reference chart without studying the page?
- **Warmth:** Does it feel welcoming without depending on pastel boxes or decorative copy?
- **Musical identity:** Do the notation and demonstrations make this clearly a flute studio?
- **Mobile:** Are labels, previews, and actions still readable without crowding or excessive scrolling?

Keep the parts that help. A useful result can be a combination of treatments rather than one complete prototype.
