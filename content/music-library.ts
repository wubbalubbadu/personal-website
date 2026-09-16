import mystery from "./mystery-of-love/metadata.json";
import gariboldi from "./gariboldi-etude-no-1/metadata.json";
import syrinx from "./syrinx/metadata.json";
import dejaVu from "./txt-deja-vu/metadata.json";
import ditto from "./ditto/metadata.json";
import goldDust from "./gold-dust/metadata.json";
import {exerciseAsMusicItem,exerciseCatalog} from "./exercise-catalog";

export const musicCategories=["all","exercise","repertoire","etude","pop"] as const;
export const difficultyLevels=["all","beginner","early-intermediate","intermediate","advanced"] as const;
export type MusicCategory=typeof musicCategories[number];
export type Difficulty=typeof difficultyLevels[number];
export type MusicItem={id:string;title:string;composer:string;category:Exclude<MusicCategory,"all">;difficulty:Exclude<Difficulty,"all">;key:string;estimatedMinutes:number;description:string;techniques:string[];status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null;pdfPath?:string;defaultTempo?:number};
// Exercises come from the shared catalog rather than their own metadata
// files, so the Library and the Exercises hub can never drift apart.
export const musicLibrary=[...exerciseCatalog.map(exerciseAsMusicItem),mystery,gariboldi,syrinx,dejaVu,ditto,goldDust] as MusicItem[];
