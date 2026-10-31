const caught: any[] = [];
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: async (m: any) => { caught.push(m); } }) }));

import * as AS_STAGING_SERVED_IT from './__fixtures__/off-as-staging-served-it.json';
import { EmailService } from '../email/email.service';
import { theNightRunsDatabase, theLeadsBoard, N } from './the-night-run-bed';
import { sendTheLeadsDailyNudges } from './the-leads-daily-nudge';
import { theFirstInsight } from './the-first-insight';
import { theSharedPictureSubject } from './the-leads-subjects-carry-the-facts';
import { WebhooksListener } from '../webhooks/webhooks.listener';
import { BoardController } from '../board/board.controller';
import { ReportsController } from '../reports/reports.controller';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { theShortRun, reader } from '../board/the-short-run-harness';
import * as SERVED from '../reports/__fixtures__/night-run-2-served.json';

/**
 * WITH THE DIRECT MORNING OFF, EVERY READER GETS EXACTLY WHAT ORIGIN/STAGING SERVED (captured at 77b5ec42c, re-captured at f77ba8a1d after #392 and #393) (Hafsah, 20 October 2026: "with it off,
 * every reader must get exactly today's output").
 *
 * The same code below was run on a checkout of origin/staging at 77b5ec42c, over the same stored data (the second night run, test data
 * only: Drop Access (test) and Muchemi & Co (test); and the short run's board), and what it served is kept in
 * `__fixtures__/off-as-staging-served-it.json`. Here it runs on this branch with every organisation's switch off, and must serve the same:
 *  - the lead's morning summary: the WhatsApp template's blanks and the text inside the 24 hours, at 7am and at 9am, and its email form;
 *  - the session-ready email (with and without missed check-ins), the report-ready email to a lead and to a rep, the invitation, the
 *    reminder, and "somebody has checked in";
 *  - the WhatsApp opening to every team member with a number;
 *  - the board as the controller serves it, to the lead and two reps, which carries one field more, `directMorning: false`, for the
 *    screens (organisation/the-screen-is-told-the-direct-morning.ts), and nothing else different;
 *  - the team report as the controller serves it, to each reader of the night run.
 *
 * If a change is meant for everybody (a fix to something untrue), it changes this fixture too: rerun this capture on that change's
 * base and say so in the commit. A change that only the switch should make must never change it.
 */
const BASE = 'http://localhost:5220';
const AT9 = new Date('2026-10-20T08:00:00Z');
const AT7 = new Date('2026-10-20T04:00:00Z');
const GRACE = 'grace@dropaccess.test';
const KEVIN = 'kevin@dropaccess.test';
const JOSEPH = 'joseph@dropaccess.test';
const DAVID = 'david@muchemi.test';
const DROP = N.drop.ground.id;
const LIT = N.lit.ground.id;
const KEVINS_PLACE = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const KEVINS_MONDAY = '58c94007-d435-45c0-bdb0-83677b2954a3';
const DAVIDS_PLACE = 'ebf80337-bb6d-466e-860d-79ae94cc967d';
const plain = (v: any) => JSON.parse(JSON.stringify(v ?? null));
const nothing: any = new Proxy({}, { get: (_t, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) });
const withNothing = (t: any) => new Proxy(t, { get: (x, k: string) => (k in x ? x[k] : nothing[k]) });

function nudgeDoors(g: 'drop' | 'fees' | 'lit', whatsappWorks: boolean) {
  const db = theNightRunsDatabase(g, { directMorning: false });
  const ground = { ...N[g].ground, createdAt: new Date(N[g].ground.createdAt) };
  db.ground.findMany = jest.fn(async () => [ground]);
  const sent: any[] = []; const mails: any[] = [];
  return {
    sent, mails,
    deps: {
      prisma: db,
      whatsapp: { isEnabled: async () => true, hasSaidStop: async () => false, sendFor: jest.fn(async (_o: string, phone: string, text: string, ctx: any) => { sent.push({ phone, text, ctx: plain(ctx) }); return whatsappWorks ? { sent: true } : { sent: false, error: 'Outside the 24-hour service window and no approved template for this message; not sent' }; }) },
      email: {
        sendTheLeadsDailyNudge: jest.fn(async (...a: any[]) => { mails.push({ kind: 'nudge', a: plain(a) }); return 'sent'; }),
        sendTheDirectMorning: jest.fn(async (...a: any[]) => { mails.push({ kind: 'direct', a: plain(a) }); return 'sent'; }),
      },
      boards: {} as any,
      frontendUrl: BASE,
      board: { get: async () => theLeadsBoard(g) },
    } as any,
  };
}

