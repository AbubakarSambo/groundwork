import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { aSpendingOrganisation, ORG, TODAY, phoneOf } from './a-spending-organisation-for-specs';
import { QUESTION_REFUSED } from './a-question-about-a-request';
import { aRequestsHistory } from './a-request-is-recorded';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';

/**
 * A QUESTION ABOUT A REQUEST TO SPEND, AND A REASON WITH A DECLINE (decision 85, item 2; build step 9),
 * AS EACH PERSON IS SERVED IT. The same as leave has had since build step 7.
 *
 * Baridi Appliances (a-spending-organisation-for-specs.ts), Monday 5 October 2026. Kamau, in
 * Operations, asked to spend KES 12,000 on tyres for the van. Fatuma, his manager, decides it. She asks
 * "Is this for the Kisumu van or the Nairobi one?". He answers "The Kisumu van, the front two are worn."
 * Then Kamau asks for KES 4,000 for a team lunch, and Fatuma declines it with the reason "We had one
 * last week." Grace is the admin; Wairimu leads Sales; Miriam is in Sales; Omar looks after finance.
 */
const QUESTION = 'Is this for the Kisumu van or the Nairobi one?';
const ANSWER = 'The Kisumu van, the front two are worn.';

beforeEach(() => jest.useFakeTimers({ now: TODAY, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
afterEach(() => jest.useRealTimers());

async function withTyres() {
  const o = aSpendingOrganisation();
  await o.svc.ask(ORG, 'u-kamau', { amount: 12000, what: 'tyres for the van' });
  const id = o.requests[o.requests.length - 1].id;
  o.sent.length = 0;
  return { ...o, id };
}

describe('Fatuma, who decides it, asks Kamau a question', () => {
  it('the request keeps waiting, and she reads her own question under it', async () => {
    const o = await withTyres();
    const board = await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    const row = board.waiting.find((w) => w.id === o.id)!;
    expect(o.requests.find((r) => r.id === o.id).status).toBe('waiting');
    expect(row.questions).toEqual(['You asked Kamau on 5 October, “Is this for the Kisumu van or the Nairobi one?”', 'Kamau has not answered yet.']);
    expect(row.mayDecide).toBe(true);
  });

  it('Kamau is told on WhatsApp, with the question itself, and that he can reply there', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    expect(o.sent).toEqual([{
      to: phoneOf('u-kamau'),
      text: 'Hi Kamau, Fatuma has a question about your request for KES 12,000 for tyres for the van. Fatuma asked, “Is this for the Kisumu van or the Nairobi one?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Fatuma to decide.',
      context: { kind: 'request-decided', params: ['Kamau', 'KES 12,000 for tyres for the van', 'asked about', 'Fatuma'] },
    }]);
  });

  it('after Kamau answers, Fatuma reads the answer and is told it on WhatsApp', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    o.sent.length = 0;
    await o.svc.answerAQuestion(o.as('u-kamau'), o.id, ANSWER);
    const row = (await o.svc.board(o.as('u-fatuma'), TODAY)).waiting.find((w) => w.id === o.id)!;
    expect(row.questions).toEqual([
      'You asked Kamau on 5 October, “Is this for the Kisumu van or the Nairobi one?”',
      'Kamau answered on 6 October, “The Kisumu van, the front two are worn.”',
    ]);
    expect(o.sent.map((s) => [s.to, s.text])).toEqual([[phoneOf('u-fatuma'),
      'Hi Fatuma, Kamau has answered your question about Kamau\'s request to spend KES 12,000 for tyres for the van. Kamau said, “The Kisumu van, the front two are worn.” Reply here to approve or decline it, or open Groundwork to read it first.']]);
  });

  it('nobody else may ask, and a decided request takes no question', async () => {
    const o = await withTyres();
    for (const u of ['u-kamau', 'u-wairimu', 'u-miriam', 'u-omar']) {
      await expect(o.svc.askAQuestion(o.as(u), o.id, QUESTION, TODAY)).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.notYours));
    }
    await o.svc.decide(o.as('u-fatuma'), o.id, 'approved', TODAY);
    await expect(o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY)).rejects.toThrow(new BadRequestException(QUESTION_REFUSED.notWaiting));
  });
});

