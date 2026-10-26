'use client';
import {useSyncExternalStore} from 'react';
import {bookPath,bookPieces,musicBooks,musicLibrary,type MusicItem} from '../../../content/music-library';

/**
 * Music kept on this device, so it opens without Wi-Fi (the iPad on a stand with no signal).
 *
 * The page does the keeping, straight into the Cache API; public/flute-studio-sw.js only serves from those caches.
 * What one "Keep offline" stores:
 * - the piece's page and its files (MusicXML, printed pages, PDF) in the music cache, counted as the piece's size;
 * - the app's code for those pages (found by following every /_next/static file the page names, and the files those
 *   name) plus the Home and Library pages, in the shell cache, shared by everything kept.
 * Markup, lists and practice history already live in localStorage, so they are there offline without doing anything.
 *
 * A book is kept whole, as one entry. A private piece is kept as the encrypted library file, which is useless
 * without the access code; locking private music removes it (lib/privateMusic.ts).
 *
 * The list of kept music is device-only (lib/transfer.ts leaves it out): a code sent to another device carries no
 * files, so the other device would wrongly show music as kept.
 */
export const SHELL_CACHE='cookie-offline-shell-v1',MUSIC_CACHE='cookie-offline-music-v1';
const KEY='cookie:offline-music:v1',BUILD_KEY='cookie:offline-music:build',UPDATED='cookie:offline-music';
const PRIVATE_FILE='/private-music/library.enc.json';
const SHELL_PAGES=['/flute-studio','/flute-studio/music'];

export type OfflineEntry={at:number;bytes:number;urls:string[];title:string;zhTitle?:string;private?:boolean;pieces?:string[]};
type State={entries:Record<string,OfflineEntry>;busy:string[];failed:string[]};

let raw='',parsed:Record<string,OfflineEntry>={},busy:string[]=[],failed:string[]=[],state:State={entries:{},busy:[],failed:[]};
const listeners=new Set<()=>void>();
const emptyState:State={entries:{},busy:[],failed:[]};
function readEntries(){
  try{
    const next=localStorage.getItem(KEY)??'';
    if(next!==raw){raw=next;parsed=next?JSON.parse(next) as Record<string,OfflineEntry>:{}}
  }catch{parsed={}}
  return parsed;
}
function snapshot(){
  const entries=readEntries();
  if(entries!==state.entries||busy!==state.busy||failed!==state.failed)state={entries,busy,failed};
  return state;
}
function notify(){listeners.forEach(fn=>fn())}
function subscribe(fn:()=>void){
  listeners.add(fn);
  const onStorage=(event:StorageEvent)=>{if(event.key===KEY)fn()};
  window.addEventListener('storage',onStorage);window.addEventListener(UPDATED,fn);
  return ()=>{listeners.delete(fn);window.removeEventListener('storage',onStorage);window.removeEventListener(UPDATED,fn)};
}
function writeEntries(entries:Record<string,OfflineEntry>){
  try{localStorage.setItem(KEY,JSON.stringify(entries));window.dispatchEvent(new Event(UPDATED))}catch{/* storage may be full or disabled */}
}
const setBusy=(id:string,on:boolean)=>{busy=on?[...busy.filter(x=>x!==id),id]:busy.filter(x=>x!==id);if(on)failed=failed.filter(x=>x!==id);notify()};
const setFailed=(id:string)=>{failed=[...failed.filter(x=>x!==id),id];notify()};

/** Kept music, which ids are being saved, and which failed. Empty on the server and the first render. */
export function useOfflineMusic():State{return useSyncExternalStore(subscribe,snapshot,()=>emptyState)}
/** Whether a piece opens offline: kept itself, or inside a kept book. */
export function keptEntry(entries:Record<string,OfflineEntry>,id:string){
  return entries[id]?{id,entry:entries[id]}:Object.entries(entries).map(([key,entry])=>({id:key,entry})).find(({entry})=>entry.pieces?.includes(id))??null;
}

/** Whether this browser can keep music offline here: a service worker and the Cache API, on the published site. */
export function offlineSupport():'yes'|'unsupported'|'dev'{
  if(typeof window==='undefined')return 'unsupported';
  if(!('serviceWorker' in navigator)||!('caches' in window))return 'unsupported';
  return process.env.NODE_ENV==='production'?'yes':'dev';
}
export function registerOfflineWorker(){
  if(offlineSupport()!=='yes')return;
  void navigator.serviceWorker.register('/flute-studio-sw.js',{scope:'/flute-studio'}).catch(()=>{});
}

