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
