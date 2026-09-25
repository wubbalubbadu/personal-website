// ±30 cents occupies 70% of the plot; extreme frames never change this scale.
export const TRACE_LIMIT_CENTS = 30 / .7;
export const traceDuration = (elapsed:number) => Math.max(8000,Math.ceil(elapsed/4000)*4000);
export function traceY(cents:number) {
  return 100 - Math.max(-TRACE_LIMIT_CENTS,Math.min(TRACE_LIMIT_CENTS,cents)) / TRACE_LIMIT_CENTS * 100;
}

