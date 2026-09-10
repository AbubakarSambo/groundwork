import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationService } from './conversation.service';

/**
 * THE PERSON WE SAID WE TOLD IS ACTUALLY TOLD.
 *
 * The paywall overlay said "Your initiator has been notified" - and nothing notified the initiator;
 * that sentence was the only occurrence of the idea in the repository. The overlay now says the
 * organisation's admins have been told, and this pins that the server does exactly that whenever the
 * gate refuses: every admin of the organisation is mailed, before the refusal is thrown, best-effort.
 */
const CODE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('when the gate refuses', () => {
  it('the admins are told, on the refusal path, before the throw', () => {
    const at = CODE.indexOf('if (!gate.allowed) {');
    const branch = CODE.slice(at, CODE.indexOf('throw new ForbiddenException({ message: gate.reason', at));
    expect(branch).toMatch(/this\.tellAnAdminToAddACard\(checkIn\.groundId\)/);
  });

  it('and "the admins" means every admin of the organisation the check-in belongs to', async () => {
    const sent: string[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', organization: { name: 'Acme' } })) },
      user: { findMany: jest.fn(async ({ where }: any) => (where.organizationId === 'org' && where.role === 'ADMIN' ? [{ email: 'a@acme.test' }, { email: 'b@acme.test' }] : [])) },
    };
    const email: any = { sendPaymentRequestEmail: jest.fn(async (to: string) => { sent.push(to); }) };
    const svc: any = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, email, {} as any, { get: () => undefined } as any);
    await svc.tellAnAdminToAddACard('g1');
    expect(sent.sort()).toEqual(['a@acme.test', 'b@acme.test']);
  });

  it('a mail that fails is never why the refusal fails to reach the person', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', organization: null })) },
      user: { findMany: jest.fn(async () => [{ email: 'a@acme.test' }]) },
    };
    const email: any = { sendPaymentRequestEmail: jest.fn(async () => { throw new Error('mail down'); }) };
    const svc: any = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, email, {} as any, { get: () => undefined } as any);
    await expect(svc.tellAnAdminToAddACard('g1')).resolves.toBeUndefined();
  });
});
