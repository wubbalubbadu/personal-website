import type {Metadata} from "next";
import FingeringChart from "./FingeringChart";

export const metadata:Metadata={
  title:"Fingering chart | Cookie Flute Studio",
  description:"Flute fingerings from low B up through the altissimo, with alternates.",
};
export default function FingeringsPage(){return <FingeringChart/>}
