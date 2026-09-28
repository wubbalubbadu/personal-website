'use client';
import Link from 'next/link';
import {musicLibrary, libraryShelf} from '../../content/music-library';
import {useStatusEntries} from './lib/musicStatus';
import {readSessions} from './practice-data';
import {useLanguage} from './i18n/LanguageContext';

// One shared card, three sections — not three differently-tinted tiles.
// "Working on" is a portal into that list in the Library (there can be
// several pieces on it, so it doesn't jump into just one of them).
// "Continue practicing" still goes straight to the specific piece.
export default function ContinuePracticingRow(){
  const {t, lang} = useLanguage(), zh = lang === 'zh';
  const entries = useStatusEntries();
  // What you are working on; before anything is, what you want to learn.
  const list = entries.some(entry => entry.status === 'working') ? 'working' : 'want';
  const listIds = entries.filter(entry => entry.status === list).map(entry => entry.id);

  const sessions = readSessions().slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const recentId = sessions.map(session => session.itemId).find(id => musicLibrary.some(item => item.id === id));
  const recent = (recentId ? musicLibrary.find(item => item.id === recentId) : undefined)
    ?? musicLibrary.find(item => item.status === 'published');

  const savedItems = listIds.map(id => libraryShelf.find(item => item.id === id)).filter(item => !!item);

  return <div className="continue-panel">
    <Link className="continue-section" href={`/flute-studio/music?list=${list}`}>
      <p><i className="continue-dot tone-pink"/>{list === 'working' ? (zh ? '正在练' : 'Working on') : (zh ? '想学' : 'Want to learn')}</p>
      {savedItems.length
        ? <><b>{savedItems[0].title}</b><small>{zh ? `共 ${savedItems.length} 首` : `${savedItems.length} on this list`}</small></>
        : <><b>{zh ? '还没有内容' : 'Nothing on your lists yet'}</b><small>{zh ? '在曲库里点 +，加入想学。' : 'Tap + in the Library to add a piece.'}</small></>}
    </Link>
    <Link className="continue-section" href={recent?.viewerPath ?? '/flute-studio/music'}>
      <p><i className="continue-dot tone-green"/>{t.home.continuePracticing}</p>
      {recent && <><b>{recent.title}</b><small>{recent.composer}</small></>}
    </Link>
    <Link className="continue-section" href="/flute-studio/exercises/scales">
      <p><i className="continue-dot tone-sage"/>{t.home.suggestedExercise}</p>
      <b>{t.quickTools.scaleStudio}</b><small>{t.quickTools.exercisesDetail}</small>
    </Link>
  </div>;
}