function theDatabase() {
  const drop = theNightRunsDatabase('drop', { directMorning: false });
  const lit = theNightRunsDatabase('lit', { directMorning: false });
  const orgs = [...(N.org as any[])].map((o) => ({ ...o, directMorningOn: false }));
  const grounds: Record<string, any> = {
    [DROP]: { ...N.drop.ground, organization: { name: 'Drop Access (test)' }, initiator: { email: GRACE }, peersVisibleToEachOther: true },
    [LIT]: { ...N.lit.ground, organization: { name: 'Muchemi & Co (test)' }, initiator: { email: 'wanjiru@muchemi.test' }, peersVisibleToEachOther: true },
  };
  const places = [...N.drop.participants, ...N.lit.participants];
  const users = places.map((p: any) => ({ email: p.email, organizationId: p.groundId === DROP ? N.drop.ground.organizationId : N.lit.ground.organizationId }));
  return withNothing({
    ...drop,
    organization: { findUnique: jest.fn(async ({ where }: any) => orgs.find((o) => o.id === where.id) ?? null) },
    ground: { findUnique: jest.fn(async ({ where }: any) => grounds[where.id] ?? null) },
    groundParticipant: {
      findUnique: jest.fn(async ({ where }: any) => { const p = places.find((x: any) => x.id === where.id); return p ? { ...p, stopRemindersToken: `stop-${p.id.slice(0, 4)}` } : null; }),
      update: jest.fn(async () => null),
    },
    user: { findFirst: jest.fn(async ({ where }: any) => users.find((u: any) => u.email === where.email.equals) ?? null), findUnique: jest.fn(async () => null) },
    workItem: drop.workItem,
    checkIn: { findUnique: jest.fn(async ({ where }: any) => [...N.drop.checkIns, ...N.lit.checkIns].map((c: any) => ({ ...c, availableFrom: c.availableFrom && new Date(c.availableFrom), createdAt: new Date(c.createdAt), completedAt: c.completedAt && new Date(c.completedAt) })).find((c: any) => c.id === where.id) ?? null) },
    personObjective: lit.personObjective,
  });
}

function aMailer() {
  caught.length = 0;
  const config: any = { get: (k: string) => ({ 'resend.sendsForReal': false, 'resend.apiKey': '', 'resend.frontendUrl': BASE } as any)[k] };
  const email = new EmailService(config, { recordSend: async () => undefined } as any, theDatabase() as any);
  Object.assign(email as any, {
    wouldTheyRatherNot: async () => null, theyHadTheirOneToday: async () => null, theSummaryWentOnWhatsAppToday: async () => null,
    holdForTheMorning: async () => false, writeItDown: async () => undefined,
    theWayToStopHearingFromUs: async () => `${BASE}/unsubscribe/u1`,
    theWhatsAppLine: async () => '<p>You can also check in on WhatsApp.</p>',
    whatHappensWhenTheyJoin: async () => '<p>When you join, you go straight in and can check in at once.</p>',
  });
  return email;
}
const lastTo = (to: string) => { const m = [...caught].reverse().find((x) => x.to === to); return m ? { subject: m.subject, html: m.html, text: m.text } : null; };

const MONDAYS_REPORT = {
  whereThingsStand: {
    settled: ['a', 'b', 'c'],
    differences: ["The standard for what counts as a 'sold' unit is not being applied consistently"],
    openWithReasons: [{ topic: "The standard for what counts as a 'sold' unit is not being applied consistently", settledBy: "Agree on the single, specific point at which a deal is counted as 'sold' in the team's official tally." }],
  },
};

