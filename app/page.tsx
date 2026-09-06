import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/silkscreen/400.css";
import "./personal-home.css";
import ChatPanel from "./ChatPanel";

export default function Home() {
  return (
    <main className="home-stage">
      <ChatPanel />
      <noscript>
        <div className="home-noscript">
          <p>
            Haylie Wu — software developer. Computer science at Northwestern; master&rsquo;s in flute at New England
            Conservatory.
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
    </main>
  );
}
