import {majorKeys,scaleBookMusicXML,scaleForms,keyForType,typeById,type ScaleTypeId,type ScaleFormId,type ScaleGroupSize} from '../scales/scale-score';
export type RoutineExercise={id:string;title:string;zh:string;family:string;type:ScaleTypeId;forms:ScaleFormId[];groups:ScaleGroupSize};
export const routine:RoutineExercise[]=[{id:'chromatic',title:'Chromatic scales',zh:'半音阶',family:'Warm-up',type:'chromatic',forms:['scale','seconds','thirds','fourths','fifths','sixths','sevenths','octaves'],groups:1}];
for(const [type,name,cn] of [['major','Major','大调'],['harmonic','Harmonic minor','和声小调'],['melodic','Melodic minor','旋律小调']] as const){
  for(const [form,groups,label,zh] of [['scale',1,'scales','音阶'],['scale',3,'scales in overlapping threes','三音递进音阶'],['thirds',1,'scales in thirds','三度'],['fourths',1,'scales in fourths','四度'],['sixths',1,'scales in sixths','六度']] as const){
    routine.push({id:`${type}-${form}-${groups}`,title:`${name} ${label}`,zh:`${cn}${zh}`,family:name,type,forms:[form],groups});
  }
}
for(const [type,name,cn] of [['major','Major','大调'],['natural','Minor','小调'],['diminished','Diminished','减'],['augmented','Augmented','增'],['majorSeventh','Major seventh','大七和弦'],['minorSeventh','Minor seventh','小七和弦']] as const){
  for(const [form,groups,label,zh] of [['arpeggio',1,'arpeggios','琶音'],['arpeggio',4,'arpeggios in overlapping fours','四音递进琶音'],['brokenArpeggio',1,'broken arpeggios','交错琶音']] as const){
    routine.push({id:`${type}-${form}-${groups}`,title:`${name} ${label}`,zh:`${cn}${zh}`,family:'Arpeggios',type,forms:[form],groups});
  }
}
export const routineSpan={low:59,high:98};
/** Generate one complete exercise across its keys, never the whole collection. */
export function routineBlocks(exercise:RoutineExercise){
  const keys=exercise.type==='chromatic'?majorKeys.slice(0,1):majorKeys;
  return keys.flatMap(key=>exercise.forms.map(form=>({
    key,type:exercise.type,form,
    label:exercise.type==='chromatic'
      ? 'Chromatic '+(scaleForms.find(f=>f.id===form)?.label??form)
      : keyForType(key,typeById(exercise.type)).label+' '+exercise.title
  })));
}
export function routineXML(exercise:RoutineExercise){
  return scaleBookMusicXML(routineBlocks(exercise),'custom',false,undefined,exercise.groups===3?'triplet':'even','hold','lowest',routineSpan,exercise.groups);
}
