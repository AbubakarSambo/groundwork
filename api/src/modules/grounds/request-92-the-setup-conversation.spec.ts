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
    /* Each number says which way it goes, so the yes confirms it (decision 69). */
    expect(out.proposal.say).toContain('\n- Shops signed: 4, an aim to reach\n- Deposits paid: 10, an aim to reach\n');
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

/* ------------------------------------------------------------------------------------------------ */

import { A_DUMP_SCHEMA } from './a-dump-is-many-things';
import { theLeadsOwnQuestionIfAddressedToThem } from './a-question-asked-word-for-word';

const PEOPLE = [
  { id: 'pA', email: 'amani@example.test', nameGiven: null, roleAsDescribed: null, managingOnly: false, userId: 'uA', user: { firstName: 'Amani', lastName: 'Wekesa' } },
  { id: 'pR', email: 'rukia@example.test', nameGiven: null, roleAsDescribed: null, managingOnly: false, userId: 'userLead', user: { firstName: 'Rukia', lastName: 'Otieno' } },
];

function readingOf(pasted: string, question: string, drafted: string) {
  return aSetupConversation({
    ground: { participants: PEOPLE },
    extract: (_s, _h, tool) => tool.name === (A_DUMP_SCHEMA as any).name
      ? { questionsForPeople: [{ personName: 'Amani Wekesa', question }] }
      : { question: drafted },
  });
}

describe('point 9: a question the lead wrote to the person is kept in her words', () => {
  const DRAFT = 'Do you know if the Kilimani shops have paid their deposits yet?';

  it('"Have the Kilimani shops paid their deposits yet?" stays exactly that', async () => {
    const pasted = 'Amani, ' + 'x'.repeat(10) + '\nAsk Amani: Have the Kilimani shops paid their deposits yet?\n' + 'y'.repeat(400);
    const { service, anthropic } = readingOf(pasted, 'whether the Kilimani shops have paid their deposits yet', DRAFT);
    const got = await (service as any).whatAPasteGives('g1', pasted);
    expect(got.questionsForPeople[0].exactQuestion).toBe('Have the Kilimani shops paid their deposits yet?');
    /* No model was asked to tidy a question that was already one. */
    expect(anthropic.extract.mock.calls.filter((c: any[]) => c[2].name !== (A_DUMP_SCHEMA as any).name)).toHaveLength(0);
  });

  it('the list the lead reads says the same words, and so does the stored proposal', async () => {
    const pasted = 'Amani - Have the Kilimani shops paid their deposits yet?\n' + 'y'.repeat(450);
    const { service } = readingOf(pasted, 'whether the Kilimani shops have paid their deposits yet', DRAFT);
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: pasted }], { yesOrNo: true });
    expect(out.proposal.say).toContain('Groundwork will ask Amani Wekesa: "Have the Kilimani shops paid their deposits yet?"');
    expect(out.proposal.say).not.toContain('Do you know if');
  });

  it('a question written about them, not to them, is still drafted as before', async () => {
    const pasted = 'Ask Amani whether the Kilimani shops have paid their deposits yet.\n' + 'y'.repeat(450);
    const { service } = readingOf(pasted, 'whether the Kilimani shops have paid their deposits yet', DRAFT);
    const got = await (service as any).whatAPasteGives('g1', pasted);
    expect(got.questionsForPeople[0].exactQuestion).toBe(DRAFT);
  });

  it('a question that names the person, or says she, is not kept as written', () => {
    expect(theLeadsOwnQuestionIfAddressedToThem('Has Amani sent the price list?', 'has Amani sent the price list', { name: 'Amani' })).toBeNull();
    expect(theLeadsOwnQuestionIfAddressedToThem('Has she sent the price list?', 'has she sent the price list', { name: 'Amani' })).toBeNull();
    expect(theLeadsOwnQuestionIfAddressedToThem('Have you sent the price list?', 'have you sent the price list', { name: 'Amani' })).toBe('Have you sent the price list?');
  });
});

/* ------------------------------------------------------------------------------------------------ */

import { aLengthAndNothingElse } from './nothing-proposed-that-nobody-said';

