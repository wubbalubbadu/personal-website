"use client";

import { ScoreViewer, type ScoreViewerConfig } from "../../components/ScoreViewer";

const scorePhrase = ["B4","G4","B4","A4","G4","G4","E4","D4",null,"E4","F♯4","G4","D5","B4","A4"];
const mysteryScoreSequence = Array.from({length:4},()=>scorePhrase).flat();
const eventPhrase = [{p:"B4",d:6},{p:"G4",d:2},{p:"B4",d:2},{p:"A4",d:1},{p:"G4",d:1},{p:"G4",d:2},{p:"E4",d:2},{p:"D4",d:12},{p:null,d:4},{p:"E4",d:4},{p:"F♯4",d:4},{p:"G4",d:4},{p:"D5",d:4},{p:"B4",d:8},{p:"A4",d:8}];
const mysteryScoreEvents = Array.from({length:4},()=>eventPhrase).flat();
const mysteryMeasureStarts = Array.from({length:4},(_,group)=>[0,7,9,13].map(index=>index+group*15)).flat();
const mysteryConfig:ScoreViewerConfig={title:"Mystery of Love",composer:"Sufjan Stevens",asset:"/mystery-of-love.mxl",id:"mystery-of-love",backHref:"/flute-studio/music",pitches:mysteryScoreSequence,events:mysteryScoreEvents,measureStarts:mysteryMeasureStarts};

export default function MysteryOfLovePage(){return <ScoreViewer config={mysteryConfig}/>}
