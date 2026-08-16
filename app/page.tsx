import "./cookie-home.css";

const projects = [
  {title:"Cookie Flute Studio", label:"MUSIC VIEWER + PRACTICE HELPER", note:"Interactive sheet music, playback, drones, rhythm helpers, fingering, and teaching markup.", href:"/flute-studio", color:"sage", mark:"♫", action:"Open project"},
  {title:"Beat Kitchen", label:"RHYTHM LAB", note:"A compact place for rhythm experiments and practice loops.", color:"peach", mark:"◫", action:"Prototype shelf"},
  {title:"Drone Jar", label:"TONE TOOL", note:"Pitch matching and interval practice. Currently included inside Cookie Flute Studio.", color:"blue", mark:"◉", action:"Inside Flute Studio"},
  {title:"Next bake", label:"EMPTY TIN", note:"Space for the next small teaching tool or musical experiment.", color:"cream", mark:"＋", action:"Coming later"},
];

export default function CookieHome(){return <main className="cookie-home"><header className="cookie-head"><a href="/" className="cookie-brand"><span>c</span><strong>cookie</strong></a><p>small things, baked with care</p><button aria-label="Open profile">HW</button></header><section className="project-intro"><div><p>PROJECT TIN · 04</p><h1>Pick something<br/><em>to practice.</em></h1></div><p className="intro-note">A tidy shelf for music tools, experiments, and teaching projects.</p></section><section className="project-grid">{projects.map((project,index)=>{const inside=<><div className={`project-mark ${project.color}`}>{project.mark}</div><div className="project-copy"><small>{String(index+1).padStart(2,"0")} · {project.label}</small><h2>{project.title}</h2><p>{project.note}</p></div><span className="project-action">{project.action} <b>↗</b></span></>;return project.href?<a key={project.title} className="project-card live" href={project.href}>{inside}</a>:<article key={project.title} className="project-card">{inside}</article>})}</section></main>}
