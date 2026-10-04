import { eachLineInTheirName, eachLineWithTheKindThatFits, theKindThatFits } from './what-each-person-said-is-in-their-name';

/** Requests 127 item 4 and 129 item 5: lines typed INTENT that intend nothing, as the lead and the person read them. */
const row = (items: any[]) => [{ participantId: 'p-aisha', name: 'Aisha Wanjiku', items }];
describe('a line typed as an intention', () => {
  it.each([
    ['I close refunds when I send the instruction, because the old rule said so.'],
    ['Zainab Suleiman, partnerships.'],
    ['I believed Zainab was driving this forward.'],
  ])('is sent with no kind when it intends nothing: %s', (text) => {
    expect(theKindThatFits(text, 'INTENT')).toBeNull();
    const served: any = eachLineWithTheKindThatFits(eachLineInTheirName(row([{ text, type: 'INTENT', saidAs: 'their-words' }]), 'u-other'));
    expect(served[0].items[0].type).toBeNull();
    expect(served[0].items[0].text).toContain(text.replace(/[.!?]+$/, ''));
  });
  it.each([
    ['I will send the data room on Wednesday.'],
    ["I'm going to visit Kisumu next week."],
    ['I want to move the refund rule to the helpdesk.'],
    ['My responsibility is to ensure the system is deployed and available for use in my branch.'],
  ])('keeps the kind of a line that intends: %s', (text) => {
    expect(theKindThatFits(text, 'INTENT')).toBe('INTENT');
  });
  it('never changes the kind of any other line, or the person\'s words', () => {
    expect(theKindThatFits('I closed 14 tickets.', 'PROGRESS')).toBe('PROGRESS');
    expect(theKindThatFits('I close refunds.', 'COMMITMENT')).toBe('COMMITMENT');
  });
});

import { PartyType } from '@prisma/client';
import { boardAs, person, answered } from './the-switchboards-sections-harness';
const line = (id: string, participantId: string, type: string, text: string) => ({
  id, participantId, type, text, checkInId: `c1-${participantId}`, recallBased: true, anchoredOrigin: null, anchoredDocumentId: null,
  confirmedAt: null, documentSays: null, documentSaysId: null, createdAt: new Date('2026-09-16T16:00:00Z'), disputedAt: null,
});
describe('on the board, as the lead and as Aisha', () => {
  const LINES = [line('e-a', 'p-aisha', 'INTENT', 'I close refunds when I send the instruction, because the old rule said so.'), line('e-b', 'p-aisha', 'INTENT', 'I will send the photo of the delivery sheets on Friday.')];
  const SETUP: any = {
    initiatorId: 'u-lead', label: 'Support desk', people: [{ ...person('p-lead', 'u-lead', 'Bisi', 'Adeyemi', PartyType.INITIATOR), managingOnly: true }, person('p-aisha', 'u-aisha', 'Aisha', 'Wanjiku')],
    checkIns: [answered('p-aisha', 1)], lines: LINES, turns: LINES.map((l) => ({ checkInId: l.checkInId, content: l.text })),
  };
  it.each([['u-lead'], ['u-aisha']])('%s reads the habit with no kind and the plan as an intention', async (reader) => {
    const b: any = await boardAs(SETUP, reader, 'MEMBER');
    const items = (b.whoOwnsWhat ?? []).flatMap((r: any) => r.items ?? []);
    const habit = items.find((i: any) => /close refunds/.test(i.text));
    const plan = items.find((i: any) => /photo of the delivery sheets/.test(i.text));
    if (habit) expect(habit.type).toBeNull();
    if (plan) expect(plan.type).toBe('INTENT');
    expect(habit || plan).toBeTruthy();
  });
});
