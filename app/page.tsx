import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/silkscreen/400.css";
import CatHost from "./lab/home-1/CatHost";

/* The home page is Cat host: the handheld with the cat's studio. The old chat
   home (ChatPanel) is kept in the repo, unused, so it's easy to bring back. */
export default function Home() {
  return (
    <>
      <CatHost />
      <noscript>
        <div style={{ maxWidth: 520, margin: "24px auto", padding: "0 16px", lineHeight: 1.6 }}>
          <p>
            Haylie Wu, flutist and software engineer. Computer science and flute at Northwestern; master&rsquo;s in
            flute performance at New England Conservatory.
          </p>
          <ul>
            <li>
              <a href="/haylie-wu-resume.pdf">Résumé (PDF)</a>
            </li>
            <li>
              <a href="mailto:hayliewu0709@gmail.com">hayliewu0709@gmail.com</a>
            </li>
            <li>
              <a href="https://linkedin.com/in/haylie-wu">linkedin.com/in/haylie-wu</a>
            </li>
            <li>
              <a href="https://github.com/wubbalubbadu">github.com/wubbalubbadu</a>
            </li>
          </ul>
        </div>
      </noscript>
    </>
  );
}
