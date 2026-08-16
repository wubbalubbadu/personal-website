import type { Metadata } from "next";
import "./studio-shared.css";
import "./studio-overrides.css";
import FloatingPracticeTools from "./FloatingPracticeTools";

export const metadata: Metadata = {title:"Cookie Flute Studio",description:"An all-in-one flute music viewer and practice helper with playback, drones, fingering, rhythm tools, and teaching markup."};

export default function FluteStudioLayout({children}:{children:React.ReactNode}){return <>{children}<FloatingPracticeTools/></>}
