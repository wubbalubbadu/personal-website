import type {Metadata} from 'next';
import RhythmGame from './RhythmGame';

export const metadata:Metadata={
  title:'Rhythm drills | Cookie Flute Studio',
  description:'Endless rhythms to tap, getting harder as you go, with bars from pieces in the Library.',
};

export default function Page(){return <RhythmGame/>}