it('serves every reader exactly what origin/staging served, with the direct morning off', async () => {
  const out: Record<string, any> = {};

  /* 1 and 2. The lead's summary: WhatsApp blanks at 7am and 9am, and its email form when WhatsApp cannot take it. */
  for (const g of ['drop', 'fees', 'lit'] as const) {
    for (const [at, when] of [[AT7, '7am'], [AT9, '9am']] as const) {
      const d = nudgeDoors(g, true);
      await sendTheLeadsDailyNudges(d.deps, at);
      out[`summary.${g}.${when}.whatsapp`] = { sent: d.sent, mails: d.mails };
      const e = nudgeDoors(g, false);
      await sendTheLeadsDailyNudges(e.deps, at);
      out[`summary.${g}.${when}.email`] = { sent: e.sent, mails: e.mails };
    }
  }

  /* 3. The session-ready email, and 4. the report-ready email, the invitation, the reminder and somebody has checked in. */
  const email = aMailer();
  await (email as any).sendSessionReady(KEVIN, 'Sales team, Q4', `${BASE}/checkin/c1`, false, null, DROP);
  out['email.sessionReady'] = lastTo(KEVIN);
  await (email as any).sendSessionReady(DAVID, 'Litigation team daily', `${BASE}/checkin/c2`, true, ['Monday 19 October'], LIT);
  out['email.sessionReady.missed'] = lastTo(DAVID);
  const lead = theFirstInsight(MONDAYS_REPORT, 'Sales team, Q4', { isTheLead: true } as any)!;
  const rep = theFirstInsight(MONDAYS_REPORT, 'Sales team, Q4', { isTheLead: false } as any)!;
  await (email as any).sendReportReady(GRACE, 'Sales team, Q4', `${BASE}/grounds/g/session/1`, undefined, DROP, lead.subjectForTheLead ?? undefined, lead.lines, { url: `${BASE}/chat?about=g`, label: 'I can help you do that' }, null);
  out['email.reportReady.lead'] = lastTo(GRACE);
  await (email as any).sendReportReady(JOSEPH, 'Sales team, Q4', `${BASE}/invite?token=t`, undefined, DROP, (theSharedPictureSubject as any)('Sales team, Q4', null, null), rep.lines, undefined, null);
  out['email.reportReady.rep'] = lastTo(JOSEPH);
  await (email as any).sendParticipantInvite(KEVIN, 'Grace', 'Sales team, Q4', 'tok', 'Sales rep', { kind: 'PARTICIPANT_INVITE', participantId: KEVINS_PLACE } as any);
  out['email.invite'] = lastTo(KEVIN);
  await (email as any).sendNudge(DAVID, 'Litigation team daily', `${BASE}/checkin/c`, 'PULSE_CHECK', true, null, DAVIDS_PLACE);
  out['email.reminder'] = lastTo(DAVID);
  await (email as any).sendParticipantCheckedIn(GRACE, 'Kevin Omondi', 'Sales team, Q4', `${BASE}/grounds/g`, 0, undefined, { groundId: DROP, participantId: KEVINS_PLACE, checkInId: KEVINS_MONDAY });
  out['email.checkedIn'] = lastTo(GRACE);

  /* 5. A WhatsApp opening, for each team member with a number, as the opening notice sends it. */
  for (const g of ['drop', 'lit'] as const) {
    for (const p of (N[g].participants as any[]).filter((x) => x.userId !== N[g].ground.initiatorId)) {
      const db = withNothing({
        ...theNightRunsDatabase(g, { directMorning: false }),
        groundParticipant: { findUnique: jest.fn(async () => ({ id: p.id, email: p.email, userId: p.userId, user: { firstName: p.user?.firstName ?? null, email: p.email, phoneNumber: '+254700000001' } })), findMany: jest.fn(async () => []) },
      });
      const sends: any[] = [];
      const listener: any = Object.create(WebhooksListener.prototype);
      Object.assign(listener, { prisma: db, whatsapp: { sendFor: jest.fn(async (...a: any[]) => { sends.push(plain(a)); return { sent: true }; }) }, theApprovalEmailOpenedIt: async () => false, logger: { log() {}, warn() {}, error() {} } });
      await listener.announceOnWhatsApp({ groundId: N[g].ground.id, participantId: p.id, checkInId: `c-${p.id}`, sessionNumber: 3 }, { organizationId: N[g].ground.organizationId, label: N[g].ground.label, overWhatsApp: true, simplerWords: false });
      out[`whatsapp.opening.${g}.${p.user?.firstName}`] = sends;
    }
  }

  /* 6. The board as served, through the controller, for the lead and a rep (the short run's record). */
  for (const who of ['Grace', 'Kevin', 'Mercy']) {
    const served = await boardAs(theShortRun(), ...reader(who));
    const controller = new (BoardController as any)({ get: async () => structuredClone(served) }, withNothing({ ground: { findUnique: async () => ({ organizationId: 'org-1' }) }, organization: { findUnique: async () => ({ id: 'org-1', directMorningOn: false }) } }));
    out[`board.${who}`] = plain(await controller.get('g-1', 'u', undefined));
  }

  /* 7. The team report and a session's report as served, through the controller, from what each reader was served in the night run. */
  for (const r of ((SERVED as any).default ?? SERVED).readers as any[]) {
    const controller = new (ReportsController as any)({ get: async () => structuredClone(r.teamReport), sessionReport: async () => structuredClone(r.teamReport), theSwitchboardsPickFor: async () => ({}) }, withNothing({ ground: { findUnique: async () => ({ organizationId: 'org-1' }) }, organization: { findUnique: async () => ({ id: 'org-1', directMorningOn: false }) } }));
    out[`teamReport.${r.which}.${r.reader}`] = plain(await controller.get('g-1', 'u', 'org-1'));
  }

  const before: Record<string, any> = (AS_STAGING_SERVED_IT as any).default ?? AS_STAGING_SERVED_IT;
  expect(Object.keys(out).sort()).toEqual(Object.keys(before).sort());
  for (const key of Object.keys(before)) {
    /* `thisSession` is the one count of who has answered (grounds/this-sessions-count.ts, Hafsah, 30 October 2026), served to whoever
       runs it; staging had none. It is checked in this-sessions-count.spec.ts, and left out of the comparison like `directMorning`. */
    const now = key.startsWith('board.') ? (({ directMorning, thisSession: _one, ...rest }: any) => { expect(directMorning).toBe(false); return rest; })(out[key]) : out[key];
    expect([key, now]).toEqual([key, before[key]]);
  }
  /* And it is not empty: the summary, the emails and the openings were all sent. */
  expect(out['summary.drop.9am.whatsapp'].sent.length).toBe(1);
  expect(out['email.sessionReady'].subject).toBe('Your next check-in is open: Sales team, Q4');
  expect(out['whatsapp.opening.lit.Brian']).toHaveLength(1);
});
