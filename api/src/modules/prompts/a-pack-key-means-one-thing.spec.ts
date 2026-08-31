import { GroundScenario, GroundMoment } from '@prisma/client';
import { SEED_PROMPTS } from '../conversation/prompt-library';

/**
 * TWO ENUMS SHARE A MEMBER NAME, AND THE PACK KEY CONTAINS BOTH.
 *
 * The moment-qualified key is `scenario.<scenario>.<moment>.<party>`. There is a SCENARIO called
 * RECOGNITION - a raise or a promotion - and a MOMENT called RECOGNITION, which means mid-way. So
 * `scenario.recognition.recognition.initiator` is a legitimate key, and so is
 * `scenario.drift.recognition.participant`, and the two RECOGNITIONs in the first one mean completely
 * different things.
 *
 * The moment value cannot be renamed: rows hold it, and the rule here is never to break a stored value.
 * So it is checked instead. Anybody hand-writing one of these keys, or reading a list of them, will
 * eventually put the scenario in the moment position - this fails when they do.
 *
 * The words a person reads say "Mid-way". Only the stored value says RECOGNITION.
 */
describe('a pack key', () => {
  const SCENARIOS = new Set(Object.values(GroundScenario).map((s) => s.toLowerCase()));
  const MOMENTS = new Set(Object.values(GroundMoment).map((m) => m.toLowerCase()));
  const PARTIES = new Set(['initiator', 'participant']);

  const scenarioKeys = SEED_PROMPTS.filter((s) => s.key.startsWith('scenario.'));

  it('seeds at least one scenario pack, or this test proves nothing', () => {
    expect(scenarioKeys.length).toBeGreaterThan(0);
  });

  it('always names a real scenario in the scenario position', () => {
    const wrong = scenarioKeys
      .map((s) => ({ key: s.key, part: s.key.split('.')[1] }))
      .filter(({ part }) => !SCENARIOS.has(part))
      .map(({ key }) => key);
    expect(wrong).toEqual([]);
  });

  it('and a real moment in the moment position, never a scenario', () => {
    /**
     * The collision. A four-part key whose third part is a scenario name means somebody has written the
     * scenario twice - and because RECOGNITION is both, that mistake resolves to a real-looking key
     * rather than failing.
     */
    const wrong = scenarioKeys
      .filter((s) => s.key.split('.').length === 4)
      .map((s) => ({ key: s.key, moment: s.key.split('.')[2] }))
      .filter(({ moment }) => !MOMENTS.has(moment))
      .map(({ key, moment }) => `${key} has "${moment}" where a moment belongs`);
    expect(wrong).toEqual([]);
  });

  it('and a party in the last position', () => {
    const wrong = scenarioKeys
      .map((s) => s.key.split('.'))
      .filter((parts) => !PARTIES.has(parts[parts.length - 1]))
      .map((parts) => parts.join('.'));
    expect(wrong).toEqual([]);
  });

  it('is three parts or four, never more', () => {
    // scenario.<scenario>.<party> or scenario.<scenario>.<moment>.<party>. Anything else will not
    // resolve at read time, and would silently fall back to the generic pack forever.
    const wrong = scenarioKeys.map((s) => s.key).filter((k) => ![3, 4].includes(k.split('.').length));
    expect(wrong).toEqual([]);
  });

  it('and never seeds the same key twice', () => {
    const keys = SEED_PROMPTS.map((s) => s.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it('the recognition scenario and the recognition moment are genuinely both real', () => {
    // Pinning the reason this file exists, so a future reader does not delete it as paranoia.
    expect(SCENARIOS.has('recognition')).toBe(true);
    expect(MOMENTS.has('recognition')).toBe(true);
  });
});
