import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppForAnOrganisationService } from '../public-api/whatsapp-for-an-organisation.service';

/**
 * THE SAME WHATSAPP MESSAGE TWICE IS ONE ANSWER. Meta redelivers when it does not get a 200 in time,
 * and each redelivery was another model turn, another slot against the ceiling and, on a session not
 * yet opened, another session spent. The id is claimed first; a redelivery returns before anything.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const handler = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));

const body = (id: string) => ({ entry: [{ changes: [{ value: { messages: [{ id, from: '+2348000000001', type: 'text', text: { body: 'hello' } }] } }] }] });

describe('a redelivery', () => {
  it('is claimed by id before anything else, and a second arrival is not handled', async () => {
    const seen = new Set<string>();
    const prisma: any = {
      whatsAppInboundMessage: {
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.organizationId}:${data.messageId}`;
          if (seen.has(key)) { const e: any = new Error('dup'); e.code = 'P2002'; throw e; }
          seen.add(key);
          return {};
        }),
      },
      whatsAppConnection: { update: jest.fn(async () => ({})) },
    };
    /* The identity lookup is the first thing after the claim that is not swallowed; it stops the run here. */
    const whatsapp: any = { whoIsWritingTo: jest.fn(async () => { throw new Error('stop here: the claim is the only thing under test'); }), sendFor: jest.fn() };
    const svc = new WhatsAppForAnOrganisationService(prisma, whatsapp, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(svc.handle('org', body('wamid.1'))).rejects.toThrow(/stop here/);
    await expect(svc.handle('org', body('wamid.1'))).resolves.toBeUndefined();
    expect(whatsapp.whoIsWritingTo).toHaveBeenCalledTimes(1);
  });

  it('the claim comes before the connection stamp and the identity lookup', () => {
    const claim = handler.indexOf('await this.firstTimeWeSeeThis(');
    expect(claim).toBeGreaterThan(-1);
    expect(claim).toBeLessThan(handler.indexOf("data: { lastInboundAt: new Date() }"));
    expect(claim).toBeLessThan(handler.indexOf('await this.whatsapp.whoIsWritingTo('));
  });

  it('and the finish branch no longer holds the webhook open for the report', () => {
    const finish = handler.slice(handler.indexOf("A_FINISH_WORD.test(text) && current.status === 'IN_PROGRESS'"), handler.indexOf('OPEN IF WAITING') > 0 ? handler.indexOf('OPEN IF WAITING') : handler.indexOf('let reply = '));
    expect(finish).not.toContain('await this.sendTheReport(');
  });
});
