import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/silkscreen/400.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Log — AI for Music — Haylie Wu",
  description:
    "An interactive rebuild of my CMU deep-learning-for-music notes: digital-audio fundamentals with live Web Audio demos, then the theory of latent generative models. Read it or click through it.",
};

export default function LearningLogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
