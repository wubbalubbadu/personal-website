import type {Metadata} from "next";
import TrickyBitsPage from "./TrickyBitsPage";

export const metadata:Metadata={
  title:"Tricky bits | Cookie Flute Studio",
  description:"Hard bars from your pieces, with your tempos and reps.",
};

export default function Page(){
  return <TrickyBitsPage/>;
}
