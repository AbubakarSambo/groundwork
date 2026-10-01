import { readFileSync } from 'fs';
import { join } from 'path';
import { aFieldNameIsNotAHeading, everyDivergenceReadable } from './a-field-name-is-not-a-heading';

/**
 * "THE PARTICIPANT SEEMS TO BE LOOKING AT TOO MANY REPORTS."
 *
 * One participant, one finished session. What they could open: the session report, the solo
 * artifact on My record, the shared report on the Report tab, and the board. Four surfaces is a
 * design question. What made it feel like far more than four was that ONE of them printed the same
 * finding three times.
 *
 * The session report took `report.divergences` and mapped it three times through three sentence
 * templates, under three headings. Three divergences rendered as nine bullets. The Report tab then
 * printed the same three a fourth time under "What's still open".
 *
 * Two of the three templates also asserted things nobody had established - that the person treated
 * the topic as settled, and that their account "could be more specific" - generated for every
 * divergence regardless of what they actually wrote.
 *
 * And every one of those bullets lowercased the topic, which is how a stored topic that had
 * swallowed its neighbouring field came out as
 *
 *   "That clarity on onboarding support. atstake: if this holds, ... is settled - it may read
 *    differently from the other seat."
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CARD = strip(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw', 'TheCheckInYouJustFinished.tsx'),
    'utf8',
  ),
);
const SERVICE = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));

describe('the field name the model wrote into the field', () => {
  it('comes out of the heading and fills the field it belonged to', () => {
    const d = aFieldNameIsNotAHeading<any>({
      topic: 'Clarity on onboarding support. atStake: If this holds, the coordinator misses the basics.',
    });
    expect(d.topic).toBe('Clarity on onboarding support');
    expect(d.atStake).toBe('If this holds, the coordinator misses the basics.');
  });

  it('discards the tail as the duplicate it is where the field is already set', () => {
    const d = aFieldNameIsNotAHeading({ topic: 'Scope. atStake: it slips.', atStake: 'It slips.' });
    expect(d.topic).toBe('Scope');
    expect(d.atStake).toBe('It slips.');
  });

  it('leaves an ordinary divergence exactly as it was', () => {
    const d = { topic: 'Who owns the handover', atStake: 'Nobody does it.' };
    expect(aFieldNameIsNotAHeading(d)).toEqual(d);
  });

  it('never empties a heading', () => {
    /* A topic that is nothing but the field name and its value keeps its text: a long heading is
       worse to read than a short one, and no heading at all is worse than both. */
    const d = aFieldNameIsNotAHeading({ topic: 'atStake: the whole thing was written here' });
    expect((d.topic ?? '').length).toBeGreaterThan(0);
  });

  it('is repaired before the second pass runs, not after', () => {
    /* fillAtStake only fills an EMPTY atStake. Run it first and it sees the duplicate, calls the
       field populated, and leaves the mangled topic standing. */
    const repair = SERVICE.indexOf('everyDivergenceReadable(result.divergences)');
    const fill = SERVICE.indexOf('this.fillAtStake(result.divergences)');
    expect(repair).toBeGreaterThan(-1);
    expect(fill).toBeGreaterThan(repair);
  });

  it('and is idempotent, so a repaired report survives a second pass', () => {
    const once = everyDivergenceReadable([{ topic: 'Scope. atStake: it slips.' }]);
    expect(everyDivergenceReadable(once)).toEqual(once);
  });
});

describe('the session report', () => {
  it('does not map the divergences at all now, which is the rule carried the rest of the way', () => {
    /*
     * THE ORIGINAL FAULT: three divergences printed three times under three headings on one card,
     * so one finding read as nine. It was cut to once.
     *
     * The close is now A - what one person said this time - and a divergence is a statement about
     * two accounts, which is B and lives on its own surface. So the count is zero, and zero is the
     * end of the line this rule was walking down.
     */
    expect(CARD).not.toMatch(/report\.divergences/);
  });

  it('does not manufacture a criticism of the account for every divergence', () => {
    expect(CARD).not.toContain('could be more specific');
  });

  it('nor claim the person treated it as settled', () => {
    expect(CARD).not.toMatch(/That \$\{d\.topic/);
  });

  it('and never lowercases a stored topic into a sentence', () => {
    /* This is what turned a leaked field name into "atstake:". A topic is a heading written by the
       synthesis; it is displayed, not conjugated. */
    expect(CARD).not.toContain('d.topic.toLowerCase()');
  });

  it('does not label the shared picture as the reader\'s own contribution', () => {
    /* `sharedPicture` is the read across everybody. It sat under "What your contribution reveals",
       which told each reader that everyone else's account was a finding about them. */
    expect(CARD).not.toContain('What your contribution reveals');
  });
});
