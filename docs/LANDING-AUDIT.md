# Landing page audit

What is on the live home page today (`app/page.tsx` → `app/ChatPanel.tsx`, content in `app/lib/answers.ts`, panel views in `app/canvas/`), and what a simpler page would do with each piece.

**Keep** = on the first screen. **Fold** = one tap away (a sheet, a sub page, or the PDF). **Drop** = gone from the home page (the content can still live elsewhere).

## Window chrome

| Thing | What it does | Verdict | Why |
| --- | --- | --- | --- |
| Fake macOS window frame + traffic lights | Red dot closes the panel; yellow and green are decoration | Drop | The frame is the main "a million things" signal; it makes the page look like an app to operate |
| Title pill `haylie.dev` | Decoration | Drop | Not her domain (hayliewu.com), reads as a placeholder |
| `● READY` status | Decoration | Drop | Pure chrome |
| ⟲ Start over | Resets the chat | Drop | Nothing to reset on a page that is not a chat |
| ☾ / ☀ theme toggle | Manual light/dark, stored in `localStorage.theme`, applied pre-paint in `app/layout.tsx` | Keep | She asked for real dark mode; the lab pages reuse the same storage key, so the choice carries across |
| Footer `HAYLIE WU · SOFTWARE + FLUTE` | Caption | Drop | Repeats the intro |
| Footer `SAY HI ↗` | Opens the contact answer | Keep (as a plain contact line) | Contact is one of the five things people come for |

## Greeting (4 nodes in `GREETING`)

| Node | Verdict | Notes |
| --- | --- | --- |
| "Hi, I'm Haylie. I'm a [software engineer] with a background that combines computer science and high-level [flute performance]." | Keep, rewritten shorter and warmer | The two linked phrases become real links (flute, projects) instead of chat triggers |
| "I finished my computer science degree at Northwestern, then spent two years training intensively in flute performance at New England Conservatory..." | Keep the facts, trim | Approved facts: CS degree at Northwestern, two years of flute performance at NEC. No "master's in music technology", no job-seeking line |
| "Here's what I'm working on right now: [Cookie Flute Studio] and my [Learning Log]." | Keep, promoted | These become the two biggest links on the page |
| "Here are some starting points." | Drop | Only made sense with chips under it |

## Suggestion chips (`CHIP_GROUPS`, plus follow-ups)

| Chip | Intent | Verdict | Where it goes |
| --- | --- | --- | --- |
| Tell me about your background | `background` (4 paragraphs: MathWorks, startup, NetLogo, NEC) | Fold | Into the résumé PDF. Employment detail is the résumé's job |
| Show me your timeline | `experience` → TimelineView | Drop from home | Lovely but secondary; could return as its own page later |
| Can I see your résumé? | `resume` → ResumeView with tech filter | Fold | A plain "Résumé (PDF)" link in the contact line |
| What have you built? | `projects` → ProjectsView | Keep | One "Projects" link that opens a small sheet listing `projects.ts` |
| What's your tech stack? | `tech-stack` → TechView | Drop from home | The résumé PDF covers it |
| Tell me about your flute playing | `flute` → FluteView | Keep, simplified | One "Flute" link group: competition video, TikTok, Douyin, RedNote, music résumé |
| How do I get in touch? | `contact` | Keep | Email, LinkedIn, GitHub, résumé |
| Keep going / ↺ all topics | follow-up navigation | Drop | No chat, no follow-ups |
| Hidden: Cookie Flute Studio, Learning Log, Market, SKUY | project intents | Fold | Cookie Flute Studio and Learning Log are top-level links; Market and SKUY live in the Projects sheet |

## Right-side canvas panel (`app/canvas/`)

| Piece | Verdict | Notes |
| --- | --- | --- |
| Tabbed browser panel with fake URL pills (`heyhereismyresume`) | Drop | Second window inside the window |
| ResumeView (tech filter, cross highlight, PDF) | Fold to the PDF | |
| TimelineView (two tracks) | Drop from home | Candidate for a standalone `/timeline` later |
| TechView | Drop | |
| ProjectsView (5 cards + detail, audio players) | Fold | Lab pages use a small sheet with name, year, one line, and links or audio |
| FluteView: YouTube competition clip | Fold to a link | Embeds are heavy for a one-screen page |
| FluteView: two TikTok embeds | Drop from home | The TikTok profile link covers them |
| FluteView: social carousel with follower counts | Keep as plain links, no counts on the first screen | Counts can sit in the flute line if she wants them |
| FluteView: featured RedNote clip, music résumé PDF | Keep music résumé, drop the extra clip | |

## Behaviour

| Thing | Verdict |
| --- | --- |
| Typing indicator, fade-in reveals | Drop (small idle motion on the mascot replaces it) |
| Keyboard shortcuts (b, t, r, p, s, f, c, 1 to 4, Esc) | Drop, normal tab order is enough |
| `prefers-reduced-motion` handling | Keep; every lab animation stops under it |
| `<noscript>` fallback | Keep the idea, but the live one has an em dash and says "master's in flute"; lab pages render as server HTML so they need no fallback |

## Content issues found while auditing (live site, not changed here)

- `app/page.tsx` noscript text uses an em dash ("Haylie Wu — software developer").
- `app/lib/projects.ts`: Cookie Flute Studio `blurb` and `detail`, and Learning Log `detail`, contain em dashes. The lab pages override the Cookie Flute Studio line instead of showing that blurb.
- `answers.ts` `flute` answer says "I'm doing my master's in flute performance at New England Conservatory", while the greeting says "spent two years training intensively in flute performance". Worth picking one framing.
- Social links live only inside `app/canvas/FluteView.tsx` (`SOCIALS`, not exported). The lab copies them into `app/lab/_kit/links.ts`; whichever direction wins should move them to `app/lib/socials.ts` and have FluteView import from there.

## What the simpler page keeps

1. A three line intro in her voice (who she is, the CS + flute facts, what she is making now).
2. Cookie Flute Studio and Learning Log as the two loudest links.
3. Flute: video and socials.
4. Projects, folded into one sheet.
5. Contact: email, LinkedIn, GitHub, résumé PDF.
6. Dark mode toggle.
7. A slot for the 3D cookie mascot.

## Update: link in bio first

Haylie's steer after the first round: the page is mainly for people tapping the link on her Instagram, so it is phone first (375x667 and 390x844, Instagram's in-app browser, no hover, 44px taps) and has to say who she is and what she is doing within 3 seconds, without any tapping. The room, desktop pet and zine ideas were dropped as too common.

What that changes in the verdicts above:

- The who line now names all three facts at once: flutist at New England Conservatory, computer science degree from Northwestern, builds music software.
- Cookie Flute Studio, Learning Log and Flute videos are the three biggest targets, each with one plain line. Projects and Say hi are smaller but still on the first screen.
- The scripted answers (`flute`, `background`, `projects`, `contact`) come back in direction 1 as an optional dialogue with a cat. Two phrases that point at the old right panel are swapped in the lab only (see `FIXES` in `app/lab/home-1/CatHost.tsx`).
- Because the cat reuses the `flute` answer, the "master's in flute performance" versus "two years training" mismatch noted above now shows on the new page too. Worth settling before any of these ship.
