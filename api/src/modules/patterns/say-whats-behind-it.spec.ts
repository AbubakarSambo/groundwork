/**
 * "SAY WHAT'S BEHIND IT." The person a pattern is about answers it, and nobody else can.
 *
 * The prototype, my-record.txt: "Wairimu sees this pattern too. You can say what's behind it; it
 * goes next to the pattern, in your words." Before 28 September 2026 there was no route for an
 * answer at all (patterns.controller had only `accuracy` and `rate`).
 */

/* Loaded inside isolateModules so the switch can be set per test, which is why errors are matched by status: the classes are a fresh copy. */
const NOW = Date.now();
const ROW = {
  id: 'pd2', participantId: 'p-femi', code: 'B3', observationText: 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.',
  periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: new Date(NOW - 86400000), shownToPersonAt: null as Date | null, personAnswer: null as string | null, personAnsweredAt: null as Date | null,
  participant: {
    userId: 'u-femi',
    ground: { initiatorId: 'u-tunde', participants: [{ userId: 'u-tunde', user: { firstName: 'Tunde' } }, { userId: 'u-femi', user: { firstName: 'Femi' } }] },
  },
};

function serviceWith(switchOn: boolean, row: any = ROW) {
  let Svc: any;
  jest.isolateModules(() => {
    jest.doMock('./patterns-are-served', () => ({ PATTERNS_ARE_SERVED: switchOn }));
    Svc = require('./patterns.service').PatternsService;
  });
  jest.dontMock('./patterns-are-served');
  const update = jest.fn(async (args: any) => ({ ...row, ...args.data }));
  const prisma: any = { patternDetection: { findUnique: jest.fn(async () => (row ? JSON.parse(JSON.stringify(row)) : null)), update } };
  return { svc: new Svc(prisma, {} as any), update };
}

describe('the person a pattern is about says what is behind it', () => {
  it('keeps their words beside it, and hands back what they now read', async () => {
    const { svc, update } = serviceWith(true);
    const served = await svc.answerAsThePerson('pd2', 'u-femi', '  I built the deck and Ngozi did the pricing. I said "we" on the call.  ');
    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0][0].data;
    expect(data.personAnswer).toBe('I built the deck and Ngozi did the pricing. I said "we" on the call.');
    expect(data.personAnsweredAt).toBeInstanceOf(Date);
    expect(data.shownToPersonAt).toBeInstanceOf(Date);
    expect(served.heading).toBe('Others describe doing work they described as theirs');
    expect(served.theirWords).toBe('I built the deck and Ngozi did the pricing. I said "we" on the call.');
    expect(served.whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
    expect(JSON.stringify(served)).not.toMatch(/Claimed Work Inflation|"B3"/);
  });

  it('hides a card number typed into the answer before it is stored (decision 35)', async () => {
    const { svc, update } = serviceWith(true);
    await svc.answerAsThePerson('pd2', 'u-femi', 'I paid for the samples myself, card number 4111 1111 1111 1111.');
    expect(update.mock.calls[0][0].data.personAnswer).not.toContain('4111 1111 1111 1111');
    expect(update.mock.calls[0][0].data.personAnswer).toContain('[card number hidden]');
  });

  it('a colleague, the lead or an admin cannot answer it, and is told only that there is nothing here', async () => {
    for (const userId of ['u-ngozi', 'u-tunde', 'u-admin']) {
      const { svc, update } = serviceWith(true);
      await expect(svc.answerAsThePerson('pd2', userId, 'Not mine to say.')).rejects.toHaveProperty('status', 404);
      expect(update).not.toHaveBeenCalled();
    }
  });

  it('nor can anybody answer a pattern the person may not read yet, or one that does not exist', async () => {
    const early = serviceWith(true, { ...ROW, seenInSessions: [1, 2], periodsObserved: 2 });
    await expect(early.svc.answerAsThePerson('pd2', 'u-femi', 'Something.')).rejects.toHaveProperty('status', 404);
    const hidden = serviceWith(true, { ...ROW, code: 'E4' });
    await expect(hidden.svc.answerAsThePerson('pd2', 'u-femi', 'Something.')).rejects.toHaveProperty('status', 404);
    const none = serviceWith(true, null);
    await expect(none.svc.answerAsThePerson('nope', 'u-femi', 'Something.')).rejects.toHaveProperty('status', 404);
  });

  it('and nobody can answer anything while patterns are not served', async () => {
    const { svc, update } = serviceWith(false);
    await expect(svc.answerAsThePerson('pd2', 'u-femi', 'Something.')).rejects.toHaveProperty('status', 404);
    expect(update).not.toHaveBeenCalled();
  });

  it('an empty answer is asked for again, in a full sentence', async () => {
    const { svc } = serviceWith(true);
    await expect(svc.answerAsThePerson('pd2', 'u-femi', '   ')).rejects.toThrow('Write what is behind it in a sentence or two.');
    await expect(svc.answerAsThePerson('pd2', 'u-femi', 'x'.repeat(2001))).rejects.toHaveProperty('status', 400);
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach", where Femi
 * was told only he saw the pattern. There is no such reach now: the file runs with nothing put in
 * force, and Femi is told his lead will read it with his answer.
 */
describe('with no setting at all, the person answers and is told the lead reads it too (decision 86)', () => {
  it('keeps their words beside it, and is told only they see it (Hafsah, 2 November 2026: only the person reads a stored pattern now)', async () => {
    const { svc, update } = serviceWith(true);
    const served = await svc.answerAsThePerson('pd2', 'u-femi', 'I built the deck and Ngozi did the pricing.');
    expect(update).toHaveBeenCalledTimes(1);
    expect(served.theirWords).toBe('I built the deck and Ngozi did the pricing.');
    expect(served.canAnswer).toBe(true);
    expect(served.whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
    expect(served.whoSeesIt).not.toMatch(/Tunde/);
  });

  it('a colleague, the lead or an admin still cannot answer it', async () => {
    for (const userId of ['u-ngozi', 'u-tunde', 'u-admin']) {
      const { svc, update } = serviceWith(true);
      await expect(svc.answerAsThePerson('pd2', userId, 'Not mine to say.')).rejects.toHaveProperty('status', 404);
      expect(update).not.toHaveBeenCalled();
    }
  });
});
