// A short, unpitched hi-hat-like tick. Shared audio-clock scheduling keeps it
// aligned with note playback; a smooth envelope prevents hard sample edges.
export function metronomeSamples(sampleRate:number){
  const samples=new Float32Array(Math.ceil(sampleRate*.045));let seed=81723,previous=0;
  for(let i=0;i<samples.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
    const high=noise-previous;previous=noise;
    const t=i/sampleRate,attack=Math.min(1,t/.002),release=Math.max(0,1-i/(samples.length-1));
    samples[i]=high*.025*attack*release*release;
  }
  return samples;
}

// A hand clap: three very fast noise bursts (the hands meeting unevenly) and a short
// decaying tail, band-limited so it reads as a clap rather than a hiss.
export function clapSamples(sampleRate:number){
  const samples=new Float32Array(Math.ceil(sampleRate*.16));let seed=40503,low=0,band=0;
  for(let i=0;i<samples.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
    low+=.45*(noise-low);band=noise-low;
    const t=i/sampleRate,burst=t<.03?Math.exp(-((t%.01)/.0022)):0,tail=Math.exp(-t/.035);
    const release=Math.min(1,(samples.length-1-i)/(sampleRate*.01));
    samples[i]=band*.22*Math.max(burst,tail*.7)*Math.min(1,t/.0008)*release;
  }
  return samples;
}
