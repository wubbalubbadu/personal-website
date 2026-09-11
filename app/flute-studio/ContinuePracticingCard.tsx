'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {musicLibrary} from '../../content/music-library';
import {readSessions} from './practice-data';
import {useLanguage} from './i18n/LanguageContext';

// One shared card, three sections — not three differently-tinted tiles.
// "Saved" is a portal into the library's saved filter (there can be several
// saved pieces, so it doesn't make sense to jump into just one of them).
// "Continue practicing" still goes straight to the specific piece.
export default function ContinuePracticingRow(){
  const {t} = useLanguage();
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    const update = () => {
      const saved = localStorage.getItem('cookie:music-favorites');
      setFavorites(saved ? JSON.parse(saved) : []);
    };
    update();
    window.addEventListener('cookie:favorites-updated', update);
    return () => window.removeEventListener('cookie:favorites-updated', update);
  }, []);

  const sessions = readSessions().slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const recentId = sessions.map(session => session.itemId).find(id => musicLibrary.some(item => item.id === id));
  const recent = (recentId ? musicLibrary.find(item => item.id === recentId) : undefined)
    ?? musicLibrary.find(item => item.status === 'published');

  const savedItems = musicLibrary.filter(item => favorites.includes(item.id));

  return <div className="continue-panel">
    <Link className="continue-section" href="/flute-studio/music?favorites=1">
      <p><i className="continue-dot tone-pink"/>{t.home.savedLabel}</p>
      {savedItems.length
        ? <><b>{savedItems[0].title}</b><small>{t.home.savedCount(savedItems.length)}</small></>
        : <><b>{t.home.noSavedYet}</b><small>{t.home.noSavedYetDetail}</small></>}
    </Link>
    <Link className="continue-section" href={recent?.viewerPath ?? '/flute-studio/music'}>
      <p><i className="continue-dot tone-green"/>{t.home.continuePracticing}</p>
      {recent && <><b>{recent.title}</b><small>{recent.composer}</small></>}
    </Link>
    <Link className="continue-section" href="/flute-studio/exercises/scales">
      <p><i className="continue-dot tone-sage"/>{t.home.suggestedExercise}</p>
      <b>{t.exercises.scaleStudioTitle}</b><small>{t.exercises.scaleStudioDetail}</small>
    </Link>
  </div>;
}
