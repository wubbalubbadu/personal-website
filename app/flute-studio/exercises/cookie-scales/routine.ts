import {majorKeys,scaleBookMusicXML,scaleForms,scaleNotes,keyForType,typeById,type ScaleTypeId,type ScaleFormId,type ScaleGroupSize} from '../scales/scale-score';
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
/**
 * Generate one complete exercise across its keys, never the whole collection.
 *
 * The book starts every key on the lowest note in range, so the symmetric chords print the same music under several
 * names: a diminished seventh is the same four notes from C, E♭, F♯ or A, an augmented triad the same three from C,
 * E and G♯. Each distinct one is kept once (at the first key that produces it) and named after every key it covers,
 * "C / E♭ / F♯ / A Diminished arpeggios", so nothing looks missing. Scale Studio is untouched by this.
 */
export function routineBlocks(exercise:RoutineExercise){
  const keys=exercise.type==='chromatic'?majorKeys.slice(0,1):majorKeys;
  const name=(key:(typeof majorKeys)[number])=>keyForType(key,typeById(exercise.type)).label;
  return exercise.forms.flatMap(form=>{
    const groups=new Map<string,(typeof majorKeys)[number][]>();
    for(const key of keys){
      const notes=scaleNotes(key,'custom',exercise.type,form,'hold','lowest',routineSpan,exercise.groups).map(n=>n.midi).join(',');
      const same=groups.get(notes);if(same)same.push(key);else groups.set(notes,[key]);
    }
    return [...groups.values()].map(covered=>({
      key:covered[0],type:exercise.type,form,
      // Only the key is capitalised, the way scales are named in print: "C harmonic minor scales", "chromatic seconds".
      label:exercise.type==='chromatic'
        ? 'Chromatic '+(scaleForms.find(f=>f.id===form)?.label??form).toLowerCase()
        : covered.map(name).join(' / ')+' '+exercise.title[0].toLowerCase()+exercise.title.slice(1)
    }));
  }).sort((a,b)=>keys.indexOf(a.key)-keys.indexOf(b.key)||exercise.forms.indexOf(a.form)-exercise.forms.indexOf(b.form));
}
export function routineXML(exercise:RoutineExercise){
  return scaleBookMusicXML(routineBlocks(exercise),'custom',false,undefined,exercise.groups===3?'triplet':'even','hold','lowest',routineSpan,exercise.groups);
}
