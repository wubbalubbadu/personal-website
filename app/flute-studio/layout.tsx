import type { Metadata } from "next";
import "./studio-tokens.css";
import "./studio-shared.css";
import "./ios-theme.css";
import "./studio-shell.css";
import "./viewer-fixes.css";
import "./reader-cards.css";
// Preview geometry must be present before the server-rendered SVGs paint.
import "./home-preview-cards.css";
import "./components/preview-grid.css";
import {PracticeAudioProvider} from "./PracticeAudio";
import PracticeToolDock from "./PracticeToolDock";
import StudioNavigation from "./StudioNavigation";
import {LanguageProvider} from "./i18n/LanguageContext";

export const metadata: Metadata = {title:"Cookie Flute Studio",description:"An all-in-one flute music viewer and practice helper with playback, drones, fingering, rhythm tools, and teaching markup."};

// CookiePet stays unmounted while its future role is undecided, so its separate timer cannot run.
export default function FluteStudioLayout({children}:{children:React.ReactNode}){return <LanguageProvider><PracticeAudioProvider><StudioNavigation/><div className="studio-route">{children}</div><PracticeToolDock/></PracticeAudioProvider></LanguageProvider>}
