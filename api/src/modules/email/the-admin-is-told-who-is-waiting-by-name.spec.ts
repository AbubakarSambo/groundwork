import { EmailService } from './email.service';

/**
 * "newcomer@example.test is waiting to be let into your organisation" named an address and "your
 * organisation" to an admin who may run several (U.4 review). The subject now names the person, when
 * they gave a name, and the organisation. Only the wording changed; who is sent it did not.
 */
async function subjectOf(who: string, known: { name?: string | null; organisationName?: string | null }) {
  const sent: any[] = [];
  const fake = { sendEmail: async (m: any) => { sent.push(m); }, layout: (h: string) => h, frontendUrl: 'http://localhost:5173' };
  await (EmailService.prototype as any).sendSomebodyIsWaiting.call(fake, 'grace@baridi.co.ke', 'Grace', who, 'Wairimu Kamau', 'Sales team, Q3', known);
  return sent[0].subject as string;
}

describe('the admin is told who is waiting', () => {
  it('by name, and into which organisation', async () => {
    expect(await subjectOf('peter@ouma-agencies.co.ke', { name: 'Peter Ouma', organisationName: 'Baridi Appliances' }))
      .toBe('Peter Ouma is waiting to be let into Baridi Appliances.');
  });
  it('by address only when they gave no name, still with the organisation', async () => {
    expect(await subjectOf('newcomer@example.test', { name: '', organisationName: 'Baridi Appliances' }))
      .toBe('newcomer@example.test is waiting to be let into Baridi Appliances.');
  });
});
