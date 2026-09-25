import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timings, assessTaps, PATTERNS} from '../app/flute-studio/theory/rhythm/rhythmModel.ts';
test('subdivisions preserve duration and schedule consecutive onsets', () => {
  for (const notes of [[4], [2,2], [1,1,1,1]]) {
    const events = timings(notes);
    assert.equal(events.at(-1).start + events.at(-1).duration, 2.6);
  }
  assert.deepEqual(timings([.5,.5,1], 1), [{start:0,duration:.5},{start:.5,duration:.5},{start:1,duration:1}]);
});
test('tap assessment accepts consistent input latency, rejects wrong gaps and missing taps', () => {
  for (const pattern of PATTERNS) {
    const taps = timings(pattern, 650).map(event => event.start + 270);
    assert.equal(assessTaps(taps, pattern), true);
    assert.equal(assessTaps(taps.slice(1), pattern), false);
    assert.equal(assessTaps(taps.map((t,i) => i === 1 ? t + 400 : t), pattern), false);
  }
});

test('holding assesses full duration and rejects a quick click for every target', async () => {
  const {assessHold} = await import('../app/flute-studio/theory/rhythm/rhythmModel.ts');
  for (const value of [1,2,4]) {
    assert.equal(assessHold(value * 650, value), true);
    assert.equal(assessHold(value * 650 + 100, value), true);
    assert.equal(assessHold(60, value), false);
    assert.equal(assessHold(value * 650 * 1.6, value), false);
  }
  assert.equal(assessHold(1950,4),false, 'release at the fourth click is too early: the fourth pulse must finish');
});
