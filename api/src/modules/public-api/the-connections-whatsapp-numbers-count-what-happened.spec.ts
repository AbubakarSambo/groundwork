import { ConnectionsAtAGlanceService } from './connections-at-a-glance.service';
import { failedThisWeekIn } from './whatsapp-as-the-admin-reads-it';

/**
 * THE CONNECTIONS PAGE'S WHATSAPP NUMBERS COUNT WHAT HAPPENED (U.18, `GET /integrations/connections`).
 *
 * Grace, an admin at Baridi Appliances, reads three numbers beside her WhatsApp number. This week's
 * WhatsApp work put new kinds of rows into the same tables: a conversation in Ask Groundwork keeps
 * "ask:" where the check-in would be, a message held because WhatsApp is off or the month's
 * messages are used is written down as not sent, a person is told once that it was held, and a
 * "Not now" is kept as a marker. Each number is read here from rows of every kind, through the
 * service, exactly as Grace is served it.
 */

type Row = Record<string, any>;

/* Just enough of Prisma's `where` to read these two tables the way Postgres would. */
function matches(row: Row, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return (cond as any[]).every((w) => matches(row, w));
    if (key === 'OR') return (cond as any[]).some((w) => matches(row, w));
    if (key === 'NOT') return !(Array.isArray(cond) ? cond.every((w) => matches(row, w)) : matches(row, cond));
    const v = row[key] ?? null;
    if (cond === null || typeof cond !== 'object' || cond instanceof Date) return cond instanceof Date ? v?.getTime() === cond.getTime() : v === cond;
    return Object.entries(cond).every(([op, x]: [string, any]) => {
      if (op === 'not') return x === null ? v !== null : v !== x;
      if (v === null) return false;
      if (op === 'gte') return v >= x;
      if (op === 'lt') return v < x;
      if (op === 'startsWith') return String(v).startsWith(x);
      if (op === 'endsWith') return String(v).endsWith(x);
      if (op === 'in') return (x as any[]).includes(v);
      throw new Error(`the fake does not know ${op}`);
    });
  });
}

