// Engraved quarter-note head from the existing VexFlow Gonville font.
export default function QuarterNote({down=false}:{down?:boolean}){
  return <g className="theory-quarter-note">
    <path transform="translate(-13.7 0) scale(.064 -.064)" d="M262 186 C266 186 272 186 273 186 C273 186 274 186 274 186 C274 186 280 186 285 186 C375 181 428 122 428 48 C428 12 416 -29 386 -68 C329 -145 236 -187 155 -187 C92 -187 38 -162 12 -111 C4 -91 0 -72 0 -51 C0 58 122 179 262 186"/>
    <line x1={down?-12.7:12.7} x2={down?-12.7:12.7} y1={down?3:-3} y2={down?84:-84} stroke="currentColor" strokeWidth="2"/>
  </g>;
}
