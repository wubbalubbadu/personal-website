import {extractMeasures} from "../components/practiceExcerpt";

const cache=new Map<string,Promise<string>>();

/** The piece's MusicXML text: a plain .musicxml/.xml as is; a compressed .mxl is unzipped by OSMD, which hands back the XML it read. */
async function scoreText(url:string):Promise<string>{
  if(!/\.mxl(\?|$)/i.test(url)){
    const response=await fetch(url);
    if(!response.ok)throw new Error("This score could not be loaded.");
    return response.text();
  }
  const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay");
  const host=document.createElement("div");
  const osmd=new OpenSheetMusicDisplay(host,{backend:"svg",autoResize:false});
  let xml="";osmd.OnXMLRead=text=>{xml=text;return text};
  await osmd.load(url);
  if(!xml)throw new Error("This score could not be opened.");
  return xml;
}

/** The MusicXML of bars from..to (measure positions) of a piece, ready to engrave. Whole scores are fetched once per URL. */
export async function loadExcerptXml(scorePath:string,from:number,to:number):Promise<string>{
  let text=cache.get(scorePath);
  if(!text){text=scoreText(scorePath);cache.set(scorePath,text);text.catch(()=>cache.delete(scorePath))}
  return extractMeasures(await text,from,to);
}
