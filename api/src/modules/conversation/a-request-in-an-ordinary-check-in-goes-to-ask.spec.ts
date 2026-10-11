import { whereARequestInAnOrdinaryCheckInGoes, theSumsOnlyARequestSaid, WHERE_LEAVE_IS_ASKED_FOR, WHERE_SPENDING_IS_ASKED_FOR } from './a-request-in-an-ordinary-check-in-goes-to-ask';

/** User journeys F-9, as the person in an ordinary (not anchor) project check-in reads it. */
const suites = (on: string[]) => ({ organizationSuite: { findUnique: jest.fn(async ({ where }: any) => ({ isOn: on.includes(where.organizationId_suite.suite) })) } });
const ask = (prisma: any, message: string, last?: string, startedFrom: string | null = null) =>
  whereARequestInAnOrdinaryCheckInGoes(prisma, { organizationId: 'org1', startedFrom, message, theLastThingWeSaid: last });

describe('leave and spending said in an ordinary check-in', () => {
  it('leave: is told where to ask, in one plain sentence, and that nothing is sent from here', async () => {
    const r = await ask(suites(['leave']), 'I would also like leave on 27 and 28 October, please.');
    expect(r).toEqual({ say: 'To ask for leave, open Ask Groundwork and tell it which days you want off. Nothing is sent from this check-in.', replaceTheReply: false });
  });
  it('spending: is told where to ask, in one plain sentence', async () => {
    const r = await ask(suites(['spend']), 'I need to spend KES 5,000 on printing the launch flyers.');
    expect(r?.say).toBe('To ask for money to be approved, open Ask Groundwork and tell it the sum and what it is for. Nothing is sent from this check-in.');
  });
  it('is not told where when the organisation has not switched that on, so the sentence is always true', async () => {
    expect(await ask(suites([]), 'I need to spend KES 5,000 on printing the launch flyers.')).toBeNull();
  });
  it('is not told anything for a sentence that only mentions leave', async () => {
    expect(await ask(suites(['leave', 'spend']), 'I was on leave on Monday so the proposal slipped.')).toBeNull();
  });
  it('an anchor check-in keeps its own offer, and nothing is said here', async () => {
    expect(await ask(suites(['leave']), 'I would also like leave on 27 and 28 October, please.', undefined, 'anchor')).toBeNull();
  });
});

describe('"Yes, send it." after that sentence', () => {
  it('is answered with the same sentence, and the reply is the sentence and not the model\'s next question', async () => {
    for (const said of ['Yes, send it.', 'yes send it', 'Please send that.', 'Go ahead and submit it.']) {
      expect(await ask(suites(['leave']), said, `Thanks. ${WHERE_LEAVE_IS_ASKED_FOR}\n\nWhat will you do first?`)).toEqual({ say: WHERE_LEAVE_IS_ASKED_FOR, replaceTheReply: true });
    }
    expect(await ask(suites(['spend']), 'Yes, send it.', WHERE_SPENDING_IS_ASKED_FOR)).toMatchObject({ replaceTheReply: true });
  });
  it('is left alone when nothing of the kind was said before it', async () => {
    expect(await ask(suites(['leave']), 'Yes, send it.', 'What will you do first?')).toBeNull();
  });
  it('an ordinary answer after that sentence is an ordinary answer', async () => {
    expect(await ask(suites(['leave']), 'I will send the proposal on Friday.', WHERE_LEAVE_IS_ASKED_FOR)).toBeNull();
  });
});

describe('a sum said only to ask for it is not a goal', () => {
  it('KES 5,000 for flyers is the request\'s, so no target of 5,000 is kept', () => {
    expect([...theSumsOnlyARequestSaid(['I need to spend KES 5,000 on printing the launch flyers.'])]).toEqual([5000]);
  });
  it('a number they also said as a number they are working to stays', () => {
    expect([...theSumsOnlyARequestSaid(['I need to spend KES 5,000 on printing the flyers.', 'We are aiming for 5,000 flyers handed out by December.'])]).toEqual([]);
  });
});
