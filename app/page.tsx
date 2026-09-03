import "./personal-home.css";
import Image from "next/image";

const projects = [
  {
    title: "Cookie Flute Studio",
    description:
      "A practice space I’m building for flutists, with interactive sheet music, rhythm tools, drones, fingering help, and room to mark up a score. It started with things I wanted in my own practice sessions and grew into a larger experiment in making music software feel useful rather than clinical.",
    href: "/flute-studio",
    linkText: "Open Cookie Flute Studio",
    visual: "studio",
  },
  {
    title: "QR Tree",
    description:
      "An experiment in turning a scannable QR code into a blocky, Minecraft-style tree that can be rotated in 3D and returned to a readable 2D code. I’m still working through the central constraint: making the transformation playful without losing the information that makes the code work.",
    visual: "qr",
  },
  {
    title: "Market",
    description:
      "An archived marketplace Julia Chu and I built for Northwestern students to request and sell secondhand items. We worked across the interface and application, including listings, search, accounts, image uploads, authentication, and the API behind them.",
    visual: "market",
    archived: true,
  },
  {
    title: "SKUY",
    description:
      "An archived mobile community and news app made around student life at Northwestern. I worked on both frontend and backend development, including application screens and APIs for communities, posts, and aggregated news.",
    visual: "skuy",
    archived: true,
  },
];

function StudioPreview() {
  return (
    <div className="studio-shot" aria-label="Illustrated preview of Cookie Flute Studio">
      <div className="studio-side"><span className="studio-cookie">c</span><i /><i /><i /></div>
      <div className="studio-main">
        <div className="studio-toolbar"><span>mystery of love</span><b>♪</b><b>♩</b><b>▶</b></div>
        <div className="studio-paper">
          <p>MYSTERY OF LOVE</p>
          <div className="music-system"><strong>𝄞</strong><span /></div>
          <div className="music-system"><strong>𝄞</strong><span /></div>
          <div className="music-system"><strong>𝄞</strong><span /></div>
        </div>
      </div>
    </div>
  );
}

function ProjectVisual({ kind, title }: { kind: string; title: string }) {
  if (kind === "studio") return <StudioPreview />;
  if (kind === "qr") return <Image src="/portfolio/qr-tree.svg" width={1200} height={900} alt="Concept sketch of a QR code growing into a blocky tree" />;
  return <Image src={kind === "market" ? "/portfolio/market.png" : "/portfolio/skuy.png"} width={kind === "market" ? 2346 : 902} height={kind === "market" ? 3260 : 1084} alt={`${title} interface`} />;
}

export default function Home() {
  return (
    <main className="personal-home">
      <nav className="home-nav" aria-label="Main navigation">
        <a href="#work">Projects</a>
        <a href="#flute">Flute</a>
        <a href="https://github.com/wubbalubbadu">GitHub</a>
      </nav>

      <section className="hello" aria-labelledby="hello-title">
        <div className="hello-copy">
          <h1 id="hello-title">I wanted to keep both.</h1>
          <p>I studied computer science and flute at Northwestern, and I decided to keep pursuing both. I chose conservatory training because I wanted to find out how far I could take my playing with focused, intensive work, and I wanted more opportunities to perform and be heard. I kept building software because I enjoy solving difficult problems, collaborating with other people, and making things someone can actually use. This site brings together some of the projects, performances, and experiments I’ve been working on.</p>
        </div>
        <div className="nessie-wrap" aria-hidden="true"><span className="nessie-shadow" /><Image src="/portfolio/nessie.png" width={1080} height={1080} alt="" /></div>
      </section>

      <section className="work" id="work" aria-labelledby="work-title">
        <h2 id="work-title">Things I’ve built and things I’m figuring out.</h2>
        <div className="project-list">
          {projects.map((project) => (
            <article className="project" key={project.title}>
              <div className={`project-visual visual-${project.visual}`}><ProjectVisual kind={project.visual} title={project.title} /></div>
              <div className="project-writing">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                {project.href ? <a href={project.href}>{project.linkText}</a> : null}
                {project.archived ? <small>From the archive</small> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flute" id="flute" aria-labelledby="flute-title">
        <div className="flute-copy">
          <h2 id="flute-title">The other half of my work happens with a flute.</h2>
          <p>I’m continuing my conservatory training and preparing for young artist competitions, with the goal of reaching the highest level of playing I can. Competitions give that work somewhere to go: onto a stage, under pressure, where it can be heard. I also share performances and parts of the process online.</p>
        </div>
        <div className="video-shelf">
          <div className="performance-video">
            <iframe src="https://www.youtube-nocookie.com/embed/ya3cFeMKD14?start=649" title="Haylie Wu competition performance" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <a className="social-video tiktok-video" href="https://www.tiktok.com/@wubulubadudu"><span>TikTok</span><b>@wubulubadudu</b><em>↗</em></a>
          <a className="social-video douyin-video" href="https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI?from_tab_name=main"><span>抖音</span><b>See my flute videos</b><em>↗</em></a>
        </div>
      </section>

      <footer className="home-footer">
        <Image src="/portfolio/nessie.png" width={1080} height={1080} alt="" aria-hidden="true" />
        <p>You can find more of my code on <a href="https://github.com/wubbalubbadu">GitHub</a>, and more of my playing on <a href="https://www.tiktok.com/@wubulubadudu">TikTok</a> and <a href="https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI?from_tab_name=main">Douyin</a>.</p>
      </footer>
    </main>
  );
}
