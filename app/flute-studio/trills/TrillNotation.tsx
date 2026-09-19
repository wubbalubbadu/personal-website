'use client';
import { EngravedNote } from '../components/EngravedNote';
export default function TrillNotation({base,upper}:{base:string;upper:string}) {
  return <div className="trill-notation"><EngravedNote pitch={base} auxiliary={upper} width={190}/></div>;
}
