import { whatTheySaidAboutWhy, SAYS_SKILL, SAYS_CONFIDENCE } from './they-said-why-themselves';
import { whyNot, WhatIsKnown } from '../reports/why-it-is-not-happening';

const LATE: WhatIsKnown = {
  text: 'call the twelve accounts that went quiet',
  dueDate: new Date('2026-08-01'),
  status: 'OPEN',
  seenBySubject: true,
  awareness: 'TOLD',
  openBlockers: [],
  progress: [],
};
const NOW = new Date('2026-08-30');

describe('not knowing how and not wanting to are different things', () => {
  it('hears somebody say they do not know how, and calls it skill', () => {
    const s = whatTheySaidAboutWhy(['I have never done one before, so I left it.']);
    expect(s).toEqual({ kind: 'SKILL', quote: 'I have never done one before, so I left it.' });
  });

  it('hears somebody say they have been putting it off, and calls it confidence', () => {
    const s = whatTheySaidAboutWhy(["Honestly I've been putting it off all week."]);
    expect(s?.kind).toBe('CONFIDENCE');
  });

  it('teaches rather than probes when they said both in one breath', () => {
    /* "Never done one and I keep putting it off" is a request to be shown. Reading it as avoidance
       has somebody talked to about their nerve when what they wanted was showing. */
    const s = whatTheySaidAboutWhy(['I have never done this before and I keep putting it off.']);
    expect(s?.kind).toBe('SKILL');
  });

  it('does not put their sentence in front of anybody unless the surface said it may', () => {
    /*
     * The design of these two was "quote them rather than describe them", and it is how "I have been
     * putting it off" would have reached a report the person's colleagues read. Off by default: a
     * surface that has not thought about who its readers are should not be quoting anybody.
     */
    expect(SAYS_SKILL('I was never trained on it')).not.toContain('I was never trained on it');
    expect(SAYS_CONFIDENCE('I am dreading that call')).not.toContain('I am dreading that call');
    expect(SAYS_SKILL('I was never trained on it')).toContain('said themselves that they do not know how');
  });

  it('quotes them where a surface has deliberately said it may', () => {
    expect(SAYS_SKILL('I was never trained on it', true)).toContain('"I was never trained on it"');
    expect(SAYS_CONFIDENCE('I am dreading that call', true)).toContain('"I am dreading that call"');
  });

  it('sends skill to being shown and confidence to a different conversation', () => {
    expect(SAYS_SKILL('x')).toContain('not something to ask them to try harder at');
    expect(SAYS_CONFIDENCE('x')).toContain('rather than about the task');
  });

  it('says nothing at all about somebody who did not say anything like it', () => {
    expect(whatTheySaidAboutWhy(['I called four of them and two picked up.'])).toBeNull();
    expect(whatTheySaidAboutWhy([])).toBeNull();
  });

  it('never reads a third party describing them as them saying it', () => {
    /*
     * The one way to misuse this. Every phrase is first person, so a colleague's opinion cannot
     * match - and a colleague's opinion becoming a recorded explanation of somebody is exactly the
     * label this product refuses to carry.
     */
    for (const aboutThem of [
      'He does not know how to run one of these.',
      'She has been avoiding the difficult accounts.',
      'They are not confident on pricing.',
      'Dele is nervous about calling.',
    ]) {
      expect(whatTheySaidAboutWhy([aboutThem])).toBeNull();
    }
  });
});

describe('where the two new explanations sit among the others', () => {
  it('outranks execution, because somebody who told you why has given the answer', () => {
    const why = whyNot({ ...LATE, saidWhy: 'SKILL' }, NOW);
    expect(why.kind).toBe('SKILL');
  });

  it('but never outranks nobody having told them', () => {
    const why = whyNot({ ...LATE, seenBySubject: false, saidWhy: 'CONFIDENCE' }, NOW);
    expect(why.kind).toBe('UNDERSTANDING');
  });

  it('and never outranks something genuinely in the way', () => {
    /* How somebody feels about a task does not outrank a thing that is actually blocking it. */
    const why = whyNot({
      ...LATE,
      openBlockers: [{ what: 'the pricing sheet', onName: 'Finance', escalated: false }],
      saidWhy: 'CONFIDENCE',
    }, NOW);
    expect(why.kind).toBe('CONSTRAINT');
  });

  it('still says execution when they said nothing about why', () => {
    expect(whyNot({ ...LATE, saidWhy: null }, NOW).kind).not.toBe('SKILL');
  });
});
