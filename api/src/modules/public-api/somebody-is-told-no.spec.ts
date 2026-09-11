import { readFileSync } from 'fs';
import { join } from 'path';
import { ApiAccessService } from './api-access.service';

/**
 * SOMEBODY IS TOLD NO. decide() wrote the status, the decider and a mandatory note, logged a line and
 * returned. The comment said "somebody is going to be told no" and nothing told them; the note that
 * was made mandatory so that somebody could be told reached nobody.
 */
describe('a decision on API access', () => {
  const requester = { email: 'asker@x.test', firstName: 'Ada' };
  const admin = { email: 'admin@x.test', firstName: 'Bo' };
  function service(status: string, note?: string) {
    const prisma: any = {
      apiAccessRequest: {
        findUnique: jest.fn(async () => ({ id: 'r1', organizationId: 'org', requestedByUserId: 'u1' })),
        update: jest.fn(async ({ data }: any) => ({ id: 'r1', organizationId: 'org', requestedByUserId: 'u1', ...data })),
      },
      user: { findMany: jest.fn(async () => [requester, admin]) },
    };
    const email: any = {
      frontendUrlForLinks: () => 'https://app.test',
      sendApiAccessApproved: jest.fn(async () => undefined),
      sendApiAccessDeclined: jest.fn(async () => undefined),
      sendApiAccessWithdrawn: jest.fn(async () => undefined),
    };
    const svc = new ApiAccessService(prisma, { emit: jest.fn() } as any, email);
    return { svc, email };
  }
  const settle = () => new Promise((r) => setImmediate(r));

  it('approved: the asker and every admin are told, with the next step', async () => {
    const { svc, email } = service('APPROVED');
    await svc.decide('r1', 'APPROVED' as any, 'decider');
    await settle();
    expect(email.sendApiAccessApproved).toHaveBeenCalledTimes(2);
    expect(email.sendApiAccessApproved).toHaveBeenCalledWith('asker@x.test', 'Ada', 'https://app.test/org/integrations');
  });
  it('declined: told, with the note', async () => {
    const { svc, email } = service('DECLINED');
    await svc.decide('r1', 'DECLINED' as any, 'decider', 'Not for a competing service.');
    await settle();
    expect(email.sendApiAccessDeclined).toHaveBeenCalledWith('admin@x.test', 'Bo', 'Not for a competing service.', 'https://app.test/org/integrations');
  });
  it('withdrawn: told, with the note', async () => {
    const { svc, email } = service('WITHDRAWN');
    await svc.decide('r1', 'WITHDRAWN' as any, 'decider', 'Terms breached.');
    await settle();
    expect(email.sendApiAccessWithdrawn).toHaveBeenCalledTimes(2);
  });
  it('and the three senders are classified as an answer to something they asked for', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const kinds = strip(readFileSync(join(__dirname, '..', 'email', 'nothing-goes-out-that-was-turned-off.ts'), 'utf8'));
    for (const s of ['sendApiAccessApproved', 'sendApiAccessDeclined', 'sendApiAccessWithdrawn']) expect(kinds).toMatch(new RegExp(`${s}: 'asked for'`));
  });
});
