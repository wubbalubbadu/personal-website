export function clampPanel(left:number,top:number,width:number,height:number,viewportWidth:number,viewportHeight:number){
 return {left:Math.max(8,Math.min(left,viewportWidth-width-8)),top:Math.max(8,Math.min(top,viewportHeight-height-8))};
}
