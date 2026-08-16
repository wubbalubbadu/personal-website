import mystery from "./mystery-of-love/metadata.json";
import longTones from "./long-tone-ladder/metadata.json";
import chromatic from "./chromatic-thirds/metadata.json";
import gariboldi from "./gariboldi-etude-no-1/metadata.json";
import taffanel from "./taffanel-gaubert-no-1/metadata.json";
import syrinx from "./syrinx/metadata.json";
import scales from "./scale-studio/metadata.json";

export const musicCategories=["all","exercise","repertoire","etude","method","warm-up"] as const;
export const difficultyLevels=["all","beginner","early-intermediate","intermediate","advanced"] as const;
export type MusicCategory=typeof musicCategories[number];
export type Difficulty=typeof difficultyLevels[number];
export type MusicItem={id:string;title:string;composer:string;category:Exclude<MusicCategory,"all">;difficulty:Exclude<Difficulty,"all">;key:string;estimatedMinutes:number;description:string;techniques:string[];status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null};
export const musicLibrary=[scales,mystery,longTones,chromatic,gariboldi,taffanel,syrinx] as MusicItem[];
