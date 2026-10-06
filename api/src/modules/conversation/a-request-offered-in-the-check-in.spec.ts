import { readFileSync } from 'fs';
import { join } from 'path';
import { withoutACannotApprove, aRequestAfterTheirTurn, whatTheYesOpens } from './a-request-offered-in-the-check-in';

/**
 * ANCHOR PIECES 26 AND 27: A REQUEST SAID IN THE CHECK-IN IS OFFERED THERE, AS WHATSAPP DOES (section 22; decision 105
 * item 4). The same reading and the same question; the yes is answered with the spec's sentence and a way to the form.
 */
function world(opts: { on?: boolean; offerOn?: boolean; startedFrom?: string | null; leaveOn?: boolean; spendOn?: boolean } = {}) {
  const items: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (opts.on === false ? null : where?.key === 'release.requestOfferInTheCheckIn' && opts.offerOn === false ? { value: { on: false } } : { value: { on: true } })) },
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => ({ isOn: where.organizationId_suite.suite === 'leave' ? !!opts.leaveOn : !!opts.spendOn })) },
    workItem: {
      findMany: jest.fn(async (a: any) => items.filter((i) => i.kind === a.where.kind && i.ownerParticipantId === a.where.ownerParticipantId)),
      create: jest.fn(async ({ data }: any) => { const r = { id: `w${items.length + 1}`, ...data }; items.push(r); return r; }),
      delete: jest.fn(async ({ where }: any) => { items.splice(items.findIndex((i) => i.id === where.id), 1); }),
    },
  };
  const turn = (message: string) => aRequestAfterTheirTurn(prisma, { groundId: 'g-1', organizationId: 'org-1', startedFrom: opts.startedFrom === undefined ? 'anchor' : opts.startedFrom, participantId: 'p-rukia', message });
  return { turn, items };
}

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a request said in the check-in, as the person reads it', () => {
  it('leave is offered with the WhatsApp question, and the yes opens Leave in the spec\'s words', async () => {
    const w = world({ leaveOn: true });
    expect((await w.turn("Can I take a day off on Friday?")).requestOffer).toEqual({ kind: 'leave', question: 'Shall I treat this as a leave request?', yes: 'Yes', no: 'No' });
    const yes = await w.turn('Yes');
    expect(yes.sayFirst).toBe("You can submit that through Leave here and it'll appear on your manager's board.");
    /* "on Friday" is a day she said, so the form is filled in with that one day; the rest of the answer is exactly the spec's. */
    const day = yes.openTheRequest?.prefill?.startsOn;
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${day}T00:00:00Z`).getUTCDay()).toBe(5);
    expect(yes.openTheRequest).toEqual({ kind: 'leave', suiteIsOn: true, says: "You can submit that through Leave here and it'll appear on your manager's board.", button: 'Request leave', prefill: { startsOn: day, endsOn: day } });
    expect(w.items).toEqual([]);
  });
  it('spending, with Spending off, says the organisation has the option, and gives no button', async () => {
    const w = world({ spendOn: false });
    expect((await w.turn('I need to spend KES 4,000 on the workshop.')).requestOffer?.question).toBe('Shall I treat this as a spending request?');
    const yes = await w.turn('yes please');
    expect(yes.openTheRequest).toEqual({ kind: 'spending', suiteIsOn: false, says: 'Your organisation also has the option to manage spending requests through Groundwork.', button: null });
  });
  it('a no, or carrying on, leaves nothing; and something that only happened is not a request', async () => {
    const w = world({ leaveOn: true });
    await w.turn("Can I take a day off on Friday?");
    expect(await w.turn('No')).toEqual({});
    expect(w.items).toEqual([]);
    expect((await w.turn('I was on leave on Monday.')).requestOffer).toBeUndefined();
  });
  it('nothing with the switch off, or on any other check-in', async () => {
    expect(await world({ on: false }).turn("Can I take a day off on Friday?")).toEqual({});
    expect(await world({ startedFrom: null }).turn("Can I take a day off on Friday?")).toEqual({});
  });
  it('the leave sentence when Leave is off is the spec\'s', () => {
    expect(whatTheYesOpens('leave', false).says).toBe('Your organisation also has the option to manage leave through Groundwork.');
  });
  it('the check-in reply carries both, says the yes first, and a request is never also offered as an idea', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toContain('...(request.requestOffer ? { requestOffer: request.requestOffer } : {}),');
    expect(src).toContain('if (request.sayFirst) answer.reply = [request.sayFirst, answer.reply]');
    expect(src).toContain('const idea = startedFrom && !request.requestOffer && !request.openTheRequest ? await afterTheirTurn(');
  });
});

describe('the reply never contradicts the offer (review of pieces 26 and 27)', () => {
  it('takes off "I can\'t directly approve time off. That\'s a conversation you\'d need to have with Rukia."', () => {
    const r = withoutACannotApprove("Thanks for telling me about the funeral. I can't directly approve time off. That's a conversation you'd need to have with Rukia.\n\nHow is the Naivas order going?");
    expect(r.text).toBe('Thanks for telling me about the funeral.\n\nHow is the Naivas order going?');
    expect(r.cut).toEqual(["I can't directly approve time off.", "That's a conversation you'd need to have with Rukia."]);
  });

  it('takes off "I can\'t approve that request directly."', () => {
    const r = withoutACannotApprove("I can't approve that request directly. What else is on your list this week?");
    expect(r.text).toBe('What else is on your list this week?');
  });

  it('leaves every other sentence alone, word for word', () => {
    const reply = 'Rukia approved the deck on Friday, so you can send it. What is still in your way?';
    expect(withoutACannotApprove(reply)).toEqual({ text: reply, cut: [] });
  });
});

describe('the offer is on, and can be switched off (request 165)', () => {
  it('with no row at all, Rukia is offered the request on an anchor check-in', async () => {
    const prisma: any = { platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where?.key === 'release.anchorScenario' ? { value: { on: true } } : null)) } };
    const { theRequestOfferIsShown } = await import('../admin/what-is-hidden-at-release');
    expect(await theRequestOfferIsShown(prisma)).toBe(true);
    expect(await theRequestOfferIsShown({ platformSetting: { findUnique: async () => { throw new Error('no table'); } } })).toBe(true);
  });
  it('with release.requestOfferInTheCheckIn set to off, Rukia is offered nothing and nothing is kept, on an anchor check-in', async () => {
    const w = world({ leaveOn: true, offerOn: false });
    expect(await w.turn('Can I take a day off on Friday?')).toEqual({});
    expect(w.items).toEqual([]);
  });
});

describe('what the form is filled in with: only what the person said, never a guess (request 165)', () => {
  it('leave: the days she gave, from her own words, and nothing for days that cannot be read without guessing', async () => {
    const w = world({ leaveOn: true });
    await w.turn('Can I take leave from 12 October to 14 October?');
    const asked = (await w.turn('Yes')).openTheRequest?.prefill;
    expect(asked?.startsOn).toMatch(/^\d{4}-10-12$/);
    expect(asked?.endsOn).toMatch(/^\d{4}-10-14$/);
    const vague = world({ leaveOn: true });
    await vague.turn('I need Monday and Wednesday off next week.');
    expect((await vague.turn('Yes')).openTheRequest?.prefill).toBeUndefined();
  });

  it('spending: the amount, what it is for and the currency she wrote', async () => {
    const w = world({ spendOn: true });
    await w.turn('Can I spend KES 15,000 on fuel for the van this week?');
    expect((await w.turn('Yes')).openTheRequest?.prefill).toEqual({ amount: 15000, what: 'fuel for the van this week', currency: 'KES' });
  });

  it('spending: an amount with no reason fills in the amount only, and a currency she did not write is not filled in', async () => {
    const w = world({ spendOn: true });
    await w.turn('I need to spend 4,000.');
    expect((await w.turn('Yes')).openTheRequest?.prefill).toEqual({ amount: 4000 });
  });

  it('is not served when the suite is off, because there is no form to fill in', async () => {
    const w = world({ spendOn: false });
    await w.turn('Can I spend KES 15,000 on fuel for the van this week?');
    expect((await w.turn('Yes')).openTheRequest?.prefill).toBeUndefined();
  });
});

describe('a day off said the way people say it is offered, and a day nobody asked for is never read (6 October)', () => {
  it.each([
    'Can I take Friday off next week? My daughter has a school event.',
    'Can I take Thursday and Friday off next week?',
    'I need Monday off.',
    'Please can I have next Monday off',
  ])('offers leave for %s', async (said) => {
    const w = world({ leaveOn: true });
    expect((await w.turn(said)).requestOffer).toEqual({ kind: 'leave', question: 'Shall I treat this as a leave request?', yes: 'Yes', no: 'No' });
  });

  it('does not offer leave for what somebody tells their check-in, or asks about without asking for it', async () => {
    for (const said of ['I was on leave on Monday.', 'Marketing is off to a good start this week.', 'What leave have I asked for, and what was decided?']) {
      expect((await world({ leaveOn: true }).turn(said)).requestOffer).toBeUndefined();
    }
  });

  it('offers spending for a sum asked for without the word spend', async () => {
    expect((await world({ spendOn: true }).turn('I need $4,000 approved for the workshop.')).requestOffer?.kind).toBe('spending');
  });
});

describe('what the payment form is filled in with when the sum is asked for without the word spend (6 October)', () => {
  it('reads the amount and the reason, and no currency from "shillings" alone', async () => {
    const w = world({ spendOn: true });
    await w.turn('I need 15,000 shillings approved for fuel for the van this week.');
    expect((await w.turn('Yes')).openTheRequest?.prefill).toEqual({ amount: 15000, what: 'fuel for the van this week' });
  });

  it('keeps a currency the person wrote, and reads a thousand', async () => {
    const { theSumAskedFor } = await import('./a-request-offered-in-the-check-in');
    expect(theSumAskedFor('I need KES 4k approved for the workshop.')).toEqual({ amount: 4000, what: 'the workshop', currency: 'KES' });
    expect(theSumAskedFor('I need $4,000 approved')).toEqual({ amount: 4000, currency: 'USD' });
  });

  it('reads nothing where it would have to guess: two sums, or no sum', async () => {
    const { theSumAskedFor } = await import('./a-request-offered-in-the-check-in');
    expect(theSumAskedFor('I need 5,000 or maybe 8,000 approved for fuel.')).toEqual({});
    expect(theSumAskedFor('I need money approved for fuel.')).toEqual({});
    expect(theSumAskedFor('I need 12 chairs for the office.')).toEqual({});
  });
});
