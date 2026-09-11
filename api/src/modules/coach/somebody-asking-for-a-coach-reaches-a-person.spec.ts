import { CoachService } from './coach.service';
import { TheTeamIsToldService } from '../back-office/the-team-is-told.service';
import { GroundworkEvents, CallAskedEvent } from '../../common/events';

/**
 * SOMEBODY ASKING FOR A COACH REACHES A PERSON.
 *
 * Two request paths, two tables, one alert. A call asked for inside the product emitted CALL_ASKED and
 * the roster was mailed; a coaching request from the public talk-to-us page wrote its row, mailed the
 * requester a confirmation, and told nobody on our side. The event is widened rather than doubled: a
 * public request has no account and no organisation row, so it names itself.
 */
const ASK = {
  name: 'Ada Nwosu',
  orgName: 'Northfield Foods',
  email: 'Ada@northfield.example',
  teamSize: '12',
  intention: 'Two of my leads have stopped agreeing on what the quarter is for and I do not know which of your situations that is.',
};

describe('a coaching request from the public page', () => {
  it('emits the same event a signed-in call request does, naming the requester', async () => {
    const emit = jest.fn();
    const prisma: any = {
      coachRequest: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'r1', ...data })),
        update: jest.fn(async () => ({})),
      },
    };
    const email: any = { sendCoachRequestReceived: jest.fn(async () => undefined) };
    await new CoachService(prisma, email, { emit } as any).request(ASK);

    expect(emit).toHaveBeenCalledTimes(1);
    const [name, event] = emit.mock.calls[0] as [string, CallAskedEvent];
    expect(name).toBe(GroundworkEvents.CALL_ASKED);
    expect(event.subject).toBe('COACHING');
    expect(event.organizationId).toBeNull();
    expect(event.askedByUserId).toBeNull();
    expect(event.requester).toEqual({ name: 'Ada Nwosu', email: 'ada@northfield.example', orgName: 'Northfield Foods' });
    expect(event.note).toBe(ASK.intention);
  });

  it('and the listener mails the roster without an organisation or a user to look up', async () => {
    const sent: any[] = [];
    const prisma: any = {
      opsPerson: { findMany: jest.fn(async () => [{ userId: 'u-ops', accounts: [] }]) },
      user: { findMany: jest.fn(async () => [{ email: 'ops@ours.example', organizationId: 'org-us' }]), findUnique: jest.fn(() => { throw new Error('no user to look up'); }) },
      organization: { findUnique: jest.fn(() => { throw new Error('no organisation to look up'); }) },
    };
    const email: any = { sendTeamAlert: jest.fn(async (...args: any[]) => { sent.push(args); }) };
    const config: any = { get: () => 'https://app.example' };
    const svc = new TheTeamIsToldService(prisma, email, config);

    await svc.onCallAsked({
      organizationId: null,
      askedByUserId: null,
      requester: { name: 'Ada Nwosu', email: 'ada@northfield.example', orgName: 'Northfield Foods' },
      subject: 'COACHING',
      note: ASK.intention,
    });

    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    const [to, subject, lines, , url] = sent[0];
    expect(to).toBe('ops@ours.example');
    expect(subject).toBe('Asked for coaching: Northfield Foods');
    expect(lines[0]).toBe('Ada Nwosu (ada@northfield.example) at Northfield Foods asked for coaching.');
    expect(url).toBe('https://app.example/ops/requests');
  });

  it('while a signed-in request still reads the organisation and the user', async () => {
    const sent: any[] = [];
    const prisma: any = {
      opsPerson: { findMany: jest.fn(async () => [{ userId: 'u-ops', accounts: [] }]) },
      user: { findMany: jest.fn(async () => [{ email: 'ops@ours.example', organizationId: 'org-us' }]), findUnique: jest.fn(async () => ({ email: 'lead@customer.example' })) },
      organization: { findUnique: jest.fn(async () => ({ name: 'Customer Co' })) },
    };
    const email: any = { sendTeamAlert: jest.fn(async (...args: any[]) => { sent.push(args); }) };
    const svc = new TheTeamIsToldService(prisma, email, { get: () => '' } as any);
    await svc.onCallAsked({ organizationId: 'org-c', askedByUserId: 'u-lead', subject: 'CALL', note: null });
    expect(sent[0][1]).toBe('Asked for a call: Customer Co');
    expect(sent[0][2][0]).toBe('lead@customer.example at Customer Co asked for a call.');
  });
});
