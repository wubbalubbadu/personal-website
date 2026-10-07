'use client';
import {useLanguage} from '../i18n/LanguageContext';
import {noteName} from './poses';
import {StaffNote as SharedStaffNote} from '../components/StaffNote';

// The drawing itself now lives in components/StaffNote so the fingering
// chart can share it; this keeps the embouchure page's own call signature
// and its note naming.
export default function StaffNote({midi}: {midi: number}) {
  const {lang}=useLanguage();
  return <SharedStaffNote midi={midi} label={lang==="zh"?`高音谱表上的 ${noteName(midi)}`:`${noteName(midi)} on treble staff`}/>;
}
