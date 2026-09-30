import { aSetupConversation, aPaste } from './request-92-harness';
import { whatWeTookFromThat } from './a-dump-is-many-things';

/**
 * REQUEST 92, POINTS 6 TO 11, in the setup conversation: what the lead reads, and what a yes keeps.
 */

describe('point 6: the list a paste gives keeps one bullet to a line, as the confirmation does', () => {
  it('the say-back the lead is shown and the proposal stored are the list as written', async () => {
    const paste = {
      success: 'Every Kilimani shop has paid its deposit.',
      teamTargets: [{ name: 'Shops signed', target: 4 }, { name: 'Deposits paid', target: 10 }],
      strategy: ['Lead with the cold chain.', 'Visit every shop twice.'],
    } as any;
    const { service } = aSetupConversation({ paste });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'z'.repeat(500) }]);
    expect(out.proposal.say).toBe(whatWeTookFromThat(aPaste(paste), { asking: true }));
    expect(out.proposal.say).toContain('\n- Shops signed: 4\n- Deposits paid: 10\n');
    expect(out.proposal.say).toContain('\n- Lead with the cold chain.\n- Visit every shop twice.\n');
    expect(out.proposal.say).not.toContain('Go wide Pricing');
  });
});

/* ------------------------------------------------------------------------------------------------ */

import { whatTheModelsReplyShows, withoutTheWordGround, dropsAPromiseWithNothingToKeep } from './nothing-proposed-that-nobody-said';
import { theContextWeHave } from '../documents/what-a-document-holds';
import { whatWasRecordedFromADocument } from '../documents/what-was-recorded-from-a-document';
import { writeADocumentsNumbers } from '../documents/write-a-documents-numbers';

describe('point 7: nothing is said as saved before the yes, and the model says nothing beside a Yes and No', () => {
  it('a sentence that says something is already added is dropped, in both of the ways it was read live', () => {
    const said = 'Good means every Kilimani shop has paid its deposit is added as what doing well looks like. I have added the pricing rule to the context. What would you like to work on next?';
    expect(dropsAPromiseWithNothingToKeep(said, false)).toBe('What would you like to work on next?');
  });

  it('a sentence with the bare word "ground" is dropped, and the word Groundwork is left alone', () => {
    expect(withoutTheWordGround('That is a lot of ground to cover. Groundwork will ask Amani. How long should this run?'))
      .toBe('Groundwork will ask Amani. How long should this run?');
    expect(withoutTheWordGround('This ground has no dates yet.')).toBe('');
  });

  it('with a proposal attached, the structural rule still keeps only the model\'s question', () => {
    expect(whatTheModelsReplyShows('I have noted that. How long should it run?', true)).toBe('How long should it run?');
  });

  it('asked for a Yes and No answer, a reply carries the list and no question the lead would have to type', async () => {
    const { service } = aSetupConversation({
      reply: 'Thank you. The goal is added as what doing well looks like. What should this check-in be called, and how long should it run?',
      paste: { success: 'Every Kilimani shop has paid its deposit.', teamTargets: [{ name: 'Shops signed', target: 4, notToExceed: false }] },
    });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'z'.repeat(500) }], { yesOrNo: true });
    expect(out.proposal.say).toContain('Record all of this?');
    expect(out.reply).not.toMatch(/\?/);
    expect(out.reply).not.toMatch(/added as what doing well/);
    /* The old route, which the lead answers by typing, is unchanged. */
    const { service: old } = aSetupConversation({
      reply: 'Thank you. What should this check-in be called?',
      paste: { success: 'Every Kilimani shop has paid its deposit.', teamTargets: [{ name: 'Shops signed', target: 4, notToExceed: false }] },
    });
    const before: any = await old.contextChat('g1', 'userLead', [{ role: 'user', content: 'z'.repeat(500) }]);
    expect(before.reply).toContain('What should this check-in be called?');
  });
});

