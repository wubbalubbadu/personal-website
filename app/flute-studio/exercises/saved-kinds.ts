import type {SavedExercise} from "../lib/savedExercises";
import {describeSet,type ScaleSetConfig} from "./scales/saved-sets";

/**
 * What each kind of saved exercise needs outside its own page: where it opens and its one-line summary. Adding a
 * saveable exercise (long tones next) means a row here plus its save button; the hub, Home and My Studio then list it.
 * A kind with no row here is skipped, so a set saved by a newer version never shows as a broken link.
 */
const KINDS:Partial<Record<SavedExercise["kind"],{href:(id:string)=>string;describe:(config:unknown,zh:boolean)=>string}>>={
  scales:{href:id=>`/flute-studio/exercises/scales?set=${encodeURIComponent(id)}`,describe:(config,zh)=>describeSet(config as ScaleSetConfig,zh)},
};

export const savedHref=(item:SavedExercise)=>KINDS[item.kind]?.href(item.id)??null;
export const describeSaved=(item:SavedExercise,zh:boolean)=>KINDS[item.kind]?.describe(item.config,zh)??"";
export const canOpen=(item:SavedExercise)=>!!KINDS[item.kind];
