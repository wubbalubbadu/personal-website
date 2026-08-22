"use client";

import { useEffect, useRef, useState } from "react";

export default function CritterVision({
  name,
  note,
  filter,
}: {
  name: string;
  note: string;
  filter: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("Camera access was denied or isn't available on this device.");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }

  return (
    <div className="critter-vision">
      {!active && (
        <button type="button" className="vision-toggle" onClick={start}>
          👁️ Try {name}&rsquo;s vision
        </button>
      )}
      {active && (
        <div className="vision-frame">
          <video ref={videoRef} muted playsInline style={{ filter }} />
          <button type="button" className="vision-stop" onClick={stop}>
            Stop
          </button>
        </div>
      )}
      {error && <p className="vision-error">{error}</p>}
      <p className="vision-note">
        {note} It&rsquo;s a playful simulation, not a scientifically exact recreation.
      </p>
    </div>
  );
}