describe('point 7: the reader is "you", and a number for somebody else names them', () => {
  const held: any = {
    fileName: 'Q3 targets.xlsx', whatItIs: 'It is a Q3 target sheet.',
    forOnePerson: [
      { who: 'Amani Wekesa', what: 'cookers delivered', target: 3, by: '9 October', ownerParticipantId: 'pA' },
      { who: 'Rukia Otieno', what: 'shops signed', target: 4, ownerParticipantId: 'pR' },
    ],
    forEverybody: [], dates: [], unmatched: [],
  };

  it("Amani, reading her own document, reads \"Your target\", and Rukia's number still names Rukia", () => {
    const said = theContextWeHave(held, { reader: { participantId: 'pA' } })!;
    expect(said).toContain('Your target for cookers delivered is 3 by 9 October.');
    expect(said).toContain("Rukia Otieno's target for shops signed is 4.");
    expect(said).not.toContain("Amani Wekesa's target");
  });

  it('Rukia reads "Your target for shops signed is 4.", matched by name where the read predates the owner id', () => {
    const older = { ...held, forOnePerson: held.forOnePerson.map(({ ownerParticipantId, ...row }: any) => row) };
    const said = theContextWeHave(older, { reader: { name: 'Rukia Otieno' } })!;
    expect(said).toContain('Your target for shops signed is 4.');
    expect(said).toContain("Amani Wekesa's target for cookers delivered is 3 by 9 October.");
  });

  it('a reader with no match reads every name, as before', () => {
    expect(theContextWeHave(held)).toContain("Amani Wekesa's target for cookers delivered is 3 by 9 October.");
  });

  it('after a yes, the lead is told whose number was set', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.xlsx', forAPerson: 1, forEveryone: 0, reader: 'setup', owners: ['Amani'] }))
      .toBe('I have recorded this from Q3 targets.xlsx. One number is now set for Amani. It is marked as set by you, and Amani has not seen it yet. You can see it on the Context and resources page now, and every check-in will ask about it.');
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.xlsx', forAPerson: 1, forEveryone: 0, reader: 'check-in', owners: ['you'] }))
      .toBe('I have recorded this from Q3 targets.xlsx. One number is now set for you. Nobody is measured against a number until they have seen it.');
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.xlsx', forAPerson: 3, forEveryone: 0, reader: 'setup', owners: ['Amani', 'Amani', 'you'] }))
      .toContain('Three numbers are now set, for Amani and you. Each one is marked as set by you, and Amani has not seen them yet.');
  });

  it('written through the real writer, the sentence names the person the number belongs to', async () => {
    const prisma: any = {
      groundObjective: { findMany: async () => [], createMany: async () => ({}) },
      groundContextItem: { create: async () => ({}) },
      groundDocument: { update: async () => ({}) },
      groundParticipant: { findMany: async () => [{ id: 'pA', email: 'amani@example.test', nameGiven: null, user: { firstName: 'Amani', lastName: 'Wekesa' } }] },
    };
    const said = await writeADocumentsNumbers(prisma, {
      groundId: 'g1', documentId: 'd1', fileName: 'Q3 targets.xlsx', waiting: [{ name: 'cookers delivered', target: 3, ownerParticipantId: 'pA' }],
      holds: {}, setByParticipantId: 'pL', sortOrderBase: 0, addNote: false, reader: 'setup',
    });
    expect(said).toContain('One number is now set for Amani. It is marked as set by you, and Amani has not seen it yet.');
    expect(said).not.toContain('the person it belongs to');
  });

  it('a paste said back to the lead says "You" on her own line and names everybody else', () => {
    const got = aPaste({ forPeople: [
      { who: 'Rukia Otieno', participantId: 'pR', expectation: 'sign four shops', targets: [{ name: 'shops signed', number: 4 }] },
      { who: 'Amani Wekesa', participantId: 'pA', expectation: 'deliver three cookers', targets: [] },
    ] });
    const said = whatWeTookFromThat(got, { asking: true, reader: { participantId: 'pR' } })!;
    expect(said).toContain('- You: "sign four shops" (shops signed: 4)');
    expect(said).toContain('- Amani Wekesa: "deliver three cookers"');
    expect(said).not.toContain('Rukia Otieno');
  });
});