/** What can be kept: a score in the Library, a book, or a numbered piece in one. Exercises are built in code, not files. */
export function offlineTarget(id:string,privateItems:MusicItem[]=[]):{id:string;items:MusicItem[];pages:string[];title:string;zhTitle?:string;private?:boolean}|null{
  const book=musicBooks.find(entry=>entry.id===id);
  if(book)return {id,items:bookPieces(id),pages:[bookPath(id)],title:book.title};
  const item=[...musicLibrary,...privateItems].find(entry=>entry.id===id);
  if(!item||(!item.scorePath&&!item.excerpt))return null;
  return {id,items:[item],pages:[],title:item.title,zhTitle:item.zhTitle,private:item.private};
}

const local=(url:string|null|undefined)=>url&&url.startsWith('/')?url:null;
function pieceFiles(item:MusicItem){
  if(item.private)return [PRIVATE_FILE];
  const passages=item.excerpt?.passages??[];
  return [item.scorePath,item.fullScorePath,item.pdfPath,...(item.excerpt?.pages??[]).map(page=>page.src),
    ...passages.flatMap(passage=>[passage.scorePath,...passage.pages.map(page=>page.src)])].map(local).filter((url):url is string=>!!url);
}
const pagePath=(item:MusicItem)=>item.viewerPath??`/flute-studio/music/${item.id}`;
const unique=<T,>(list:T[])=>[...new Set(list)];

