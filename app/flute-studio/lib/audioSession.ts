/**
 * Every microphone in the studio opens and closes through here, so iOS can be told when to leave recording mode.
 *
 * While a mic is open Safari puts the page's audio session into play-and-record, which on iPad routes output at
 * call volume. Stopping the tracks does not switch it back: the metronome stayed quiet until Safari was closed and
 * reopened. Safari 17+ exposes `navigator.audioSession`; setting it back to "playback" once the last mic closes
 * restores full volume. Browsers without it ignore all of this.
 */
type AudioSessionType="auto"|"playback"|"play-and-record";
const session=()=>(typeof navigator!=="undefined"?(navigator as Navigator&{audioSession?:{type:AudioSessionType}}).audioSession:undefined);
const open=new Set<MediaStream>();
let pending=0;

function setType(type:AudioSessionType){const s=session();if(s&&s.type!==type){try{s.type=type}catch{/* unsupported value */}}}

/** Before any audio plays: plain playback, so the click is at media volume (and not muted by the ring switch). */
export function preferPlayback(){if(!open.size&&!pending)setType("playback")}

export async function openMic(constraints:MediaStreamConstraints["audio"]={autoGainControl:false,echoCancellation:false,noiseSuppression:false}){
  pending++;
  setType("play-and-record");
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:constraints});open.add(stream);
    for(const track of stream.getAudioTracks())track.addEventListener("ended",()=>{if(stream.getAudioTracks().every(t=>t.readyState==="ended"))closeMic(stream)},{once:true});
    return stream}
  finally{pending--;preferPlayback()}
}

export function closeMic(stream:MediaStream|null|undefined){
  if(!stream)return;
  stream.getTracks().forEach(track=>track.stop());
  const wasOpen=open.delete(stream);
  if(wasOpen&&!open.size&&!pending){setType("playback");window.dispatchEvent(new Event(MIC_CLOSED))}
}
/** Fired when the last microphone closes, so the audio engine can swap in a fresh context (see PracticeAudio). */
export const MIC_CLOSED="cookie:mic-closed";
