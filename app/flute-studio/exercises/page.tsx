import type {Metadata} from "next";
import ExercisesHub from "./ExercisesHub";

export const metadata:Metadata={
  title:"Exercises | Cookie Flute Studio",
  description:"Focused flute exercises for scales, tone, and finger coordination.",
};

export default function ExercisesPage(){
  return <ExercisesHub/>;
}