describe('Kamau, who asked to spend', () => {
  it('reads the question under his own requests, and where to answer it', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    expect((await o.svc.mine(o.as('u-kamau'))).requests[0]).toMatchObject({
      where: 'Your request to spend KES 12,000 for tyres for the van is waiting for Fatuma.',
      questions: ['Fatuma asked you on 5 October, “Is this for the Kisumu van or the Nairobi one?”', 'You have not answered yet. You can answer it here or in Ask Groundwork.'],
      questionWaiting: { question: QUESTION, askedBy: 'Fatuma' },
      declinedBecause: null,
    });
  });

  it('reads it on Today, and Miriam does not', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    const grounds: any = { list: async () => [], listAwaitingApproval: async () => [] };
    const today = new WhatNeedsYouService(o.prisma, grounds, undefined, undefined, o.svc);
    const kamau = JSON.stringify(await today.forReader('u-kamau', 'kamau@baridi.example', ORG, 'MEMBER'));
    expect(kamau).toContain('Fatuma asked you a question about your request to spend KES 12,000 for tyres for the van.');
    expect(kamau).toContain('Fatuma asked, “Is this for the Kisumu van or the Nairobi one?” Your request is still waiting.');
    expect(JSON.stringify(await today.forReader('u-miriam', 'miriam@baridi.example', ORG, 'MEMBER'))).not.toContain('Kisumu van');
    const needs = (await today.forReader('u-kamau', 'kamau@baridi.example', ORG, 'MEMBER')).needs;
    expect(needs.find((n: any) => /^spend-question-/.test(n.key))?.action).toEqual({ label: 'Answer it', to: '/suite/mine' });
  });

  it('answers in Ask Groundwork: said back, and sent only on his yes', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    expect(await o.says('u-kamau', ANSWER)).toBe('Fatuma asked you about your request to spend KES 12,000 for tyres for the van, “Is this for the Kisumu van or the Nairobi one?” I will send Fatuma your answer as you wrote it, “The Kisumu van, the front two are worn.” Shall I send it?');
    expect(await o.says('u-kamau', 'yes')).toBe('I have sent your answer to Fatuma. Your request to spend is still waiting for Fatuma to decide.');
    expect((await o.svc.mine(o.as('u-kamau'))).requests[0].questions[1]).toBe('You answered on 6 October, “The Kisumu van, the front two are worn.”');
  });

  it('a no in Ask Groundwork keeps the question waiting for him', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    await o.says('u-kamau', ANSWER);
    expect(await o.says('u-kamau', 'no')).toBe('I have not sent it. Fatuma’s question is still waiting for your answer, so write your answer here when you are ready, or answer it under your requests to spend.');
    expect((await o.svc.mine(o.as('u-kamau'))).requests[0].questionWaiting).not.toBeNull();
  });

  it('answers on WhatsApp during a check-in, through the same answer', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    const q = await o.assistant.aQuestionWaitsForYourAnswer(ORG, 'pid-kamau');
    expect(q).toMatchObject({ suite: 'spend', askedBy: 'Fatuma', about: 'your request to spend' });
    expect(await o.assistant.answerAQuestionOnWhatsApp(ORG, 'pid-kamau', q!.id, ANSWER)).toBe('I have sent your answer to Fatuma. Your request to spend is still waiting for Fatuma to decide.');
  });

  it('only Kamau answers', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    await expect(o.svc.answerAQuestion(o.as('u-miriam'), o.id, 'yes')).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.onlyThePersonWhoAskedToSpend));
    await expect(o.svc.answerAQuestion(o.as('u-fatuma'), o.id, 'yes')).rejects.toThrow(ForbiddenException);
  });
});

