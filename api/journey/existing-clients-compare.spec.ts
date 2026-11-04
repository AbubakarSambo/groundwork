import {
  compare, theSummary, whatWasLost, isKept, tokensOf, sentencesAPersonReads, wordingProblemsIn, type ServedLine,
} from './existing-clients-compare';
import { installTheGuard } from './the-read-only-guard';

const read = (over: Partial<ServedLine>): ServedLine => ({ t: 'read', ground: 'g1', scenario: 'NEW_HIRE', role: 'lead', userId: 'u1', what: 'report', outcome: 'served', ...over });

describe('nothing is lost anywhere (decision 91)', () => {
  it('counts a sentence as kept when it is somewhere else, or in plainer words, for the same reader', () => {
    const old = [{ board: 'Omar is waiting on Tunde for the signed contract before Friday.' }];
    const now = [{ report: 'Before Friday, Omar needs the signed contract from Tunde.' }];
    const lost = whatWasLost(old, now, ['Omar', 'Tunde']);
    expect(lost.sentences).toEqual([]);
    expect(lost.people).toEqual([]);
  });

  it('counts a sentence as lost when its people, words or numbers are nowhere in what the reader is now served', () => {
    const old = [{ divergences: ['The poultry farmer is two payments behind and asks for forbearance, not escalation.'] }];
    const now = [{ sharedPicture: 'Everybody has given an account and the record shows no gap.' }];
    const lost = whatWasLost(old, now, []);
    expect(lost.sentences).toHaveLength(1);
  });

  it('counts a named person as lost when the old pages named them and the new ones do not', () => {
    const lost = whatWasLost([{ a: 'Amara said she would send the figures on Monday.' }], [{ a: 'Somebody said they would send the figures on Monday.' }], ['Amara']);
    expect(lost.people).toEqual(['Amara']);
  });

  it('ignores ids, dates and short labels, which are not sentences a person reads', () => {
    expect(sentencesAPersonReads({ id: '3f2b8f0a-0000-4000-8000-123456789abc', at: '2026-09-01T10:00:00Z', k: 'OPEN', s: 'This one is a full sentence.' })).toEqual(['This one is a full sentence.']);
  });

  it('judges by the longer words and numbers, so a reworded sentence is kept', () => {
    expect(isKept('Revenue target is 500 million this quarter.', tokensOf('This quarter the revenue target stands at 500 million.'))).toBe(true);
    expect(isKept('Revenue target is 500 million this quarter.', tokensOf('Nothing here.'))).toBe(false);
  });

  it('compares each reader of each check-in against the same reader, and separates stock sentences from the check-in\'s own', () => {
    const stock = 'Generated from the check-in and only the meeting poll can be edited.';
    const old: ServedLine[] = ['g1', 'g2', 'g3'].map((g) => read({ ground: g, served: { footnote: stock, own: `Tunde owes the ${g} invoice by Friday afternoon.` } }));
    const now: ServedLine[] = [
      { t: 'ground', ground: 'g1', scenario: 'NEW_HIRE', names: ['Tunde'] }, { t: 'ground', ground: 'g2', scenario: 'NEW_HIRE', names: ['Tunde'] }, { t: 'ground', ground: 'g3', scenario: 'NEW_HIRE', names: ['Tunde'] },
      ...['g1', 'g2', 'g3'].map((g) => read({ ground: g, served: { own: `Tunde owes the ${g} invoice by Friday afternoon.` } })),
    ];
    const c = compare(old, now);
    expect(c.stockLost).toBe(3);
    expect(c.specificLost).toBe(0);
    expect(c.stillServed).toBe(3);
  });

  it('does not count the lead\'s judgement as lost from a participant, because a participant never reads it, but does count it for a lead', () => {
    const judged = { divergences: [{ evidence: 'The poultry farmer is two payments behind and asks for forbearance rather than escalation.' }], sharedPicture: 'Everybody answered.' };
    const ground: ServedLine = { t: 'ground', ground: 'g1', scenario: 'COHORT_CHECK', names: [] };
    const asParticipant = compare([read({ role: 'participant', served: judged })], [ground, read({ role: 'participant', served: { sharedPicture: 'Everybody answered.' } })]);
    expect(asParticipant.withdrawnFromParticipants).toBe(1);
    expect(asParticipant.unexplainedLost).toBe(0);
    const asLead = compare([read({ role: 'lead', served: judged })], [ground, read({ role: 'lead', served: { sharedPicture: 'Everybody answered.' } })]);
    expect(asLead.unexplainedLost).toBe(1);
  });

  it('reports a page that was served before and fails now, and a page that tried to write', () => {
    const c = compare(
      [read({ served: { a: 'one' } }), read({ what: 'board', served: { a: 'one' } })],
      [{ t: 'ground', ground: 'g1', scenario: 'NEW_HIRE', names: [] }, read({ outcome: 'failed', why: 'boom' }), read({ what: 'board', outcome: 'wrote', why: 'Report.update' })],
    );
    expect(c.newlyFailed.join(' ')).toContain('boom');
    expect(c.newlyFailed.join(' ')).toContain('tried to write');
    expect(theSummary(c).join('\n')).toContain('FAULT');
  });

  it('does not call a phrase two people share a new leak when the old pages held it too', () => {
    const line = read({ served: { a: 'that works for funtua then kano and jigawa' } });
    const c = compare([line], [{ t: 'ground', ground: 'g1', scenario: 'NEW_HIRE', names: [] }, line], () => ["another person's own report"]);
    expect(c.leaks).toEqual([]);
    expect(c.leaksAlsoBefore).toBe(1);
    const fresh = compare([read({ served: { a: 'x' } })], [{ t: 'ground', ground: 'g1', scenario: 'NEW_HIRE', names: [] }, line], (l) => (JSON.stringify(l.served).includes('funtua') ? ["another person's own report"] : []));
    expect(fresh.leaks).toHaveLength(1);
  });

  it('counts the scorer\'s wording problems on both sides, and says which got worse and better', () => {
    const c = compare(
      [read({ served: { a: 'The initiator said this was for: a thing.' } })],
      [{ t: 'ground', ground: 'g1', scenario: 'NEW_HIRE', names: [] }, read({ served: { a: 'Tunde needs the sign off. alignment matters.' } })],
    );
    expect(c.wording.betterIn).toContain('internal labels shown');
    expect(wordingProblemsIn([{ a: 'the person who set this up' }])['internal labels shown']).toBe(1);
  });

  it('counts the questions to Ask Groundwork that reached the model as not tested, not as a fault', () => {
    const ask = (o: Partial<ServedLine>): ServedLine => ({ t: 'ask', organizationId: 'o1', role: 'lead', personId: 'p1', question: 'What is due?', ...o });
    const c = compare(
      [ask({ outcome: 'served', served: { blocks: [{ body: 'Nothing is due.' }] } })],
      [ask({ outcome: 'wrote', why: 'The check refused a write: the model.respond (this check calls neither the model, the mailer nor WhatsApp).' })],
    );
    expect(c.ask.needTheModel).toBe(1);
    expect(c.ask.answeredBeforeButNotNow).toEqual([]);
  });
});

describe('the guard lets a page make only the writes it makes by design', () => {
  const stub = () => {
    const hooks: Function[] = [];
    return { prisma: { $use: (f: Function) => hooks.push(f), $executeRaw: null, $executeRawUnsafe: null } as any, hooks };
  };
  it('answers "nothing changed" for recording that a pattern was shown, and still refuses a report being rebuilt', async () => {
    const { prisma, hooks } = stub();
    const byDesign: string[] = []; const refused: string[] = [];
    installTheGuard(prisma, (w) => refused.push(w), (w) => byDesign.push(w));
    const next = jest.fn();
    await expect(hooks[0]({ model: 'PatternDetection', action: 'updateMany' }, next)).resolves.toEqual({ count: 0 });
    expect(next).not.toHaveBeenCalled();
    await expect(hooks[0]({ model: 'Report', action: 'update' }, next)).rejects.toThrow('Report.update');
    expect(byDesign).toEqual(['PatternDetection.updateMany']);
    expect(refused).toEqual(['Report.update']);
  });
});
