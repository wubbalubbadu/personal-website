import type {Metadata} from "next";
import ArticulationTool from "./ArticulationTool";
import {LanguageProvider} from "../../flute-studio/i18n/LanguageContext";
import {PracticeAudioProvider} from "../../flute-studio/PracticeAudio";
import "../../flute-studio/studio-tokens.css";
import "../../flute-studio/studio-shared.css";
import "../../flute-studio/exercises/exercises.css";
import "../../flute-studio/practice/practice-page.css";
import "./articulation.css";

export const metadata: Metadata = {
  title: "See your articulation | Lab",
  description: "Record a phrase and see its shape: how each note starts, how long it sounds, and how it ends.",
  robots: {index: false, follow: false},
};

// A lab page, outside the studio layout, so it brings the two studio providers the tool reads.
export default function ArticulationPage() {
  return <LanguageProvider><PracticeAudioProvider><ArticulationTool/></PracticeAudioProvider></LanguageProvider>;
}
