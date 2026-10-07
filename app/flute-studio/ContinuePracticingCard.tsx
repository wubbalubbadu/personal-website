'use client';
import {usePrivateMusic} from './lib/privateMusic';
import Link from 'next/link';
import {musicLibrary as publicMusic,libraryShelf as publicShelf} from '../../content/music-library';
import {exerciseCatalog} from '../../content/exercise-catalog';
import {useStatusEntries} from './lib/musicStatus';
import {useRecents} from './lib/storage';
import {useLanguage} from './i18n/LanguageContext';

type ShelfItem={id:string;title:string;composer:string;viewerPath:string|null};

/** The existing shared shelf surface, with direct links to each saved score. */
export default function ContinuePracticingRow(){
  const privateMusic=usePrivateMusic();
  const {lang}=useLanguage(),zh=lang==='zh';
  const entries=useStatusEntries();
  const {ids}=useRecents('music',8);
  const catalog=new Map<string,ShelfItem>([...publicMusic,...publicShelf,...privateMusic.items,
    ...exerciseCatalog.map(item=>({id:item.id,title:zh?item.zhTitle:item.title,composer:zh?'练习':'Exercise',viewerPath:item.href})),
  ].map(item=>[item.id,item]));
  const resolve=(ids:string[])=>ids.map(id=>catalog.get(id)).filter((item):item is ShelfItem=>Boolean(item?.viewerPath));
  const columns=[
    {label:zh?'最近打开':'Last opened',tone:'sage',items:resolve(ids).slice(0,1),empty:zh?'还没有打开过曲目。':'No pieces opened yet.'},
    {label:zh?'正在练':'Working On',tone:'pink',items:resolve(entries.filter(e=>e.status==='working').map(e=>e.id)),empty:zh?'还没有正在练的曲目。':'No pieces marked Working On yet.'},
    {label:zh?'想学':'Want to Learn',tone:'green',items:resolve(entries.filter(e=>e.status==='want').map(e=>e.id)),empty:zh?'还没有想学的曲目。':'No pieces marked Want to Learn yet.'},
  ];
  return <div className="continue-panel home-shelf">
    {columns.map(column=><section className="continue-section home-shelf__column" key={column.label} aria-label={column.label}>
      <p><i className={`continue-dot tone-${column.tone}`} aria-hidden="true"/>{column.label}</p>
      {column.items.length?<ul>{column.items.map(item=><li key={item.id}>
        <Link href={item.viewerPath!}><b>{item.title}</b><small>{item.composer}</small></Link>
      </li>)}</ul>:<><small>{privateMusic.loading?(zh?'正在恢复曲目…':'Restoring your music…'):column.empty}</small><Link className="home-shelf__browse" href="/flute-studio/music">{zh?'浏览曲库':'Browse Library'}</Link></>}
    </section>)}
  </div>;
}
