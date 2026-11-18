"use client";
/** Shared key chips and All/Clear actions used by Customize Scales and exercise books.
 *  Give options a `group` (Major, Minor) to label rows: without it a book's keys repeat letters with no way to tell
 *  C major from C minor. Styles: key-grid.css. */
export function KeySelection({options,selected,onChange,zh=false}:{options:readonly {id:string;label:string;group?:string}[];selected:string[];onChange:(keys:string[])=>void;zh?:boolean}){
 const toggle=(id:string)=>onChange(selected.includes(id)?selected.filter(k=>k!==id):[...selected,id]);
 const keys=(list:readonly {id:string;label:string}[],label?:string)=><div className="scale-book__keys key-grid" role="group" aria-label={label}>{list.map(k=><button type="button" key={k.id} className={selected.includes(k.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={selected.includes(k.id)} onClick={()=>toggle(k.id)}>{k.label}</button>)}</div>;
 const groups=[...new Set(options.map(o=>o.group).filter((g):g is string=>!!g))];
 return <><div className="scale-book__key-actions"><button type="button" onClick={()=>onChange(options.map(k=>k.id))}>{zh?"全部":"All keys"}</button><button type="button" onClick={()=>onChange([])}>{zh?"清除":"Clear"}</button></div>
  {groups.length>1?groups.map(g=><div key={g}><p className="key-grid__label">{g}</p>{keys(options.filter(o=>o.group===g),g)}</div>):keys(options)}</>;
}
