import type {Metadata} from "next";
import TendencyTest from "./TendencyTest";
import "../../exercises/exercises.css";
import "../../practice/practice-page.css";
import "./tendency.css";

export const metadata:Metadata={title:"Pitch tendency test | Cookie Flute Studio",description:"Find which notes you tend to play sharp or flat."};

export default function TendencyPage(){return <TendencyTest/>}
