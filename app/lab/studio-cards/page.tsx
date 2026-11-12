// Card study inside the real studio chrome (nav, tools dock, audio), so each
// style is judged as part of the app, not on a bare page.
import "../../flute-studio/studio-tokens.css";
import "../../flute-studio/studio-shared.css";
import "../../flute-studio/ios-theme.css";
import "../../flute-studio/studio-shell.css";
import "../../flute-studio/viewer-fixes.css";
import "../../flute-studio/home-preview-cards.css";
import {LanguageProvider} from "../../flute-studio/i18n/LanguageContext";
import {PracticeAudioProvider} from "../../flute-studio/PracticeAudio";
import PracticeToolDock from "../../flute-studio/PracticeToolDock";
import StudioNavigation from "../../flute-studio/StudioNavigation";
import StudioCards from "./StudioCards";

export const metadata = {title: "Studio card styles | Lab"};
export default function Page(){return <LanguageProvider><PracticeAudioProvider><StudioNavigation/><div className="studio-route"><StudioCards/></div><PracticeToolDock/></PracticeAudioProvider></LanguageProvider>}
