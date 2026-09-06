import QrTree, { QR_PAYLOAD } from "./QrTree";
import { encodeQr } from "./lib/qr";

/** Static, guaranteed-scannable QR for the no-JavaScript fallback. */
function StaticQr({ text }: { text: string }) {
  const m = encodeQr(text, "H");
  const n = m.length;
  const q = 4; // quiet zone
  const size = n + q * 2;
  const rects: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m[y][x]) rects.push(`M${x + q},${y + q}h1v1h-1z`);
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={rects.join("")} fill="#1b1b1b" />
    </svg>
  );
}

export default function QrTreePage() {
  return (
    <main className="qrt-page">
      <nav className="qrt-nav">
        <a href="/">← Haylie Wu</a>
      </nav>

      <header className="qrt-head">
        <h1>QR Tree</h1>
        <p>
          One grid of blocks, two points of view. From straight on it&rsquo;s a scannable code; turn it and the same
          blocks stand up into a cherry tree, then fold back flat.
        </p>
      </header>

      <QrTree />

      <p className="qrt-foot">Drag to turn it. It scans in the flat state — try it with your phone.</p>

      <noscript>
        <div className="qrt-noscript">
          <StaticQr text={QR_PAYLOAD} />
          <p>{QR_PAYLOAD}</p>
        </div>
      </noscript>
    </main>
  );
}
