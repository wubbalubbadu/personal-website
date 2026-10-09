Oboe notes rendered locally with MuseScore 4 (MusicXML instrument sound
wind.reed.oboe, MIDI program 69), eight-second whole notes at mp.
MIDI pitches 58 through 94 in steps of four semitones.

Vibrato removed after rendering: the pitch track is flattened by time-warping and the volume pulse divided out with a 25 ms RMS envelope (from 0.3 s and 0.6 s on).

Files are mono 22050 Hz PCM16 WAV, peak-normalized to 0.65. Each starts at the
note's onset; from 1 s to the end of the file is a loop whose end point was
chosen where the waveform matches the loop start, with an 80 ms crossfade
baked in, so `loopStart=1, loopEnd=duration` holds the note indefinitely.
Used for the drone (components/sampledDrone.ts).
