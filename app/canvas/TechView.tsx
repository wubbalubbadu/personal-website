import { resume } from "../lib/resume";

export default function TechView() {
  return (
    <div className="tk">
      {Object.entries(resume.skills).map(([group, items]) => (
        <div key={group} className="tk-group">
          <span className="tk-label">{group}</span>
          <p className="tk-list">{items.join("  ·  ")}</p>
        </div>
      ))}
    </div>
  );
}
