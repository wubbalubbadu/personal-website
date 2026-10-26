import type { Metadata } from "next";
import MascotLab from "./MascotLab";

export const metadata: Metadata = {
  title: "Cookie in 3D | Haylie Wu",
  description: "A tiny PS1 style cookie and cat, rendered live.",
};

export default function MascotLabPage() {
  return <MascotLab />;
}
