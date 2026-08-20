import type {Metadata} from "next";
import Link from "next/link";
import "./exercises.css";

export const metadata:Metadata={
  title:"Exercises | Cookie Flute Studio",
  description:"Focused flute exercises for scales, tone, and finger coordination.",
};

type Exercise={
  title:string;
  description:string;
  detail:string;
  icon:string;
  tone:"cactus"|"pink"|"slate";
  href?:string;
  action:string;
};

const exercises:readonly Exercise[]=[
  {
    title:"Scale Studio",
    description:"Build major and minor scales for the key, range, and articulation you need.",
    detail:"Scales · 10 min",
    icon:"◎",
    tone:"cactus",
    href:"/flute-studio/exercises/scales",
    action:"Open",
  },
  {
    title:"Long-tone Ladder",
    description:"Develop a centered sound with steady air and guided pitch changes.",
    detail:"Tone · 8 min",
    icon:"◌",
    tone:"pink",
    action:"Coming soon",
  },
  {
    title:"Chromatic Thirds",
    description:"Coordinate fingers and train interval recognition with short chromatic patterns.",
    detail:"Technique · 10 min",
    icon:"♩",
    tone:"slate",
    action:"Coming soon",
  },
];

function ExerciseContent({exercise}:{exercise:typeof exercises[number]}){
  return <>
    <span className={`exercise-hub__icon exercise-hub__icon--${exercise.tone}`} aria-hidden="true">{exercise.icon}</span>
    <span className="exercise-hub__copy">
      <strong>{exercise.title}</strong>
      <span>{exercise.description}</span>
      <small>{exercise.detail}</small>
    </span>
    <span className={exercise.href?"exercise-hub__action":"exercise-hub__action exercise-hub__action--muted"}>{exercise.action}</span>
  </>;
}

export default function ExercisesPage(){
  return <main className="exercise-hub">
      <div className="exercise-hub__content">
        <header className="exercise-hub__header">
          <p>Practice tools</p>
          <div>
            <h1>Exercises</h1>
            <span>3 focused studies</span>
          </div>
          <p className="exercise-hub__intro">Choose one area to work on. Each exercise keeps the setup short so you can spend more time playing.</p>
        </header>

        <section className="exercise-hub__section" aria-labelledby="exercise-focus-title">
          <div className="exercise-hub__section-heading">
            <div>
              <h2 id="exercise-focus-title">Choose a focus</h2>
              <p>Technique, tone, and coordination in one place.</p>
            </div>
          </div>
          <div className="exercise-hub__list">
            {exercises.map(exercise=>exercise.href?
              <Link className="exercise-hub__row exercise-hub__row--available" href={exercise.href} key={exercise.title}>
                <ExerciseContent exercise={exercise}/>
              </Link>:
              <article className="exercise-hub__row" key={exercise.title}>
                <ExerciseContent exercise={exercise}/>
              </article>
            )}
          </div>
        </section>
      </div>
    </main>;
}
