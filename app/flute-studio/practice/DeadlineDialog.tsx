"use client";
import {Dialog} from "../components/Dialog";
import {useState} from "react";
import {SuggestField,type SuggestItem} from "./SuggestField";
import {PracticeIcon} from "../components/PracticeIcon";
import {deleteDeadline,localDay,saveDeadline,type Deadline} from "../lib/deadlines";
import {type MusicStatus} from "../lib/musicStatus";

/**
 * Make or change a deadline: a name, a day, and the pieces it needs, picked from the Library.
 * Nothing is saved until Save, so closing is always safe. Not a <form>: the piece finder is its own form inside.
 */
export function DeadlineDialog({deadline,pieces,statuses,zh,onClose}:{
  deadline:Deadline|null;pieces:SuggestItem[];statuses:Record<string,MusicStatus>;zh:boolean;onClose:()=>void;
}){
  const [name,setName]=useState(deadline?.name??""),[date,setDate]=useState(deadline?.date??"");
  const [chosen,setChosen]=useState<string[]>(deadline?.pieces??[]),[query,setQuery]=useState(""),[error,setError]=useState("");
  const byId=new Map(pieces.map(item=>[item.id,item]));
  const text=zh
    ?{title:deadline?"编辑截止日期":"新的截止日期",name:"名称",namePlaceholder:"乐团考试",date:"日期",pieces:"曲目",find:"从曲库添加曲目",add:"添加",remove:"移除",save:"保存",cancel:"取消",delete:"删除",needName:"请输入名称。",needDate:"请选择日期。"}
    :{title:deadline?"Edit deadline":"New deadline",name:"Name",namePlaceholder:"Orchestra audition",date:"Day",pieces:"Pieces",find:"Add a piece from the Library",add:"Add",remove:"Remove",save:"Save",cancel:"Cancel",delete:"Delete",needName:"Give it a name.",needDate:"Pick a day."};
  function save(){
    if(!name.trim()){setError(text.needName);return}
    if(!date){setError(text.needDate);return}
    saveDeadline({id:deadline?.id??crypto.randomUUID(),name:name.trim(),date,pieces:chosen},statuses);
    onClose();
  }
  const add=(item:SuggestItem)=>{setChosen(list=>list.includes(item.id)?list:[...list,item.id]);setQuery("")};
  return <Dialog label={text.title} closeLabel={text.cancel} onClose={onClose} panelClassName="deadline-dialog" title={<h2>{text.title}</h2>}>
      <div className="deadline-dialog__row">
        <label>{text.name}<input value={name} onChange={event=>{setName(event.target.value);setError("")}} placeholder={text.namePlaceholder}/></label>
        <label className="deadline-dialog__date">{text.date}<input type="date" value={date} min={deadline?undefined:localDay()} onChange={event=>{setDate(event.target.value);setError("")}}/></label>
      </div>
      <p className="deadline-dialog__label">{text.pieces}</p>
      {chosen.length>0&&<ul className="deadline-dialog__pieces">
        {chosen.map(id=><li key={id}>
          <span>{byId.get(id)?.title??id}<small>{byId.get(id)?.composer}</small></span>
          <button type="button" className="has-tip" data-tip={text.remove} aria-label={`${text.remove} ${byId.get(id)?.title??id}`} onClick={()=>setChosen(list=>list.filter(entry=>entry!==id))}><PracticeIcon name="delete"/></button>
        </li>)}
      </ul>}
      <SuggestField id="deadline-pieces" items={pieces.filter(item=>!chosen.includes(item.id))} value={query} onChange={setQuery}
        onText={typed=>{const match=pieces.find(item=>!chosen.includes(item.id)&&`${item.title} ${item.composer}`.toLocaleLowerCase().includes(typed.toLocaleLowerCase()));if(match)add(match)}} onPick={add} placeholder={text.find} label={text.find} submitLabel={text.add}/>
      {error&&<p className="deadline-dialog__error" role="alert">{error}</p>}
      <div className="deadline-dialog__actions">
        {deadline&&<button type="button" className="deadline-dialog__delete" onClick={()=>{deleteDeadline(deadline.id);onClose()}}>{text.delete}</button>}
        <button type="button" onClick={onClose}>{text.cancel}</button>
        <button type="button" className="deadline-dialog__save" onClick={save}>{text.save}</button>
      </div>
  </Dialog>;
}
