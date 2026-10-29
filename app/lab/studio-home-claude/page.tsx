import {LanguageProvider} from "../../flute-studio/i18n/LanguageContext";
import HomeIndex from "./HomeIndex";

export const metadata = {title: "Studio home, contents page | Lab"};
// LanguageProvider is needed: BreathingPreview's Sequence reads it.
export default function Page(){return <LanguageProvider><HomeIndex/></LanguageProvider>}
