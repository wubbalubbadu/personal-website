// The real studio chrome (nav, tools dock, audio), so the prototype is judged
// as a page of the app and the tool buttons actually open the dock.
import "../../flute-studio/studio-tokens.css";
import "../../flute-studio/studio-shared.css";
import "../../flute-studio/ios-theme.css";
import "../../flute-studio/studio-shell.css";
import "../../flute-studio/viewer-fixes.css";
import "../../flute-studio/home-preview-cards.css";
import "../../flute-studio/music/library.css";
import {LanguageProvider} from "../../flute-studio/i18n/LanguageContext";
import {PracticeAudioProvider} from "../../flute-studio/PracticeAudio";
import PracticeToolDock from "../../flute-studio/PracticeToolDock";
import StudioNavigation from "../../flute-studio/StudioNavigation";
import HomeTool from "./HomeTool";

export const metadata = {title: "Studio home as a tool | Lab"};
export default function Page(){return <LanguageProvider><PracticeAudioProvider><StudioNavigation/><div className="studio-route"><HomeTool/></div><PracticeToolDock/></PracticeAudioProvider></LanguageProvider>}
