import { resume } from "../lib/resume";

const usedIn: Record<string, string[]> = {};
for (const role of resume.experience) {
  for (const tech of role.tech) {
    (usedIn[tech] ??= []).push(role.org);
  }
}

export default function TechView() {
  return (
    <div className="tk">
      {Object.entries(resume.skills).map(([group, items]) => (
        <section key={group} className="tk-group">
          <span className="tk-label">{group}</span>
          <div className="tk-grid">
            {items.map((tech) => (
              <div key={tech} className="tk-tile" title={usedIn[tech] ? `Used at ${usedIn[tech].join(", ")}` : undefined}>
                <span className="tk-mono">{tech.replace(/[^A-Za-z0-9]/g, "").slice(0, 2)}</span>
                <span className="tk-name">{tech}</span>
                {usedIn[tech] ? <span className="tk-where">{usedIn[tech].length} role{usedIn[tech].length > 1 ? "s" : ""}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
