"use client";

import {ScoreViewer,type ScoreViewerConfig} from "../../music/mystery-of-love/page";

const cMajor=["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","B5","A5","G5","F5","E5","D5","C5","B4","A4","G4","F4","E4","D4","C4"];
const gMajor=["G4","A4","B4","C5","D5","E5","F♯5","G5","A5","B5","C6","D6","E6","F♯6","G6","F♯6","E6","D6","C6","B5","A5","G5","F♯5","E5","D5","C5","B4","A4","G4"];
const pitches=[...cMajor,...gMajor];
const measureStarts=[0,8,16,24,29,37,45,53];
const scaleConfig:ScoreViewerConfig={title:"Major Scales",asset:"/scales-flute.mxl",id:"scale-studio",backHref:"/flute-studio/exercises",pitches,measureStarts,events:pitches.map((p,index)=>({p,d:measureStarts.includes(index+1)||index===0||index===29?4:2}))};

export default function ScaleStudio(){return <ScoreViewer config={scaleConfig}/>}
