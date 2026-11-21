import { askGroundwork, textOf } from './request-92-harness';

/**
 * REQUEST 92, POINTS 4 TO 11: what a person reads and is offered through Ask Groundwork.
 * Real assistant code over a fake prisma, each test named for the sentence it checks.
 */

describe('point 4: the file picker is offered to whoever runs the check-in chosen under "About"', () => {
  it('a lead with no session of their own is offered it, with the check-in\'s own id', async () => {
    const { service } = askGroundwork({ sessions: [] });
    const reply = await service.respond('org-a', 'p1', 'I want to add a document', 'g1');
    expect(textOf(reply)).toBe('It will go on "Sales team, Q3", and only you will be able to see it until you say otherwise.');
    const step = reply.blocks.find((b: any) => b.type === 'next_step') as any;
    expect(step).toMatchObject({ kind: 'upload_a_document', id: 'g1', context: { groundId: 'g1', label: 'Sales team, Q3' } });
  });

  it('a session opened early, whose first day is later, does not hide it from the lead', async () => {
    const { service } = askGroundwork({
      sessions: [{ groundId: 'g1', label: 'Sales team, Q3', checkInId: 'session-1', standing: 'opens later' }],
    });
    const reply = await service.respond('org-a', 'p1', 'I want to add a document', 'g1');
    const step = reply.blocks.find((b: any) => b.type === 'next_step') as any;
    expect(step.id).toBe('g1');
  });

  it('the id is the check-in\'s, not the session\'s, even for a session that is open', async () => {
    const { service } = askGroundwork({
      userId: 'member-1',
      sessions: [{ groundId: 'g1', label: 'Sales team, Q3', checkInId: 'session-1', standing: 'open to you' }],
    });
    const reply = await service.respond('org-a', 'p1', 'I want to add a document');
    const step = reply.blocks.find((b: any) => b.type === 'next_step') as any;
    expect(step.id).toBe('g1');
  });

  it('somebody who does not run it and has nothing open is still told there is nowhere to put it', async () => {
    const { service } = askGroundwork({ userId: 'member-1', sessions: [] });
    const reply = await service.respond('org-a', 'p1', 'I want to add a document', 'g1');
    expect(reply.blocks.some((b: any) => b.type === 'next_step')).toBe(false);
    expect(textOf(reply)).toContain('there is nowhere to put one yet');
  });
});

describe('point 5: making a line private, in either word order, finds the line by its exact words', () => {
  const lines = [
    { id: 'l1', text: 'Every shop visit gets a photo of the shelf.', audience: 'EVERYONE' },
    { id: 'l2', text: 'Rukia decides on discounts above ten percent.', audience: 'EVERYONE' },
  ];
  for (const message of [
    "make the line 'Every shop visit gets a photo of the shelf.' private",
    'make the line private "Every shop visit gets a photo of the shelf."',
    'make the line "Every shop visit gets a photo of the shelf" private',
  ]) {
    it(`${message} asks, in full, whether to make that one line private`, async () => {
      const { service } = askGroundwork({ contextItems: lines });
      const reply = await service.respond('org-a', 'p1', message, 'g1');
      expect(reply.lane).toBe('add_context');
      expect(textOf(reply)).toBe('Shall I make the line "Every shop visit gets a photo of the shelf." visible only to you?');
    });
  }

  it('the exact words win over a line that only contains them', async () => {
    const { service } = askGroundwork({
      contextItems: [
        { id: 'a', text: 'Visit every shop.', audience: 'EVERYONE' },
        { id: 'b', text: 'Visit every shop. Take a photo.', audience: 'EVERYONE' },
      ],
    });
    const reply = await service.respond('org-a', 'p1', "make the line 'Visit every shop.' private", 'g1');
    expect(textOf(reply)).toBe('Shall I make the line "Visit every shop." visible only to you?');
  });

  it('words with an apostrophe inside them are found', async () => {
    const { service } = askGroundwork({ contextItems: [{ id: 'a', text: "Rukia's plan is the plan.", audience: 'EVERYONE' }, lines[0]] });
    const reply = await service.respond('org-a', 'p1', `make the line 'Rukia's plan is the plan.' private`, 'g1');
    expect(textOf(reply)).toBe(`Shall I make the line "Rukia's plan is the plan." visible only to you?`);
  });
});

