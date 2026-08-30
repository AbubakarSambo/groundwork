import { UsersService } from './users.service';

/**
 * ASKING TO TALK TO US ABOUT CONNECTING SYSTEMS.
 *
 * The Connect page explained the API well and ended at "see the plans". Somebody evaluating this
 * for a company does not want a plan, they want half an hour with their engineers in the room - and
 * the only way to reach anybody was a mailto on a different page. A mailto is a request that exists
 * only if a message arrives, is read, and is not filtered, none of which anybody can check.
 */
const svc = (open: any = null) => {
  const created: any[] = [];
  const s = Object.create(UsersService.prototype) as any;
  s.logger = { log: () => {} };
  s.prisma = {
    callRequest: {
      findFirst: async () => open,
      create: async (a: any) => { created.push(a); return { createdAt: new Date('2026-08-30') }; },
    },
  };
  return { s, created };
};

describe('a request for a call', () => {
  it('is stored, with who to call back', async () => {
    const { s, created } = svc();
    await s.requestACall('org1', 'u1', 'we run a bespoke CRM');
    expect(created[0].data.organizationId).toBe('org1');
    expect(created[0].data.requestedById).toBe('u1');
  });

  it('keeps their words, and nothing is inferred from them', async () => {
    const { s, created } = svc();
    await s.requestACall('org1', 'u1', '  we run a bespoke CRM  ');
    expect(created[0].data.note).toBe('we run a bespoke CRM');
  });

  it('is fine with no note at all, because asking is the signal', async () => {
    const { s, created } = svc();
    await s.requestACall('org1', 'u1', undefined);
    expect(created[0].data.note).toBeNull();
    expect(created[0].data.note).not.toBe('');
  });

  it('does not open a second one while the first is unanswered', async () => {
    /* A second click is somebody wondering whether the first worked. The same company four times
       in a queue is a queue that gets read less carefully. */
    const { s, created } = svc({ id: 'r1', createdAt: new Date('2026-08-01') });
    const out = await s.requestACall('org1', 'u1', 'again');
    expect(created).toHaveLength(0);
    expect(out.alreadyOpen).toBe(true);
    /* And it reports the ORIGINAL date, so the page does not claim they just asked. */
    expect(out.at).toEqual(new Date('2026-08-01'));
  });

  it('bounds the note rather than storing whatever arrives', async () => {
    const { s, created } = svc();
    await s.requestACall('org1', 'u1', 'x'.repeat(5000));
    expect(created[0].data.note.length).toBe(2000);
  });
});
