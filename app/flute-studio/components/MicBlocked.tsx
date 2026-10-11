"use client";

/** The words alone, for a surface that lays out its own text (the recorder panel). */
export function micBlockedText(zh:boolean,unavailable=false){
  const ipad=typeof navigator!=="undefined"&&/iPad|iPhone|Macintosh/.test(navigator.userAgent)&&"ontouchend" in document;
  if(unavailable)return zh?"这个浏览器不能用麦克风。":"This browser can’t use the microphone.";
  return ipad?(zh?"麦克风被关了。在 Safari 点 aA，网站设置里允许麦克风。":"Microphone is off. Allow it in Safari under aA, Website Settings.")
    :(zh?"麦克风被关了。点地址栏左边的图标允许它。":"Microphone is off. Allow it from the icon at the left of the address bar.");
}

/**
 * What every mic feature says when the browser refuses the microphone (COMPONENTS.md "Mic blocked"): one plain
 * sentence in the surface's own text style, saying where the switch is. No box, no colour, no button: pressing the
 * feature's own Mic or Listen again is the retry.
 */
export function MicBlocked({zh,unavailable=false}:{zh:boolean;unavailable?:boolean}){
  return <span role="alert">{micBlockedText(zh,unavailable)}</span>;
}
