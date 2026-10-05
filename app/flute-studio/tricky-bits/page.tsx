import type {Metadata} from "next";
import TrickyBitsPage from "./TrickyBitsPage";

export const metadata:Metadata={
  title:"Tricky bits | Cookie Flute Studio",
  description:"Passages you are drilling, with tempos and repetitions.",
};

export default function Page(){
  return <TrickyBitsPage/>;
}
