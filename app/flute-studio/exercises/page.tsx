import type {Metadata} from "next";
import ExercisesHub from "./ExercisesHub";

export const metadata:Metadata={
  title:"Exercises | Cookie Flute Studio",
  description:"Scales, long tones and breathing for flute, plus the hard bars you saved.",
};

export default function ExercisesPage(){
  return <ExercisesHub/>;
}
