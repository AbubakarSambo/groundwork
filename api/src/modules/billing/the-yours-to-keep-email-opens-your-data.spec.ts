import { BillingService } from './billing.service';

/**
 * THE "YOURS TO KEEP" EMAIL OPENS THE PART OF SETTINGS THAT HOLDS YOUR DATA (B-221, the API's half).
 * The link went to /settings, the top of the page; the download is in the section with the id "your-data".
 */
describe('the cancellation email links straight to your data', () => {
  it('every person is sent /settings#your-data', async () => {
    const sent: string[] = [];
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => ({ careFeeSubscriptionId: null, email: 'a@x.test', name: 'Coast Sales' })), update: jest.fn(async () => ({})) },
      user: { findMany: jest.fn(async () => [{ id: 'u1', email: 'wairimu@x.test', firstName: 'Wairimu' }]) },
    };
    const email: any = { sendRecordPortabilityNotice: jest.fn(async (_to: string, _n: string, url: string) => { sent.push(url); }) };
    const config: any = { get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.test' : undefined) };
    const s: any = new BillingService(prisma, {} as any, {} as any, config, email, {} as any);
    s.tellThemBillingChanged = jest.fn(async () => undefined);
    await s.cancelAccount('org1');
    expect(sent).toEqual(['https://app.test/settings#your-data']);
  });
});
