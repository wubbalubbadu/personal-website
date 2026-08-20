import type { Metadata } from "next";
import "./studio-shared.css";
import "./ios-theme.css";
import PracticeToolDock from "./PracticeToolDock";
import SavedMusicHome from "./SavedMusicHome";
import PracticeSessionTimer from "./PracticeSessionTimer";
import PracticeActivityHero from "./PracticeActivityHero";
import PracticeRecorder from "./PracticeRecorder";

export const metadata: Metadata = {title:"Cookie Flute Studio",description:"An all-in-one flute music viewer and practice helper with playback, drones, fingering, rhythm tools, and teaching markup."};

export default function FluteStudioLayout({children}:{children:React.ReactNode}){return <>{children}<PracticeSessionTimer/><PracticeRecorder/><PracticeActivityHero/><SavedMusicHome/><PracticeToolDock/></>}
