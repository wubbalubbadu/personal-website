"use client";

import { useRef, useState } from "react";

/**
 * Vector quantization, made draggable. A codebook of K fixed vectors partitions
 * the plane into Voronoi cells; the encoder output (the draggable dot) is
 * replaced by whichever codebook vector owns its cell.
 */

type Vec = [number, number];

/**
 * Index of the codebook vector nearest to `point`. Squared Euclidean distance
 * (the sqrt is monotonic, so it doesn't change the arg-min); a strict `<`
 * means the first codebook entry wins a tie.
 *   nearestCode([0.75, 0], [[0,0],[0,1],[1,0],[1,1]]) === 2
 */
function nearestCode(point: Vec, codebook: Vec[]): number {
  const d2 = (e: Vec) => (point[0] - e[0]) ** 2 + (point[1] - e[1]) ** 2;

  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < codebook.length; i++) {
    const distance = d2(codebook[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// K codebook vectors, fixed, in the unit square
const CODEBOOK: Vec[] = [
  [0.18, 0.24],
  [0.5, 0.14],
  [0.82, 0.3],
  [0.28, 0.7],
  [0.62, 0.6],
  [0.86, 0.82],
];

const S = 300; // svg is S x S, data space is [0,1] x [0,1]
const GRID = 26; // Voronoi sampling resolution

export default function VqQuantize() {
  const [pt, setPt] = useState<Vec>([0.6, 0.4]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);

  const chosen = nearestCode(pt, CODEBOOK);

  const toData = (clientX: number, clientY: number): Vec => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return pt;
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    return [x, y];
  };
  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setPt(toData(e.clientX, e.clientY));
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragging.current) setPt(toData(e.clientX, e.clientY));
  };
  const onUp = () => {
    dragging.current = false;
  };

  const px = (v: number) => v * S;

  return (
    <div className="ll-widget">
      <svg
        ref={svgRef}
        className="ll-widget__canvas"
        viewBox={`0 0 ${S} ${S}`}
        style={{ height: S, touchAction: "none", cursor: "crosshair" }}
        xmlns="http://www.w3.org/2000/svg"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {/* Voronoi cells by sampling nearestCode on a grid */}
        {Array.from({ length: GRID }, (_, gy) =>
          Array.from({ length: GRID }, (_, gx) => {
            const c = [(gx + 0.5) / GRID, (gy + 0.5) / GRID] as Vec;
            const k = nearestCode(c, CODEBOOK);
            return (
              <rect
                key={`${gx}-${gy}`}
                x={(gx / GRID) * S}
                y={(gy / GRID) * S}
                width={S / GRID + 0.5}
                height={S / GRID + 0.5}
                fill={k % 2 ? "var(--pine)" : "var(--amber)"}
                opacity={0.05 + 0.045 * k}
              />
            );
          }),
        )}

        {/* codebook vectors */}
        {CODEBOOK.map((e, i) => (
          <g key={i}>
            <circle cx={px(e[0])} cy={px(e[1])} r={6} fill="var(--amber)" />
            <text x={px(e[0]) + 9} y={px(e[1]) + 4} className="ll-fig-label" style={{ fontSize: 10 }}>
              {i}
            </text>
          </g>
        ))}

        {/* snap line + encoder point */}
        <line
          x1={px(pt[0])}
          y1={px(pt[1])}
          x2={px(CODEBOOK[chosen][0])}
          y2={px(CODEBOOK[chosen][1])}
          stroke="var(--pine)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <circle cx={px(pt[0])} cy={px(pt[1])} r={7} fill="none" stroke="var(--pine)" strokeWidth="2.5" />
      </svg>

      <p className="ll-widget__readout">
        encoder output ({pt[0].toFixed(2)}, {pt[1].toFixed(2)}) → quantized to code #{chosen}
      </p>
      <p className="ll-widget__note">Drag the ringed dot. Every point in a shaded cell collapses to the amber codebook vector that owns it.</p>
    </div>
  );
}
