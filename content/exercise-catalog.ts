/**
 * The one list of exercises in the studio.
 *
 * The Exercises hub and the Library's "Exercise" category used to keep
 * separate hand-written lists, which drifted: the hub advertised four
 * different scale rows and "Long Tones", the Library knew about one "Scale
 * Studio" and a "Long-tone Ladder", and neither agreed on what existed.
 * The Exercises hub renders this array, so an exercise is added, renamed,
 * or shipped exactly once.
 *
 * `focus` is what the hub groups and colours by. An entry with no `href`
 * is not built yet and renders as "Coming soon".
 */
export const exerciseFocuses=["technique","tone","breathing","articulation"] as const;
export type ExerciseFocus=typeof exerciseFocuses[number];

export type ExerciseEntry={
  id:string;
  focus:ExerciseFocus;
  title:string;
  zhTitle:string;
  /** The one-line subtitle in the hub — what the exercise is, not how long it takes. */
  detail:string;
  zhDetail:string;
  href:string|null;
  minutes:number;
  difficulty:"beginner"|"early-intermediate"|"intermediate"|"advanced";
  key:string;
  description:string;
  techniques:string[];
  /** Exercises that are a page rather than a score have no printable part. */
  scorePath?:string|null;
  /**
   * The one tool in the list rather than a single drill — it earns the
   * animated treatment in the hub. Keep this to a single entry; the effect
   * only reads as "this one is different" while it is rare.
   */
  featured?:boolean;
};

export const exerciseCatalog:readonly ExerciseEntry[]=[
  {
    id:"scale-studio",
    focus:"technique",
    title:"Scale Studio",
    zhTitle:"音阶工作室",
    detail:"Every scale in one place: major, minor, chromatic, whole tone and more",
    zhDetail:"所有音阶都在这里：大调、小调、半音阶、全音阶等",
    href:"/flute-studio/exercises/scales",
    minutes:10,
    difficulty:"beginner",
    key:"Any key",
    description:"Major, minor, chromatic, whole-tone, diminished and augmented scales, as scales, arpeggios, seconds, thirds or fourths, across four flute ranges.",
    techniques:["scales","articulation","range"],
    featured:true,
  },
  {
    id:"long-tones",
    focus:"tone",
    title:"Long tones",
    zhTitle:"长音",
    detail:"Held notes and De la sonorité, with live pitch feedback",
    zhDetail:"长音与音色练习，覆盖你自己的音域",
    href:"/flute-studio/exercises/long-tones",
    minutes:8,
    difficulty:"beginner",
    key:"C major",
    description:"A guided long-tone sequence for a centered sound and steady air.",
    techniques:["tone","air support","intonation"],
    featured:true,
  },
  {
    id:"extended-techniques",
    focus:"tone",
    title:"Extended Techniques",
    zhTitle:"特殊技巧",
    detail:"Flutter, harmonics, singing while playing",
    zhDetail:"花舌、泛音、边唱边吹",
    href:null,
    minutes:10,
    difficulty:"advanced",
    key:"Any key",
    description:"Flutter tonguing, harmonic series work, and singing while playing.",
    techniques:["flutter","harmonics","colour"],
  },
  {
    id:"breathing-lab",
    focus:"breathing",
    title:"Breathing Lab",
    zhTitle:"呼吸实验室",
    detail:"Diaphragmatic support and air control",
    zhDetail:"横膈膜支撑与气息控制",
    href:"/flute-studio/breathing",
    minutes:6,
    difficulty:"beginner",
    key:"No key",
    description:"Timed breathing sequences with a body view, for support and air control.",
    techniques:["breathing","air support"],
    scorePath:null,
    featured:true,
  },
  {
    id:"tonguing-drills",
    focus:"articulation",
    title:"Tonguing Drills",
    zhTitle:"吐音练习",
    detail:"Single, double, and triple tonguing",
    zhDetail:"单吐、双吐与三吐",
    href:null,
    minutes:10,
    difficulty:"early-intermediate",
    key:"Any key",
    description:"Speed and evenness drills for single, double, and triple tonguing.",
    techniques:["articulation","tonguing","speed"],
  },
];
