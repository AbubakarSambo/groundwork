import { RoundDigestService } from './round-digest.service';

function svc(o: { prefs?: any; person?: any; participants?: any[]; hour?: number } = {}) {
  const sent: any[] = [];
  const updated: any[] = [];
  const prisma: any = {
    ground: { findUnique: async () => ({
      organizationId: 'org-a', label: 'Renewal push',
      participants: o.participants ?? [{ email: 'ada@x.com' }],
    }) },
    groundDependency: { count: async () => 2 },
    person: { findFirst: async () => (o.person === undefined
      ? { externalId: 'ada', timezone: 'UTC' } : o.person) },
    emailPreference: {
      findUnique: async () => o.prefs ?? { id: 'p1', unsubscribeToken: 'tok',
        roundDigest: true, nudges: true, unsubscribedAt: null,
        quietBeforeHour: 0, quietAfterHour: 23 },
      create: async ({ data }: any) => ({ id: 'p1', ...data }),
      /* Returns the token, as the real row does. The first version of this fake did not, so the
         "never handed back" test passed while the code returned it - a fixture that made the
         assertion impossible to fail. */
      update: async ({ data }: any) => { updated.push(data); return { id: 'p1', unsubscribeToken: 'tok', ...data }; },
    },
  };
  const email: any = { sendRoundDigest: async (to: string, subject: string, body: string) =>
    sent.push({ to, subject, body }) };
  const config: any = { get: () => 'https://app' };
  return { service: new RoundDigestService(prisma, email, config), sent, updated };
}

const round = { groundId: 'g1', sessionNumber: 3, participantCount: 4 };

describe('one mail per round', () => {
  it('carries the headline and a link, and nothing that was said', async () => {
    const { service, sent } = svc();
    await service.onRoundCompleted(round as any);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe('Renewal push - session 3 is complete');
    expect(sent[0].body).toMatch(/4 people took part/);
    expect(sent[0].body).toMatch(/https:\/\/app\/grounds\/g1/);
    /* Changed 4 November 2026 (batch 1: the direct words for everybody): the way to stop these is in the footer every such mail carries, not said twice in the body. */
    expect(sent[0].body).not.toMatch(/To stop these emails/);
  });

  it('and sends nothing to somebody it cannot tie to a preference', async () => {
    /*
     * Sending to an address we cannot match to a Person is sending to somebody whose opt-out we
     * would not have seen. A mail nobody asked for is worse than a mail missed.
     */
    const { service, sent } = svc({ person: null });
    await service.onRoundCompleted(round as any);
    expect(sent).toEqual([]);
  });

  it('and in their quiet hours still hands the mail to the door, which holds it for the morning', async () => {
    /*
     * An inverted window (before > after) is quiet at every hour of the day, whatever hour this
     * suite happens to run in. This used to expect NOTHING sent: the digest dropped a mail refused for
     * the hour, so a round completing at 21:00 local was never announced. Quiet hours are now the
     * door's business (email.service#holdForTheMorning, held-mail.cron.ts) - the digest sends, the
     * door holds. See nothing-lands-at-3am-and-nothing-is-lost-either.spec.ts.
     */
    const { service, sent } = svc({ prefs: { id: 'p1', unsubscribeToken: 'tok', roundDigest: true,
      nudges: true, unsubscribedAt: null, quietBeforeHour: 12, quietAfterHour: 11 } });
    await service.onRoundCompleted(round as any);
    expect(sent).toHaveLength(1);
  });

  it('and refuses to somebody who unsubscribed', async () => {
    const { service, sent } = svc({ prefs: { id: 'p1', unsubscribeToken: 'tok', roundDigest: true,
      nudges: true, unsubscribedAt: new Date(), quietBeforeHour: 0, quietAfterHour: 23 } });
    await service.onRoundCompleted(round as any);
    expect(sent).toEqual([]);
  });

  it('and a mail that fails never rolls back the round that closed', async () => {
    const prisma: any = { ground: { findUnique: async () => { throw new Error('db down'); } } };
    const s = new RoundDigestService(prisma, {} as any, { get: () => 'https://app' } as any);
    await expect(s.onRoundCompleted(round as any)).resolves.toBeUndefined();
  });
});

describe('an admin cannot undo somebody\'s opt-out', () => {
  it('so setting preferences never clears unsubscribedAt', async () => {
    /*
     * §13D.3 says the opt-out is honoured WITHOUT an admin override, and the whole reason people
     * answer honestly in this product is that it does what it said it would.
     */
    const { service, updated } = svc();
    await service.setPreferences('org-a', 'ada', { roundDigest: false, nudges: true } as any);
    expect(updated).toHaveLength(1);
    expect(Object.keys(updated[0])).not.toContain('unsubscribedAt');
  });

  it('and the token is never handed back to an integration', async () => {
    /* Handing it over would let anybody with a machine credential unsubscribe anybody. */
    const { service } = svc();
    const out: any = await service.setPreferences('org-a', 'ada', { nudges: false } as any);
    expect(out.unsubscribeToken).toBeUndefined();
  });
});