describe('point 6: what the lead is shown for a paste is stored as shown, with the list she will say yes to', () => {
  it('the stored proposal keeps its bullets on separate lines, and the yes is given the list it answers', async () => {
    const say = 'Here is what I took from that.\n\nFor the whole check-in:\n- Shops signed: 4\n- Deposits paid: 10\n\nRecord all of this?';
    const contextChat = jest.fn(async () => ({ reply: '', gaps: [], done: true, proposal: { gap: 'everything', say } }));
    const { service, created } = askGroundwork({ groundsService: { contextChat } });
    const reply = await service.respond('org-a', 'p1', 'z'.repeat(500), 'g1', true);
    const proposal = reply.blocks.find((b: any) => b.type === 'proposal') as any;
    expect(proposal.summary).toBe(say);
    expect(created[0].summary).toBe(say);
    expect(created[0].summary).toContain('\n- Shops signed: 4\n- Deposits paid: 10\n');
    expect(created[0].payload.history.at(-1)).toEqual({ role: 'assistant', content: say });
  });
});

describe('point 7: a document said back to its own reader says "your"', () => {
  it('Amani, on her own document, reads "Your target", never her own name', async () => {
    const { service } = askGroundwork({
      userId: 'member-1', displayName: 'Amani Wekesa',
      participants: [{ id: 'pA', groundId: 'g1' }],
      documents: [{
        id: 'd1', fileName: 'Q3 targets.xlsx', groundId: 'g1', participantId: 'pA', visibility: 'OWN',
        holds: {
          fileName: 'Q3 targets.xlsx', whatItIs: 'It is a Q3 target sheet.', forEverybody: [], dates: [], unmatched: [],
          forOnePerson: [{ who: 'Amani Wekesa', what: 'cookers delivered', target: 3, by: '9 October', ownerParticipantId: 'pA' }],
          waiting: [{ name: 'cookers delivered', target: 3, ownerParticipantId: 'pA' }], takenAt: null,
        },
      }],
    });
    const reply = await service.respond('org-a', 'p1', "I've uploaded it");
    expect(textOf(reply)).toContain('Your target for cookers delivered is 3 by 9 October.');
    expect(textOf(reply)).not.toContain('Amani Wekesa');
    expect(textOf(reply)).not.toMatch(/\bground\b/i);
  });
});

describe('point 8: a no, and a yes to a change to a line, are answered in full sentences', () => {
  const answer = async (kind: string, message = 'no', extra: any = {}) => {
    const { service } = askGroundwork({
      parked: { id: 'pr1', kind, state: 'PARKED', payload: { groundId: 'g1', itemId: 'l1', action: 'reword', newText: 'New words.', ...extra }, summary: 's' },
    });
    return textOf(await service.respond('org-a', 'p1', message, 'g1'));
  };

  it.each([
    ['confirm_commitment_default', 'I have left it as it was. Nothing was recorded.'],
    ['context', 'I have left it as it was. Nothing was changed.'],
    ['document_numbers', 'I have left it as it was. Nothing was recorded.'],
    ['context_line', 'I have not added the line. Nothing was changed.'],
    ['change_context_line', 'I have left the line as it was. Nothing was changed.'],
    ['lead_note', 'I have left it as it was. Nothing was saved.'],
    ['share_lead_note', 'I have left the note private. Nothing was changed.'],
    ['question_for_person', 'I have left it as it was. Nothing was asked.'],
    ['todo', 'I have left it as it was. Nothing was added.'],
  ])('a no to %s reads "%s"', async (kind, sentence) => {
    expect(await answer(kind === 'confirm_commitment_default' ? 'commitment' : kind)).toBe(sentence);
  });

  it.each([
    ['reword', 'I have changed the line.'],
    ['share', 'I have shared the line. Everybody on this check-in can now read it.'],
    ['private', 'I have made the line private. Only you can see it now.'],
    ['retire', 'I have retired the line. It stays on the record but no longer counts as open.'],
  ])('a yes to "%s" on a line reads "%s"', async (action, sentence) => {
    const changeContextLine = jest.fn(async () => ({}));
    const { service } = askGroundwork({
      groundsService: { changeContextLine },
      parked: { id: 'pr1', kind: 'change_context_line', state: 'PARKED', payload: { groundId: 'g1', itemId: 'l1', action, newText: 'New words.' }, summary: 's' },
    });
    expect(textOf(await service.respond('org-a', 'p1', 'yes', 'g1'))).toBe(sentence);
    expect(changeContextLine).toHaveBeenCalled();
  });

  it('a yes to a line reads "I have added the line to this check-in. Everybody in it can read it now."', async () => {
    const addContextLine = jest.fn(async () => ({}));
    const { service } = askGroundwork({
      groundsService: { addContextLine },
      parked: { id: 'pr1', kind: 'context_line', state: 'PARKED', payload: { groundId: 'g1', kind: 'NOTE', text: 'Visit every shop.' }, summary: 's' },
    });
    /* Changed 22 November 2026 (release test of 21 November, Ask #36): the say-back names the check-in and what the line is, so the lead knows where it goes. */
    expect(textOf(await service.respond('org-a', 'p1', 'yes', 'g1'))).toBe('I have added "Visit every shop." to this check-in as a note. Everybody in it can read it now.');
  });

  it('a doubled mark is never written: a quote that ends in its own punctuation takes no second one', async () => {
    const { service } = askGroundwork();
    const reply = await service.respond('org-a', 'p1', "I've uploaded it.");
    expect(textOf(reply)).toContain('Here is what I can do with "I\'ve uploaded it."');
    expect(textOf(reply)).not.toContain('."."');
    expect(textOf(reply)).not.toMatch(/\.\.\s*$/);
    const other = await askGroundwork().service.respond('org-a', 'p1', 'blue elephants');
    expect(textOf(other)).toContain('Here is what I can do with "blue elephants".');
  });

  it('a question left out is asked about in its own words with no second question mark', async () => {
    const { quotedThenEnding } = await import('./a-quote-takes-no-second-mark');
    expect(quotedThenEnding('Is there anything on the order forms?', '?')).toBe('"Is there anything on the order forms?"');
    expect(quotedThenEnding('Visit every shop', '?')).toBe('"Visit every shop"?');
  });
});

