import { whatIsConcreteIn, THE_ONE_CONCRETE_THING } from './the-close-is-held-once';
import { numbersNobodySaid, screen, SentenceGate, askInsteadOfInventing, hitLogLine } from './nothing-invented-reaches-them';
import { detectFunction } from '../board/function-detection';
import { buildRoleProbeBlock, MIN_COACHING_CONFIDENCE } from '../board/role-maps';

describe('the close bar reads the last answer for one concrete thing', () => {
  it('a bare yes carries nothing', () => {
    expect(whatIsConcreteIn('yes that is everything', false)).toEqual([]);
  });
  it('a date, a number, a document or an attachment each count', () => {
    expect(whatIsConcreteIn('I will send it by Friday', false)).toContain('a date');
    expect(whatIsConcreteIn('two transfers waited', false)).toContain('a number');
    expect(whatIsConcreteIn('it is in the tracker', false)).toContain('a document');
    expect(whatIsConcreteIn('here you go', true)).toEqual(['an attachment']);
  });
  it('the one question is a question, and short', () => {
    expect(THE_ONE_CONCRETE_THING.split(/[.!?]/).filter((x) => x.trim()).length).toBeLessThanOrEqual(2);
    expect(THE_ONE_CONCRETE_THING).not.toMatch(/[–—]/);
  });
});

describe('a number nobody said is dropped like a name nobody said', () => {
  const SAID = ['two of our transfers waited on 30 August', 'I emailed on the 14th'];
  it('lets their own figures through, digits only, in any punctuation', () => {
    expect(numbersNobodySaid('So 30 August was the second wait?', SAID)).toEqual([]);
    expect(numbersNobodySaid('You wrote on the 14th.', SAID)).toEqual([]);
  });
  it('catches a figure that appears nowhere', () => {
    expect(numbersNobodySaid('Three transfers waited 45 minutes on 2 September.', SAID)).toEqual(['45', '2']);
  });
  it('a list marker is not a claim', () => {
    expect(numbersNobodySaid('1. What happened next?', SAID)).toEqual([]);
  });
  it('screen() drops the sentence and says why', () => {
    const r = screen('That waited 45 minutes. What happened after the email?', SAID);
    expect(r.text).toBe('What happened after the email?');
    expect(r.hits).toEqual([{ sentence: 'That waited 45 minutes. ', check: 'a number nobody said', offending: ['45'] }]);
  });
  it('the stream gate records the same hits', () => {
    const g = new SentenceGate(SAID);
    g.push('That waited 45 minutes. What happened after the email?');
    g.flush();
    expect(g.hits.map((h) => h.check)).toEqual(['a number nobody said']);
  });
  it('a roster name in the known words is not an invention', () => {
    const r = screen('Did Hafsah reply to the email?', SAID.concat(['Hafsah', 'Jumare']));
    expect(r.hits).toEqual([]);
    expect(screen('Did Hafsah reply to the email?', SAID).hits[0].check).toBe('a name nobody said');
  });
  it('the second try names the thing and asks for a question instead', () => {
    const line = askInsteadOfInventing([{ sentence: 'x', check: 'a number nobody said', offending: ['45'] }]);
    expect(line).toContain('"45"');
    expect(line).toMatch(/ask for it/i);
  });
  it('the log line is greppable and carries the outcome', () => {
    const line = hitLogLine('ci1', { sentence: 'x. ', check: 'a name nobody said', offending: ['Alex'] }, 'dropped live');
    expect(line).toMatch(/^invention-gate check-in=ci1 check="a name nobody said" offending=\["Alex"\] outcome="dropped live"/);
  });
});

describe('the role map is there from turn one, provisionally', () => {
  it('the stated role alone gives a read under the coaching threshold, so the block hedges', () => {
    const read = detectFunction('Project manager on the ward rota', [], null);
    expect(read.fn).not.toBeNull();
    expect(read.confidence).toBeLessThan(MIN_COACHING_CONFIDENCE);
    expect(buildRoleProbeBlock(read.fn, read.confidence)).toMatch(/PROVISIONAL/);
  });
  it('when the words disagree with the stated role, the words win and it is held more tentatively', () => {
    const stated = detectFunction('Project manager', [], null);
    const withWords = detectFunction('Project manager', [
      'I closed the deal with the buyer and sent the proposal to procurement. The pipeline has three qualified leads.',
      'Renewal call with the decision maker is booked, contract sent.',
    ], { fn: stated.fn, confidence: stated.confidence });
    expect(withWords.fn).toBe('SALES');
    expect(withWords.basis).toMatch(/does not bear out/);
  });
});
