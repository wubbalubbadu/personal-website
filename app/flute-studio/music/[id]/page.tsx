"use client";

import {useParams} from "next/navigation";
import {musicLibrary,composerInfo} from "../../../../content/music-library";
import {ScoreViewer,type ScoreViewerConfig} from "../../components/ScoreViewer";

export default function UploadedMusicPage(){
  const params=useParams<{id:string}>();
  const item=musicLibrary.find(entry=>entry.id===params.id);
  if(!item?.scorePath)return <main style={{padding:"120px 24px",textAlign:"center"}}><h1>Score not found</h1></main>;
  const config:ScoreViewerConfig={
    title:item.title,
    composer:item.composer,
    asset:item.scorePath,
    id:item.id,
    backHref:"/flute-studio/music",
    ...(item.pdfPath?{pdfPath:item.pdfPath}:{}),
    ...(item.defaultTempo?{defaultTempo:item.defaultTempo}:{}),
    ...(composerInfo(item.composer)||item.about?{story:{composer:composerInfo(item.composer),year:item.year,about:item.about}}:{}),
  };
  return <ScoreViewer config={config}/>;
}