describe('point 8: the refusal an admin reads names the person who runs the check-in', () => {
  it('says who can change how it is set up, and that nothing was changed', async () => {
    const { onlyTheLeadConfirmsSetup } = await import('../grounds/who-may-confirm-setup');
    const refused = new Error(onlyTheLeadConfirmsSetup('Rukia Otieno'));
    const applyContextProposal = jest.fn(async () => { throw refused; });
    const { service } = askGroundwork({
      userId: 'admin-1', role: 'ADMIN',
      groundsService: { applyContextProposal },
      parked: { id: 'pr1', kind: 'context', state: 'PARKED', payload: { groundId: 'g1', said: 'twelve weeks', history: [] }, summary: 's' },
    });
    expect(textOf(await service.respond('org-a', 'p1', 'yes', 'g1')))
      .toBe('Only Rukia Otieno, who runs this check-in, can change how it is set up. An admin can only do that once Rukia has left the organisation. Nothing was changed.');
  });
});

describe('point 10: after a No, the setup conversation carries on with the same open question', () => {
  it('says plainly that nothing was changed, asks what is still open, and keeps the conversation going', async () => {
    const open = 'How long should this run? Until a date, or for a set number of weeks.';
    const history = [{ role: 'user', content: 'Good means every shop pays.' }, { role: 'assistant', content: 'Shall I record "Good means every shop pays." as what doing well looks like?' }];
    const { service, created } = askGroundwork({
      parked: { id: 'pr1', kind: 'context', state: 'PARKED', summary: 's', payload: { groundId: 'g1', said: 'Good means every shop pays.', history, openQuestion: open } },
    });
    const reply = await service.respond('org-a', 'p1', 'no', 'g1');
    /* Reviewer, 14 October: after a no, stop. The open question is kept as what is waiting, not asked again under the no. */
    expect(textOf(reply)).toBe('I have left it as it was. Nothing was changed.');
    const carried = created.find((c: any) => c.kind === 'context_turn');
    expect(carried.payload.groundId).toBe('g1');
    /* The say-back that was declined is not carried forward, and the question that was asked is. */
    expect(carried.payload.history).toEqual([
      { role: 'user', content: 'Good means every shop pays.' },
      { role: 'assistant', content: `I have left it as it was. Nothing was changed.\n\n${open}` },
    ]);
    expect(carried.summary).toBe(open);
  });

  it('and the next message is read as the answer to that question, by the same conversation', async () => {
    const contextChat = jest.fn(async () => ({ reply: 'How often should people check in?', gaps: ['cadence'], done: false, proposal: null }));
    const carried = { id: 'pr2', kind: 'context_turn', state: 'PARKED', summary: 's', payload: { groundId: 'g1', history: [{ role: 'assistant', content: 'How long should this run?' }] } };
    const { service } = askGroundwork({ groundsService: { contextChat }, parked: carried });
    await service.respond('org-a', 'p1', 'thirteen weeks', 'g1');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', [
      { role: 'assistant', content: 'How long should this run?' },
      { role: 'user', content: 'thirteen weeks' },
    ], { yesOrNo: true });
  });
});