describe('point 10: a length answer is only ever read as a length', () => {
  it.each([
    ['It should run for 13 weeks.', 91],
    ['13 weeks', 91],
    ['about three months', 90],
    ['let us make it a quarter', 90],
    ['for 6 weeks please', 42],
  ])('"%s" is %s days and nothing else', (said, days) => {
    expect(aLengthAndNothingElse(said)).toBe(days);
  });

  it.each([
    'Doing well means every Kilimani shop has paid its deposit.',
    'It should run for 13 weeks, and doing well means every shop has paid.',
    'Amani should sign 4 shops in 6 weeks.',
    'hello',
  ])('"%s" is not only a length', (said) => {
    expect(aLengthAndNothingElse(said)).toBeNull();
  });

  const SET_UP = { timelineStated: true, cadenceStated: true };

  it('while what doing well looks like is the open question, "It should run for 13 weeks." is offered as a length', async () => {
    const { service } = aSetupConversation({
      ground: SET_UP,
      extract: () => ({ success: 'It should run for 13 weeks.' }),
    });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'It should run for 13 weeks.' }], { yesOrNo: true });
    expect(out.proposal.gap).toBe('timeline');
    expect(out.proposal.say).toBe('I will set this to run for 13 weeks.');
  });

  it('and the yes sets the length, and records nothing as what doing well looks like', async () => {
    const { service, writes } = aSetupConversation({
      ground: { ...SET_UP, initiatorId: 'userLead' },
      extract: () => ({ success: 'It should run for 13 weeks.' }),
    });
    const update = jest.spyOn(service as any, 'updateTimeline').mockResolvedValue({});
    const out: any = await service.applyContextProposal('g1', 'userLead', { said: 'It should run for 13 weeks.', history: [] });
    expect(update).toHaveBeenCalledWith('g1', 'userLead', { timelineDays: 91 });
    expect(out.say).toBe('I have set this to run for 13 weeks.');
    expect(writes.filter((w) => w.startsWith('groundBaseline'))).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe('point 11: a question for one person, through the real grounds code', () => {
  const PEOPLE2 = PEOPLE.map((p) => ({ ...p }));
  function withPeople(extract?: (s: string, h: any[], t: any) => any, seed: Record<string, any> = {}) {
    return aSetupConversation({
      ground: { participants: PEOPLE2, status: 'ACTIVE', endState: null },
      seed: {
        groundParticipant: { findMany: async () => PEOPLE2, findFirst: async ({ where }: any) => PEOPLE2.find((p) => p.id === where?.id) ?? null },
        ...seed,
      },
      extract,
    });
  }

  it('finds the person, and works out the question Groundwork would ask, writing nothing', async () => {
    const { service, writes } = withPeople(() => ({ question: 'Have the Kilimani shops paid their deposits yet?' }));
    const out = await service.theQuestionForAPerson('g1', 'userLead', { name: 'Amani', leadWords: 'Ask Amani whether the Kilimani shops have paid' });
    expect(out).toEqual({ participantId: 'pA', who: 'Amani Wekesa', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' });
    expect(writes).toEqual([]);
  });

  it('her own question, written to the person, is kept in her words', async () => {
    const { service } = withPeople(() => ({ question: 'Do you know if the Kilimani shops have paid their deposits yet?' }));
    const out = await service.theQuestionForAPerson('g1', 'userLead', { name: 'Amani', leadWords: 'Ask Amani: Have the Kilimani shops paid their deposits yet?' });
    expect(out.exactQuestion).toBe('Have the Kilimani shops paid their deposits yet?');
  });

  it('a name that is not on the check-in is said plainly, and nothing is asked', async () => {
    const { service } = withPeople();
    await expect(service.theQuestionForAPerson('g1', 'userLead', { name: 'Zawadi', leadWords: 'Ask Zawadi whether the shops paid' }))
      .rejects.toThrow('I cannot find anybody called Zawadi on this check-in, so nothing was asked. Say the name as it is on the check-in and I will try again.');
  });

  /* Changed 2 October 2026: this step now refuses with the same sentence as every setup change (decisions 63
     and 72, mayConfirmSetupOn), as the yes that keeps the question already did. */
  it('a participant cannot ask anybody anything through it', async () => {
    const { service } = withPeople();
    await expect(service.theQuestionForAPerson('g1', 'uA', { name: 'Rukia', leadWords: 'Ask Rukia whether the shops paid' }))
      .rejects.toThrow('Only the person who runs this check-in can change how it is set up. An admin can only do that once that person has left the organisation. Nothing was changed.');
  });

  it('the yes keeps the question for the lead alone and confirms the very sentence she read', async () => {
    const created: any[] = [];
    const lines: any[] = [];
    const { service } = withPeople(undefined, {
      groundContextItem: {
        create: async ({ data }: any) => { const row = { id: 'q1', ...data }; created.push(row); lines.push(row); return row; },
        findFirst: async ({ where }: any) => lines.find((l) => l.id === where.id) ?? null,
        update: async ({ where, data }: any) => { Object.assign(lines.find((l) => l.id === where.id), data); return lines.find((l) => l.id === where.id); },
      },
    });
    const out: any = await service.keepAQuestionForAPerson('g1', 'userLead', { participantId: 'pA', leadWords: 'Ask Amani whether the Kilimani shops have paid', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' });
    expect(created[0]).toMatchObject({ kind: 'QUESTION_FOR_PERSON', audience: 'LEAD_ONLY', aboutParticipantId: 'pA', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' });
    expect(lines[0].questionConfirmedAt).toBeInstanceOf(Date);
    expect(out.say).toBe('I have confirmed it. Groundwork will ask Amani Wekesa "Have the Kilimani shops paid their deposits yet?" in their next check-in, word for word.');
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe('the whole paste, end to end: the sentence participants are told is written only when the list showed it', () => {
  const PASTE = 'Every Kilimani shop has paid its deposit by the end of the quarter. '.repeat(10);
  const TOLD = 'This check-in is about how the Kilimani shops are doing this quarter.';

  function aLeadsCheckIn() {
    const updates: any[] = [];
    const harness = aSetupConversation({
      ground: { participants: PEOPLE, status: 'ACTIVE', endState: null },
      seed: {
        ground: {
          findUnique: async () => ({ id: 'g1', label: 'Sales team, Q3', organizationId: 'org1', initiatorId: 'userLead', scenario: 'OKR_ALIGNMENT', timelineDays: 90, timelineStated: false, cadence: 'WEEKLY', cadenceStated: false, brief: null, status: 'ACTIVE', endState: null, participants: PEOPLE, objectives: [] }),
          update: jest.fn(async (args: any) => { updates.push(args); return {}; }),
        },
        groundBaseline: { findFirst: async () => null, create: jest.fn(async () => ({})) },
        groundParticipant: { findMany: async () => PEOPLE },
      },
      paste: { success: 'Every Kilimani shop has paid its deposit.' },
    });
    return { ...harness, updates };
  }

  it('the list showed the sentence, so the yes writes exactly that sentence', async () => {
    const { service, updates } = aLeadsCheckIn();
    jest.spyOn(service as any, 'theTellingAPasteWouldWrite').mockResolvedValue(TOLD);
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    expect(chat.proposal.say).toContain(`When you say yes, people taking part will be told this about the check-in.\n“${TOLD}”`);
    expect(updates).toEqual([]);

    const applied = await service.applyContextProposal('g1', 'userLead', {
      said: PASTE,
      history: [{ role: 'user', content: PASTE }, { role: 'assistant', content: chat.proposal.say }],
    });
    expect(applied.changed).toBe('everything');
    expect(updates).toEqual([expect.objectContaining({ data: { toldToParticipants: TOLD } })]);
    expect(applied.say).toContain(`People taking part have now been told this about the check-in.\n“${TOLD}”`);
  });

  it('the list showed none, so the yes writes none, and says none', async () => {
    const { service, updates } = aLeadsCheckIn();
    jest.spyOn(service as any, 'theTellingAPasteWouldWrite').mockResolvedValue(null);
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    expect(chat.proposal.say).not.toContain('people taking part will be told');
    const applied = await service.applyContextProposal('g1', 'userLead', {
      said: PASTE,
      history: [{ role: 'user', content: PASTE }, { role: 'assistant', content: chat.proposal.say }],
    });
    expect(applied.changed).toBe('everything');
    expect(updates).toEqual([]);
    expect(applied.say).not.toContain('have now been told');
  });

  it('a yes with no list behind it, as when the conversation is carried without it, writes none either', async () => {
    const { service, updates } = aLeadsCheckIn();
    jest.spyOn(service as any, 'theTellingAPasteWouldWrite').mockResolvedValue(TOLD);
    await service.applyContextProposal('g1', 'userLead', { said: PASTE, history: [{ role: 'user', content: PASTE }] });
    expect(updates).toEqual([]);
  });
});

describe('the list a paste gives has no sentence that ends in a colon', () => {
  it('not one line, for any kind of line a paste can hold, before the yes or after it', () => {
    const everything = aPaste({
      success: 'Every Kilimani shop has paid its deposit.',
      teamTargets: [{ name: 'Shops signed', target: 4, notToExceed: false }],
      forPeople: [{ who: 'Amani Wekesa', participantId: 'pA', expectation: 'sign four shops', targets: [{ name: 'shops signed', number: 4 }] }],
      dates: [{ what: 'quarter ends', when: '31 December' }],
      strategy: ['Lead with the cold chain.'], waysOfWorking: ['Every deal has one owner.'], notes: ['Kisumu reopens in October.'],
      openDecisions: ['Whether to hire a second driver.'], notSettled: ['Whether the depot moves.'],
      aboutPeople: [{ who: 'Amani Wekesa', participantId: 'pA', observation: 'Slow to answer the regional office.' }],
      commitments: [
        { who: 'Amani Wekesa', participantId: 'pA', action: 'send the price list', outcome: null, when: 'Friday', theySaidIt: true },
        { who: null, participantId: null, action: 'clean up the CRM', outcome: null, when: null, theySaidIt: false },
      ],
      questionsForPeople: [{ who: 'Amani Wekesa', participantId: 'pA', question: 'x', exactQuestion: 'Did the proposal go out?' }],
      betweenPeople: [{ who: ['Amani Wekesa', 'Juma Oloo'], participantIds: ['pA', 'pJ'], issue: 'They both chase the Mombasa account.' }],
      unmatched: ['Zawadi'],
    });
    for (const asking of [true, false]) {
      const said = whatWeTookFromThat(everything, { asking, told: 'This check-in is about the Kilimani shops.' })!;
      const headings = said.split('\n').filter((l) => l.trim() && !l.startsWith('- ') && !l.startsWith('“'));
      expect(headings.filter((l) => /:\s*$/.test(l))).toEqual([]);
    }
  });
});
