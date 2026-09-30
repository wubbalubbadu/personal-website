"use client";
/** Shared key chips and All/Clear actions used by Customize Scales and exercise books. */
export function KeySelection({options,selected,onChange,zh=false}:{options:{id:string;label:string}[];selected:string[];onChange:(keys:string[])=>void;zh?:boolean}){
 return <><div className="scale-book__key-actions"><button type="button" onClick={()=>onChange(options.map(k=>k.id))}>{zh?"全部":"All keys"}</button><button type="button" onClick={()=>onChange([])}>{zh?"清除":"Clear"}</button></div><div className="scale-book__keys">{options.map(k=><button type="button" key={k.id} className={selected.includes(k.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={selected.includes(k.id)} onClick={()=>onChange(selected.includes(k.id)?selected.filter(id=>id!==k.id):[...selected,k.id])}>{k.label}</button>)}</div></>;
}
