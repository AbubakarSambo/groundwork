import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, NGOZI, SALES_RUN, SETUP_ADMIN, boardAs, commitment, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * QUESTIONS FOR THE LEAD, AS EACH READER READS THEM (request 70, the switchboard's "Questions for the
 * lead": questions only the lead can answer). Built from rows, so the same facts ask the same questions:
 * a commitment said in three sessions with no outcome, a commitment the record says two things about, and
 * a wait nobody has gone back about. Words from the sales run: Femi's "I will call them again." (said in
 * sessions 1 to 3), and Kwame's follow-up, marked done and then said again.
 */
const RECORD: Setup = {
  ...SALES_RUN,
  commitments: [
    ...(SALES_RUN.commitments ?? []).filter((c: any) => c.id !== 'k-kwame'),
    commitment('k-kwame', 'p-kwame', 'I\'ll be following up with each client directly over the next week to chase down the missing documents.', { statedInSession: 1, saidWordForWord: true, status: 'DONE', settledBy: 'SAID', settledInCheckInId: 'c1-p-kwame', saidAgainIn: [2] }),
    commitment('k-femi-2', 'p-femi', 'I will call them again.', { statedInSession: 1, saidWordForWord: true, saidAgainIn: [2, 3] }),
  ],
  dependencies: [...(SALES_RUN.dependencies ?? []), handoff('d-femi-ngozi', 'p-femi', 'the Head of Credit\'s contact', { onParticipantId: 'p-ngozi', status: 'WAITING' })],
};
const questions = (b: any) => (b.questionsForTheLead ?? []).map((q: any) => q.question);
const THE_FOUR = [
  'Has Femi Okonkwo\'s commitment, "I will call them again", happened, or is it still wanted?',
  'Is Kwame Mensah\'s commitment, "I\'ll be following up with each client directly over the next week to chase down the missing documents", done, or still to do?',
  'Has anybody gone back to Ngozi Eze about the Head of Credit\'s contact, which Femi Okonkwo is waiting for?',
  'What has been tried to get a date for the credit decision from Mr. Adebayo, which Ngozi Eze is waiting for?',
];

describe('Questions for the lead, as each person reads them', () => {
  it('Bisi, who runs it, reads each question with what the record holds and what it cannot say', async () => {
    const b = await boardAs(RECORD, ...BISI);
    expect(questions(b)).toEqual(THE_FOUR);
    expect(b.questionsForTheLead.map((q: any) => q.because)).toEqual([
      'Femi Okonkwo said it in sessions 1, 2 and 3, and nobody has said whether it happened.',
      'Kwame Mensah\'s commitment, "I\'ll be following up with each client directly over the next week to chase down the missing documents", was marked done in session 1, and in session 2 Kwame Mensah said it again as something still to do.',
      'Nothing on record says anybody has, so only you can find out whether it was raised outside the check-in.',
      'Nothing on record says anybody has chased it, so only you can find out what was done outside the check-in.',
    ]);
  });

  it('the admin who set it up, and an admin who only reads an ordinary check-in, read the same questions, with Bisi named as the one who can find out', async () => {
    for (const b of [await boardAs({ ...RECORD, createdByUserId: 'u-setup' }, ...SETUP_ADMIN), await boardAs(RECORD, ...JUMA)]) {
      expect(questions(b)).toEqual(THE_FOUR);
      expect(b.questionsForTheLead[2].because).toBe('Nothing on record says anybody has, so only Bisi Adeyemi can find out whether it was raised outside the check-in.');
    }
  });

  it('nobody taking part reads them, not even the questions about themselves', async () => {
    for (const reader of [FEMI, NGOZI, KWAME]) expect((await boardAs(RECORD, reader[0], reader[1])).questionsForTheLead).toBeUndefined();
  });

  it('on an evaluation check-in, the person reviewed reads none, and an admin with no access reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP };
    expect((await boardAs(evaluation, ...KWAME)).questionsForTheLead).toBeUndefined();
    expect(questions(await boardAs(evaluation, ...BISI))).toEqual(THE_FOUR);
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.questionsForTheLead).toBeUndefined();
  });

  it('a wait somebody has gone back about is not asked about', async () => {
    const tried: Setup = { ...RECORD, dependencies: (RECORD.dependencies ?? []).map((d: any) => ({ ...d, triedSaid: 'I emailed twice.' })) };
    expect(questions(await boardAs(tried, ...BISI))).toEqual(THE_FOUR.slice(0, 2));
  });

  it('is left out, rather than served empty, when there is nothing only the lead can answer', async () => {
    expect((await boardAs({ ...SALES_RUN, dependencies: [] }, ...BISI)).questionsForTheLead).toBeUndefined();
  });

  it('asks, and never concludes or labels anybody', async () => {
    const all = JSON.stringify((await boardAs(RECORD, ...BISI)).questionsForTheLead);
    expect(all).not.toMatch(/at risk|unreliable|poor|weak|score|rating|verdict|slow|behind|lied/i);
  });
});
