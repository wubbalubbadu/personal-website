import type {Metadata} from 'next';
import BreathingLab from './BreathingLab';
export const metadata:Metadata={title:'Breathing Lab | Cookie Flute Studio',description:'Guided breathing at a pace you set.'};
export default function Page(){return <BreathingLab/>}
