import type { Metadata } from "next";
import "./studio-tokens.css";
import "./studio-shared.css";
import "./ios-theme.css";
import "./studio-shell.css";
import "./viewer-fixes.css";
import {PracticeAudioProvider} from "./PracticeAudio";
import PracticeToolDock from "./PracticeToolDock";
import PracticeSessionTimer from "./PracticeSessionTimer";
import PracticeRecorder from "./PracticeRecorder";
import CookiePet from "./CookiePet";
import StudioNavigation from "./StudioNavigation";
import {LanguageProvider} from "./i18n/LanguageContext";

export const metadata: Metadata = {title:"Cookie Flute Studio",description:"An all-in-one flute music viewer and practice helper with playback, drones, fingering, rhythm tools, and teaching markup."};

export default function FluteStudioLayout({children}:{children:React.ReactNode}){return <LanguageProvider><PracticeAudioProvider><StudioNavigation/><div className="studio-route">{children}</div><PracticeSessionTimer/><PracticeRecorder/><PracticeToolDock/><CookiePet/></PracticeAudioProvider></LanguageProvider>}
