import type { Metadata } from 'next';
import TrillChart from './TrillChart';
export const metadata: Metadata = {
  title: 'Trill chart | Cookie Flute Studio',
  description: 'Flute trills across four octaves with engraved notation, half-step and whole-step fingerings, and animated key movement.',
};
export default function TrillsPage() { return <TrillChart/>; }