function aTable(rows: Row[]) {
  return {
    count: jest.fn(async (q: any) => rows.filter((r) => matches(r, q.where)).length),
    findMany: jest.fn(async (q: any) => {
      let found = rows.filter((r) => matches(r, q.where));
      if (q.distinct) {
        const seen = new Set<string>();
        found = found.filter((r) => {
          const k = q.distinct.map((d: string) => r[d]).join('|');
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      return found.map((r) => (q.select ? Object.fromEntries(Object.keys(q.select).map((k) => [k, r[k]])) : r));
    }),
  };
}

const NOW = new Date('2026-10-15T10:00:00Z');
const at = (iso: string) => new Date(iso);

const THREADS: Row[] = [
  /* Miriam and Tobi are in a check-in on WhatsApp. */
  { organizationId: 'org-baridi', phone: '+254700000001', checkInId: 'c-1' },
  { organizationId: 'org-baridi', phone: '+254700000002', checkInId: 'c-2' },
  /* Tobi's number written the old way, before numbers were all kept with "+": still Tobi. */
  { organizationId: 'org-baridi', phone: '254700000002', checkInId: 'c-2' },
  /* Amina is asking Groundwork something, having come from check-in c-1. */
  { organizationId: 'org-baridi', phone: '+254700000003', checkInId: 'ask:c-1' },
  /* Samuel is asking Groundwork something, with no check-in to go back to. */
  { organizationId: 'org-baridi', phone: '+254700000004', checkInId: 'ask:' },
  /* Wairimu has been asked which check-in and has not said yet. */
  { organizationId: 'org-baridi', phone: '+254700000005', checkInId: null, pickPendingAt: at('2026-10-15T09:00:00Z') },
  /* Another organisation's person. */
  { organizationId: 'org-other', phone: '+254700000009', checkInId: 'c-9' },
];

function aSend(r: Row): Row {
  return { organizationId: 'org-baridi', phone: '+254700000001', kind: null, sentAt: null, failedAt: null, createdAt: r.sentAt ?? r.failedAt ?? NOW, ...r };
}

const SENDS: Row[] = [
  /* Sent: two messages for c-1, one (a template) for c-2. */
  aSend({ checkInId: 'c-1', kind: 'question', sentAt: at('2026-10-14T08:00:00Z') }),
  aSend({ checkInId: 'c-1', kind: 'question', sentAt: at('2026-10-02T08:00:00Z') }),
  aSend({ checkInId: 'c-2', kind: 'session-open:template', sentAt: at('2026-10-10T08:00:00Z') }),
  /* Held: WhatsApp turned off, and the month's limit reached. Never sent, not a failure of the line. */
  aSend({ checkInId: 'c-3', kind: 'session-open:held', failedAt: at('2026-10-14T08:00:00Z'), error: 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.' }),
  aSend({ checkInId: 'c-4', kind: 'held', failedAt: at('2026-10-13T08:00:00Z'), error: 'Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026.' }),
  /* Told it is held: the one free message, which is not counted towards the month. */
  aSend({ checkInId: 'c-5', kind: 'held-told', sentAt: at('2026-10-14T08:01:00Z') }),
  /* A "Not now" marker: nothing sent, nothing failed. */
  aSend({ checkInId: null, kind: 'not-now' }),
  /* Failed this week, really: two. And one failed three weeks ago. */
  aSend({ checkInId: 'c-6', kind: 'question', failedAt: at('2026-10-12T08:00:00Z'), status: 500, error: 'Meta said no' }),
  aSend({ checkInId: 'c-7', kind: null, failedAt: at('2026-10-11T08:00:00Z'), status: 400, error: 'Meta said no' }),
  aSend({ checkInId: 'c-7', kind: null, failedAt: at('2026-09-24T08:00:00Z'), status: 400, error: 'Meta said no' }),
  /* Sent last month by the UTC calendar, half an hour before October began in UTC (already October in Lagos). */
  aSend({ checkInId: 'c-8', kind: 'question', sentAt: at('2026-09-30T23:30:00Z') }),
  /* An Ask Groundwork reply. */
  aSend({ checkInId: 'ask:c-1', kind: null, sentAt: at('2026-10-14T09:00:00Z') }),
  /* Another organisation's check-in. */
  aSend({ organizationId: 'org-other', checkInId: 'c-9', kind: 'question', sentAt: at('2026-10-14T09:00:00Z') }),
  aSend({ organizationId: 'org-other', checkInId: 'c-9', kind: 'question', failedAt: at('2026-10-14T09:00:00Z') }),
];

function aService() {
  const prisma: any = {
    whatsAppConnection: { findUnique: jest.fn(async () => ({ id: 'wa-1' })) },
    whatsAppThread: aTable(THREADS),
    whatsAppSend: aTable(SENDS),
    productMetric: { findFirst: jest.fn(async () => null) },
  };
  return { svc: new ConnectionsAtAGlanceService(prisma), prisma };
}

describe('the WhatsApp numbers Grace is served on the Connections page', () => {
  it('counts the people in a check-in on WhatsApp, and not a conversation with Ask Groundwork', async () => {
    const { svc } = aService();
    const got = await svc.read('org-baridi', NOW);
    /* Miriam and Tobi. Not Amina or Samuel, who are asking Groundwork; not Wairimu, who has not picked. */
    expect(got.whatsapp!.people).toBe(2);
  });

  it('counts the check-ins a message really went for this month, by the UTC month the limit counts', async () => {
    const { svc } = aService();
    const got = await svc.read('org-baridi', NOW);
    /* c-1 and c-2. Not the held ones, not the free "it is held" message, not the failures, not September, not Ask Groundwork. */
    expect(got.whatsapp!.checkInsThisMonth).toBe(2);
  });

  it('counts a message as sent in the month the plan counts it, on the first and last day too', async () => {
    const { svc } = aService();
    /* Half an hour before October in UTC: September. c-8 counts, with every September send. */
    const lastOfSeptember = await svc.read('org-baridi', at('2026-09-30T23:45:00Z'));
    expect(lastOfSeptember.whatsapp!.checkInsThisMonth).toBe(1);
    /* The first hour of October in UTC: c-8 is no longer this month, whatever the server's own clock says. */
    const firstOfOctober = await svc.read('org-baridi', at('2026-10-01T00:15:00Z'));
    const asked = (svc as any).prisma.whatsAppSend.findMany.mock.calls.at(-1)[0];
    expect(asked.where.sentAt.gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(asked.where.sentAt.lt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(firstOfOctober.whatsapp!.checkInsThisMonth).toBe(2);
  });

  it('counts failed messages this week the same way the WhatsApp section does, so a held message is not a failure', async () => {
    const { svc, prisma } = aService();
    const got = await svc.read('org-baridi', NOW);
    expect(got.whatsapp!.failedThisWeek).toBe(2);
    expect(got.whatsapp!.failedThisWeek).toBe(await failedThisWeekIn(prisma, 'org-baridi', NOW));
  });

  it('serves Grace only three numbers, with no number, name or words in them', async () => {
    const { svc } = aService();
    const got = await svc.read('org-baridi', NOW);
    expect(got).toEqual({ whatsapp: { people: 2, checkInsThisMonth: 2, failedThisWeek: 2 }, figures: { fromYourProduct: false } });
    expect(JSON.stringify(got)).not.toMatch(/\+?\d{7,}|phone|name|said|text|ask:/i);
  });
});
