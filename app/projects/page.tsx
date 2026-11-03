import type { Metadata } from "next";
import ProjectsPage from "./ProjectsPage";

export const metadata: Metadata = {
  title: "Projects | Haylie Wu",
  description: "Everything Haylie Wu has built: what each project does and how it's built.",
};

export default function Projects() {
  return <ProjectsPage />;
}
