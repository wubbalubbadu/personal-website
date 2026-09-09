"use client";

import { useState } from "react";

/**
 * Real-time factor. RTF = generated audio length / time taken to generate it.
 * RTF > 1 is faster than real time. The catch for Stable Audio: because training
 * crops to a fixed 95.1 s window and silence-pads shorter targets, the
 * generation time barely moves when you ask for a shorter clip.
 */

export default function RtfCalc() {
  const [audio, setAudio] = useState(95);
  const [gen, setGen] = useState(8);

  const rtf = gen > 0 ? audio / gen : 0;
  const faster = rtf >= 1;

  return (
    <div className="ll-widget">
      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>generated audio <b>{audio} s</b></span>
          <input type="range" min={5} max={95} step={1} value={audio} onChange={(e) => setAudio(+e.target.value)} />
        </label>
        <label className="ll-widget__control">
          <span>time to generate <b>{gen} s</b></span>
          <input type="range" min={1} max={60} step={1} value={gen} onChange={(e) => setGen(+e.target.value)} />
        </label>
      </div>

      <div className="ll-formula" style={{ marginTop: 12 }}>
        <div className="ll-formula__tex" style={{ whiteSpace: "normal" }}>
          RTF = {audio} / {gen} = <b style={{ fontStyle: "normal" }}>{rtf.toFixed(2)}</b>
        </div>
        <p className="ll-formula__cap">
          {faster
            ? `${rtf.toFixed(1)}× faster than real time`
            : `${(1 / rtf).toFixed(1)}× slower than real time`}
        </p>
      </div>

      <p className="ll-widget__note">
        This is <b>latency</b> RTF — one clip, start to finish. <b>Throughput</b> RTF (with request batching) is the
        number that matters for API-scale serving; the paper does not separate them.
      </p>
    </div>
  );
}
