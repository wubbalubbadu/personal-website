import { CanvasSpec } from "./answers";
import { getProject } from "./projects";

export type CanvasTab = {
  /** Stable id: one tab per artifact. */
  id: string;
  spec: CanvasSpec;
  title: string;
  /** Playful fake address shown in the panel's location pill. */
  url: string;
};

export function tabFromSpec(spec: CanvasSpec): CanvasTab {
  switch (spec.kind) {
    case "resume":
      return { id: "resume", spec, title: "Résumé", url: "heyhereismyresume" };
    case "timeline":
      return { id: "timeline", spec, title: "Timeline", url: "howigothere" };
    case "tech":
      return { id: "tech", spec, title: "Tech", url: "thingsiworkwith" };
    case "projects":
      return { id: "projects", spec, title: "Projects", url: "whativebeenworkingon" };
    case "flute":
      return { id: "flute", spec, title: "Flute", url: "meplayingflute" };
    case "project": {
      const project = getProject(spec.slug);
      return {
        id: `project:${spec.slug}`,
        spec,
        title: project ? project.name : "Project",
        url: `whativebeenworkingon/${spec.slug}`,
      };
    }
  }
}