import { parseAskAPerson } from './a-line-or-a-note-typed-in-chat';
import { route } from './the-router-is-deterministic';

describe('point 11: "ask NAME whether ..." is a question for that person', () => {
  it.each([
    ['I want to ask Amani whether the Kilimani shops have paid', 'Amani', 'Ask Amani whether the Kilimani shops have paid'],
    ['ask Amani Wekesa if the shops have paid their deposits.', 'Amani Wekesa', 'Ask Amani Wekesa if the shops have paid their deposits'],
    ['Can you ask Amani about the price list', 'Amani', 'Ask Amani about the price list'],
    ['ask Amani: Have the Kilimani shops paid their deposits yet?', 'Amani', 'Ask Amani: Have the Kilimani shops paid their deposits yet?'],
  ])('"%s" is read as a question for %s', (said, name, words) => {
    expect(parseAskAPerson(said)).toEqual({ name, leadWords: words });
    expect(route(said).lane).toBe('questions_for_people');
  });

  it.each([
    'ask me what is on my list',
    'ask Groundwork about the rota',
    'what should I ask Amani about',
    'I want to know whether the Kilimani shops have paid',
    `ask Ben 'how are the Lagos numbers looking?' instead`,
  ])('"%s" is not', (said) => {
    expect(parseAskAPerson(said)).toBeNull();
  });

  const theGrounds = () => ({
    theQuestionForAPerson: jest.fn(async () => ({ participantId: 'pA', who: 'Amani Wekesa', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' })),
    keepAQuestionForAPerson: jest.fn(async () => ({ say: 'I have confirmed it. Groundwork will ask Amani Wekesa "Have the Kilimani shops paid their deposits yet?" in their next check-in, word for word.' })),
    contextChat: jest.fn(),
  });

  it('the lead reads the exact question back and nothing is kept before the yes', async () => {
    const groundsService = theGrounds();
    const { service, created } = askGroundwork({ groundsService });
    const reply = await service.respond('org-a', 'p1', 'I want to ask Amani whether the Kilimani shops have paid', 'g1');
    expect(textOf(reply)).toBe('Groundwork will ask Amani Wekesa, word for word, "Have the Kilimani shops paid their deposits yet?" in Amani\'s next check-in. Shall I keep it for then?');
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(groundsService.keepAQuestionForAPerson).not.toHaveBeenCalled();
    expect(created[0].kind).toBe('question_for_person');
  });

  it('inside the setup conversation it is still a question for a person, never something expected of one', async () => {
    const groundsService = theGrounds();
    const { service } = askGroundwork({ groundsService });
    const reply = await service.respond('org-a', 'p1', 'I want to ask Amani whether the Kilimani shops have paid', 'g1', true);
    expect(groundsService.contextChat).not.toHaveBeenCalled();
    expect(textOf(reply)).toContain('Groundwork will ask Amani Wekesa, word for word,');
  });

  it('the yes keeps it and confirms it, and says so in a full sentence', async () => {
    const groundsService = theGrounds();
    const { service } = askGroundwork({
      groundsService,
      parked: { id: 'pr1', kind: 'question_for_person', state: 'PARKED', summary: 's', payload: { groundId: 'g1', action: 'keep', participantId: 'pA', leadWords: 'Ask Amani whether the Kilimani shops have paid', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' } },
    });
    const reply = await service.respond('org-a', 'p1', 'yes', 'g1');
    expect(groundsService.keepAQuestionForAPerson).toHaveBeenCalledWith('g1', 'lead-1', { participantId: 'pA', leadWords: 'Ask Amani whether the Kilimani shops have paid', exactQuestion: 'Have the Kilimani shops paid their deposits yet?' });
    expect(textOf(reply)).toBe('I have confirmed it. Groundwork will ask Amani Wekesa "Have the Kilimani shops paid their deposits yet?" in their next check-in, word for word.');
  });

  it('somebody who does not run a check-in is answered as ever, and nothing is made', async () => {
    const groundsService = theGrounds();
    const { service, created } = askGroundwork({ userId: 'member-1', groundsService, grounds: [{ id: 'g1', label: 'Sales team, Q3', initiatorId: 'lead-1', organizationId: 'org-a' }] });
    const reply = await service.respond('org-a', 'p1', 'I want to ask Amani whether the Kilimani shops have paid', 'g1');
    expect(reply.lane).toBe('unplaced');
    expect(groundsService.theQuestionForAPerson).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  });
});
