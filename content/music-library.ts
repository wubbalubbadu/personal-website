import catalog from "./music-catalog.json";

export const musicCategories=["all","simple","pop","repertoire","etude","excerpt"] as const;
export type MusicCategory=typeof musicCategories[number];
export type MusicItem={id:string;title:string;composer:string;category:Exclude<MusicCategory,"all">;status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null;pdfPath?:string;defaultTempo?:number;fullScorePath?:string;readingPartId?:string;partCount?:number};
// Practice tools and drills live in Exercises. The Library is reserved for
// music a student can learn and perform.
export const musicLibrary=catalog as MusicItem[];
