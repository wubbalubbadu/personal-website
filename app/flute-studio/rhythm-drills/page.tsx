import type {Metadata} from 'next';
import RhythmGame from './RhythmGame';

export const metadata:Metadata={
  title:'Rhythm drills | Cookie Flute Studio',
  description:'Rhythms to tap at Easy, Medium or Hard, with bars from pieces in the Library.',
};

export default function Page(){return <RhythmGame/>}
