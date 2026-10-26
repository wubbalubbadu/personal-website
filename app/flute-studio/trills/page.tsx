import type { Metadata } from 'next';
import TrillChart from './TrillChart';
export const metadata: Metadata = {
  title: 'Trill chart | Cookie Flute Studio',
  description: 'Flute trill fingerings across four octaves, with the moving keys shown.',
};
export default function TrillsPage() { return <TrillChart/>; }
