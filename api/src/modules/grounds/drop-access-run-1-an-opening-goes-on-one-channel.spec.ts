import { theEmailOpeningShould, whatBecameOfIt } from './an-opening-goes-on-one-channel';
import { THE_EMAILS } from './what-is-sent-in-simpler-words';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';

/**
 * DROP ACCESS RUN 1, ITEMS 10 AND 11: AN OPENING GOES ON ONE CHANNEL, AND SAYS "ABOUT TEN MINUTES" (gw_sweep_drop10, 18 October 2026).
 *
 * Tuesday 13 October, 05:00 UTC (eight in Nairobi). Joseph's session 2 (check-in 8e8dad62) opened. The send record holds
 * `checkin-open:template`, status 200, sent at 05:00:00.029, and the mail catcher holds, at 05:00:00.054, the email
 * "Your next check-in is open: Sales team, Q4". Thirty openings went twice like that. These are the run's own rows.
 */
const JOSEPHS_SESSION_2 = '8e8dad62-7e36-49cf-819a-25e2c3a66704';
const OPENED = new Date('2026-10-13T05:00:00.000Z');

function theRecord(o: { sends?: { kind: string; sentAt: Date | null }[]; phone?: string | null; whatsappOn?: boolean; stopped?: boolean; keptInTheApp?: boolean } = {}) {
  const prisma: any = {
    whatsAppSend: { findMany: jest.fn(async ({ where }: any) => (o.sends ?? []).filter((r) => r.kind.startsWith(where.kind.startsWith))) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: o.whatsappOn ?? true, whatsappFreeUntil: null })) },
    person: { findFirst: jest.fn(async () => ({ phone: o.phone === undefined ? '+254700300004' : o.phone, whatsappStoppedAt: o.stopped ? new Date('2026-10-12T12:00:00Z') : null })) },
  };
  const ci = {
    id: JOSEPHS_SESSION_2,
    availableFrom: OPENED,
    participant: { email: 'joseph@dropaccess.test', userId: '003d6475-2ad8-493e-8e68-50364a737d20', user: { phoneNumber: '+254700300004' }, ground: { organizationId: '83e249ca-67c6-47eb-a0d9-b0c531ec8c3c', overWhatsApp: o.keptInTheApp ? false : null } },
  };
  return { prisma, ci };
}

describe('Joseph\'s session 2 opening, 13 October', () => {
  it('the WhatsApp opening went (checkin-open:template, sent 05:00:00.029): no email goes', async () => {
    const { prisma, ci } = theRecord({ sends: [{ kind: 'checkin-open:template', sentAt: new Date('2026-10-13T05:00:00.029Z') }] });
    expect(await theEmailOpeningShould(prisma, ci, new Date('2026-10-13T05:00:00.054Z'))).toBe('skip');
  });
  it('held for the night, it goes at seven on WhatsApp: no email either', () => {
    expect(whatBecameOfIt([{ kind: 'checkin-open:quiet-hours', sentAt: null }])).toBe('went');
  });
  it('nothing recorded yet, and he can be reached on WhatsApp: the email waits for the next sweep, then goes if WhatsApp never did', async () => {
    const { prisma, ci } = theRecord();
    expect(await theEmailOpeningShould(prisma, ci, new Date('2026-10-13T05:00:00.054Z'))).toBe('wait');
    expect(await theEmailOpeningShould(prisma, ci, new Date('2026-10-13T05:31:00Z'))).toBe('send');
  });
  it('the WhatsApp opening was tried and did not go (no approved template): the email goes', async () => {
    const { prisma, ci } = theRecord({ sends: [{ kind: 'checkin-open', sentAt: null }] });
    expect(await theEmailOpeningShould(prisma, ci, new Date('2026-10-13T05:00:00.054Z'))).toBe('send');
  });
  it('somebody who cannot be reached on WhatsApp gets the email at once: no number, WhatsApp off, STOP, or a check-in kept in the app', async () => {
    for (const o of [{ phone: null }, { whatsappOn: false }, { stopped: true }, { keptInTheApp: true }]) {
      const { prisma, ci } = theRecord({ ...o, ...(o.phone === null ? { phone: null } : {}) });
      if (o.phone === null) ci.participant.user = { phoneNumber: null } as any;
      expect(await theEmailOpeningShould(prisma, ci, new Date('2026-10-13T05:00:00.054Z'))).toBe('send');
    }
  });
});

describe('what the opening says about how long a check-in takes', () => {
  it('the email, as Joseph would read it: "about ten minutes"', () => {
    const w = THE_EMAILS.nextCheckInOpen(false);
    expect(`${w.before} Sales team, Q4${w.after}`).toBe('A new check-in is ready for Sales team, Q4. It takes about ten minutes, and your answers keep the report you and your team read up to date.');
  });
  it('WhatsApp, inside the 24 hours, in our own words: "about ten minutes"; outside them the approved template goes word for word, unchanged', () => {
    const said = theCheckInIsOpen({ firstName: 'Joseph', label: 'Sales team, Q4' });
    expect(said.kind).toBe('checkin-open');
    expect(said.params).toEqual(['Joseph', 'Sales team, Q4']);
  });
});
