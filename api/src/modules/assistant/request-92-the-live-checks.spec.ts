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