/** Every /_next/static file a page needs, following the files each one names (JS imports, CSS url()). */
const ASSET=/\/?_next\/static\/[\w\-./]+?\.(?:js|mjs|css|woff2?|ttf|otf|png|svg|jpe?g|webp|gif|json)/g;
async function crawl(htmls:string[]){
  const seen=new Set<string>(),queue:string[]=[];
  const add=(url:string)=>{const path=new URL(url,location.origin).pathname;if(path.startsWith('/_next/static/')&&!seen.has(path)){seen.add(path);queue.push(path)}};
  for(const html of htmls)for(const match of html.matchAll(ASSET))add('/'+match[0].replace(/^\//,''));
  for(const entry of performance.getEntriesByType('resource'))add(entry.name);
  while(queue.length&&seen.size<1500){
    const path=queue.shift()!;
    if(!/\.(js|mjs|css)$/.test(path))continue;
    const response=await fetchKept(path);
    if(!response)continue;
    const text=await response.text();
    for(const match of text.matchAll(ASSET))add('/'+match[0].replace(/^\//,''));
    for(const match of text.matchAll(/["'](\.\.?\/[\w\-./]+\.(?:js|mjs|css))["']/g))add(new URL(match[1],location.origin+path).pathname);
    for(const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g))if(!match[1].startsWith('data:'))add(new URL(match[1],location.origin+path).pathname);
  }
  return [...seen];
}
/** A file from the shell cache, else the network (stored on the way). Content-hashed, so a cached copy is current. */
async function fetchKept(path:string){
  const shell=await caches.open(SHELL_CACHE);
  const hit=await shell.match(path);
  if(hit)return hit;
  try{
    const response=await fetch(path,{credentials:'same-origin'});
    if(!response.ok)return null;
    await shell.put(path,response.clone());
    return response;
  }catch{return null}
}
async function fetchPage(path:string){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok||!(response.headers.get('content-type')??'').includes('text/html'))throw new Error(`page ${path}`);
  return response;
}
/** Which release a page comes from: the code files it names change (by content hash) with every publish. */
function buildOf(html:string){
  const files=[...new Set([...html.matchAll(ASSET)].map(match=>match[0]))].sort().join(' ');
  let hash=2166136261;
  for(let i=0;i<files.length;i++){hash^=files.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return (hash>>>0).toString(36);
}

/** The app shell: Home and Library pages, the given pages' code, and any instrument samples this visit already used. */
async function keepShell(pageHtmls:string[]){
  const shell=await caches.open(SHELL_CACHE);
  const htmls=[...pageHtmls];
  for(const path of SHELL_PAGES){
    const response=await fetchPage(path);
    const text=await response.clone().text();
    htmls.push(text);
    await shell.put(location.origin+path,response);
    if(path==='/flute-studio')try{localStorage.setItem(BUILD_KEY,buildOf(text))}catch{/* optional */}
  }
  const assets=await crawl(htmls);
  for(const entry of performance.getEntriesByType('resource')){const url=new URL(entry.name);if(url.origin===location.origin&&url.pathname.startsWith('/audio/')&&!(await shell.match(url.pathname)))try{const r=await fetch(url.pathname);if(r.ok)await shell.put(url.pathname,r)}catch{/* a sample can load later */}}
  return assets;
}

/** Keeps one piece or book (by id) on this device. Resolves true when everything it needs is stored. */
export async function keepOffline(id:string,privateItems:MusicItem[]=[]){
  const target=offlineTarget(id,privateItems);
  if(!target||offlineSupport()!=='yes')return false;
  setBusy(id,true);
  try{
    registerOfflineWorker();
    await navigator.serviceWorker.ready;
    const music=await caches.open(MUSIC_CACHE);
    const pages=unique([...target.pages,...target.items.map(pagePath)]);
    const htmls:string[]=[];
    let bytes=0;
    for(const path of pages){
      const response=await fetchPage(path);
      const text=await response.clone().text();
      htmls.push(text);bytes+=text.length;
      await music.put(location.origin+path,response);
    }
    const files=unique(target.items.flatMap(pieceFiles));
    for(const file of files){
      const response=await fetch(file,{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw new Error(`file ${file}`);
      bytes+=(await response.clone().blob()).size;
      await music.put(location.origin+file,response);
    }
    await keepShell(htmls);
    const entries={...readEntries()};
    entries[id]={at:Date.now(),bytes,urls:[...pages,...files],title:target.title,...(target.zhTitle?{zhTitle:target.zhTitle}:{}),...(target.private?{private:true}:{}),...(target.pages.length?{pieces:target.items.map(item=>item.id)}:{})};
    writeEntries(entries);
    return true;
  }catch{
    setFailed(id);
    return false;
  }finally{setBusy(id,false)}
}

/** Removes kept music from this device. Files another kept piece still uses stay; with nothing left, so does the app. */
export async function removeOffline(ids:string[]){
  const entries={...readEntries()};
  const removing=ids.filter(id=>entries[id]);
  if(!removing.length)return;
  const gone=new Set(removing.flatMap(id=>entries[id].urls));
  removing.forEach(id=>delete entries[id]);
  Object.values(entries).forEach(entry=>entry.urls.forEach(url=>gone.delete(url)));
  writeEntries(entries);
  if(!('caches' in window))return;
  if(!Object.keys(entries).length){await caches.delete(MUSIC_CACHE);await caches.delete(SHELL_CACHE);return}
  const music=await caches.open(MUSIC_CACHE);
  for(const url of gone)await music.delete(location.origin+url);
}
/** Locking private music takes its kept copies off this device too. */
export function removePrivateOffline(){
  const entries=readEntries();
  return removeOffline(Object.keys(entries).filter(id=>entries[id].private));
}

/** Bytes the app's own files take (the part every kept piece shares). */
export async function shellBytes(){
  if(!('caches' in window)||!(await caches.has(SHELL_CACHE)))return 0;
  const shell=await caches.open(SHELL_CACHE);
  let total=0;
  for(const request of await shell.keys()){const response=await shell.match(request);if(response)total+=(await response.blob()).size}
  return total;
}

/**
 * After the site is published again the pages name new code files, so kept pages are fetched again (with their new
 * code) while the device is online, and the old code is dropped. Runs at most once per visit.
 */
let refreshed=false;
export async function refreshOfflineIfStale(privateItems:MusicItem[]=[]){
  if(refreshed||offlineSupport()!=='yes'||!navigator.onLine)return;
  const entries=readEntries();
  if(!Object.keys(entries).length)return;
  refreshed=true;
  try{
    const html=await (await fetchPage('/flute-studio')).text();
    let stored='';try{stored=localStorage.getItem(BUILD_KEY)??''}catch{/* optional */}
    if(buildOf(html)===stored)return;
    for(const id of Object.keys(entries)){
      if(entries[id].private&&!privateItems.length)continue;
      await keepOffline(id,privateItems);
    }
    // Keep only the code the stored pages name now. Pages merely visited (not kept) go, since they name old code.
    const shell=await caches.open(SHELL_CACHE),music=await caches.open(MUSIC_CACHE);
    const htmls:string[]=[];
    for(const request of await shell.keys()){
      const path=new URL(request.url).pathname;
      if(path.startsWith('/flute-studio')){if(SHELL_PAGES.includes(path))htmls.push(await (await shell.match(request))!.text());else await shell.delete(request)}
    }
    for(const request of await music.keys()){const response=await music.match(request);if(response&&(response.headers.get('content-type')??'').includes('text/html'))htmls.push(await response.text())}
    const current=new Set(await crawl(htmls));
    for(const request of await shell.keys()){const path=new URL(request.url).pathname;if(path.startsWith('/_next/static/')&&!current.has(path))await shell.delete(request)}
  }catch{/* try again next visit */refreshed=false}
}
