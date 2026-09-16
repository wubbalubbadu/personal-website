import type {Metadata} from "next";
import FingeringChart from "./FingeringChart";

export const metadata:Metadata={
  title:"Fingering chart | Cookie Flute Studio",
  description:"Standard flute fingerings from low B through the altissimo, with alternates.",
};
export default function FingeringsPage(){return <FingeringChart/>}
