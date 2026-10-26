import type {Metadata} from "next";
import ScaleStudio from "./ScaleStudio";

export const metadata:Metadata={title:"Scale Studio | Cookie Flute Studio",description:"Build any scale any way you like, with fingerings for every note."};
export default function ScalesPage(){return <ScaleStudio/>}