describe('everybody else who already reads the request', () => {
  it('Grace, an admin, reads the question and answer with both names', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    await o.svc.answerAQuestion(o.as('u-kamau'), o.id, ANSWER);
    expect((await o.svc.board(o.as('u-grace'), TODAY)).waiting.find((w) => w.id === o.id)!.questions).toEqual([
      'Fatuma asked Kamau on 5 October, “Is this for the Kisumu van or the Nairobi one?”',
      'Kamau answered on 6 October, “The Kisumu van, the front two are worn.”',
    ]);
  });

  it('Wairimu, a lead of another team, and Omar in finance are not served the request; Miriam is refused the board', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    expect((await o.svc.board(o.as('u-wairimu'), TODAY)).waiting.map((w) => w.id)).not.toContain(o.id);
    /* Finance is no approver unless a step names it (Hafsah's plan of 2 November, step 0), so Omar, a member, is not let onto the board at all. */
    await expect(o.svc.board(o.as('u-omar'), TODAY)).rejects.toThrow(ForbiddenException);
    await expect(o.svc.board(o.as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('the record says a question was asked and answered, never the words', async () => {
    const o = await withTyres();
    await o.svc.askAQuestion(o.as('u-fatuma'), o.id, QUESTION, TODAY);
    await o.svc.answerAQuestion(o.as('u-kamau'), o.id, ANSWER);
    const { said } = await aRequestsHistory(o.prisma, ORG, 'spend', o.id, 'u-grace');
    expect(said).toEqual([
      'Kamau asked for it on 5 October.',
      'Groundwork told Fatuma on WhatsApp on 5 October.',
      'Fatuma asked Kamau a question about it on 5 October.',
      'Groundwork told Kamau on WhatsApp on 5 October.',
      'Kamau answered Fatuma\'s question on 5 October.',
      'Groundwork told Fatuma on WhatsApp on 5 October.',
    ]);
    expect(said.join(' ')).not.toContain('Kisumu');
  });
});

describe('Fatuma declines with a reason', () => {
  async function lunch() {
    const o = await withTyres();
    await o.svc.ask(ORG, 'u-kamau', { amount: 4000, what: 'a team lunch' });
    const id = o.requests[o.requests.length - 1].id;
    o.sent.length = 0;
    return { ...o, lunchId: id };
  }

  it('Kamau reads her reason under his request and on WhatsApp', async () => {
    const o = await lunch();
    await o.svc.decide(o.as('u-fatuma'), o.lunchId, 'declined', TODAY, 'We had one last week.');
    expect((await o.svc.mine(o.as('u-kamau'))).requests.find((r) => r.id === o.lunchId)).toMatchObject({
      status: 'declined',
      where: 'Fatuma declined your request to spend KES 4,000 for a team lunch.',
      declinedBecause: 'Fatuma said, “We had one last week.”',
    });
    expect(o.sent.map((s) => s.text)).toEqual(['Hi Kamau, your request for KES 4,000 for a team lunch was declined by Fatuma. Fatuma said, “We had one last week.” Open Groundwork to read it.']);
  });

  it('a decline with no reason reads as before', async () => {
    const o = await lunch();
    await o.svc.decide(o.as('u-fatuma'), o.lunchId, 'declined', TODAY);
    expect((await o.svc.mine(o.as('u-kamau'))).requests.find((r) => r.id === o.lunchId)!.declinedBecause).toBeNull();
    expect(o.sent.map((s) => s.text)).toEqual(['Hi Kamau, your request for KES 4,000 for a team lunch was declined by Fatuma. Open Groundwork to read it.']);
  });

  it('in Ask Groundwork, "decline Kamau\'s spending because ..." is said back with the reason first', async () => {
    const o = await lunch();
    await o.svc.decide(o.as('u-fatuma'), o.id, 'approved', TODAY);
    expect(await o.says('u-fatuma', 'decline Kamau\'s spending because we had one last week')).toBe(
      'You are declining Kamau\'s request to spend KES 4,000 for a team lunch, and I will tell Kamau your reason, “we had one last week.” Is that right?',
    );
    expect(await o.says('u-fatuma', 'yes')).toBe('Kamau\'s request to spend KES 4,000 for a team lunch is declined now. I have let Kamau know. They can read your reason in Groundwork.');
    expect(o.requests.find((r) => r.id === o.lunchId).declineReason).toBe('we had one last week');
  });

  it('the record says a reason was given, never the reason', async () => {
    const o = await lunch();
    await o.svc.decide(o.as('u-fatuma'), o.lunchId, 'declined', TODAY, 'We had one last week.');
    const { said } = await aRequestsHistory(o.prisma, ORG, 'spend', o.lunchId, 'u-kamau');
    expect(said).toContain('Fatuma declined it on 5 October and gave a reason.');
    expect(said.join(' ')).not.toContain('last week');
  });
});
