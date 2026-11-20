const caught: any[] = [];
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: async (m: any) => { caught.push(m); } }) }));

import { EmailService } from './email.service';
import { theNightRunsDatabase, N } from '../engagement/the-night-run-bed';
import { theFirstInsight } from '../engagement/the-first-insight';
import { theSharedPictureSubject } from '../engagement/the-leads-subjects-carry-the-facts';
import { THANKS_YOUR_ANSWER_IS_IN } from '../public-api/a-whatsapp-message-is-routed';

/**
 * EVERY EMAIL A LEAD AND A REP GET, DIRECT BEHIND THE DIRECT MORNING'S SWITCH, AND EXACTLY AS BEFORE WITHOUT IT (Hafsah, 20 October 2026, part 4).
 *
 * Built from the second night run (Drop Access (test), "Sales team, Q4": Grace runs it; Kevin, Joseph, Peter and Mercy are on it; and
 * Muchemi & Co (test), "Litigation team daily": Wanjiru runs it, David is on it). Each email goes through the real door every email goes
 * through (EmailService.deliverNow), so the footer is added, or not, where it always is, and the text is what a mail program shows.
 *
 * Since release batch 1 (4 November 2026) the switch is gone and these are the only words: names, numbers, customers and days, and no paragraph about Groundwork, no note about who sees what, no "shared picture",
 * no "settled and still open", no "a conversation worth having", and no "you are never obligated". Who can see what never changes: the
 * same people are sent the same mail, and nothing is in it they could not read before.
 */
const GRACE = 'grace@dropaccess.test';
const KEVIN = 'kevin@dropaccess.test';
const JOSEPH = 'joseph@dropaccess.test';
const DAVID = 'david@muchemi.test';
const DROP = N.drop.ground.id;
const LIT = N.lit.ground.id;
const KEVINS_PLACE = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const KEVINS_MONDAY = '58c94007-d435-45c0-bdb0-83677b2954a3';
const DAVIDS_PLACE = 'ebf80337-bb6d-466e-860d-79ae94cc967d';

/** The night run's database for one organisation, with what an email reads: the check-in, its lead's address, and who is who. */
function theDatabase(on: boolean) {
  const drop = theNightRunsDatabase('drop', { directMorning: on });
  const lit = theNightRunsDatabase('lit', { directMorning: on });
  const orgs = [...(N.org as any[])].map((o) => ({ ...o, directMorningOn: on }));
  const grounds: Record<string, any> = {
    [DROP]: { ...N.drop.ground, organization: { name: 'Drop Access (test)' }, initiator: { email: GRACE }, peersVisibleToEachOther: true },
    [LIT]: { ...N.lit.ground, organization: { name: 'Muchemi & Co (test)' }, initiator: { email: 'wanjiru@muchemi.test' }, peersVisibleToEachOther: true },
  };
  const places = [...N.drop.participants, ...N.lit.participants];
  const users = places.map((p: any) => ({ email: p.email, organizationId: p.groundId === DROP ? N.drop.ground.organizationId : N.lit.ground.organizationId }));
  const nothing: any = new Proxy({}, { get: (_t, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) });
  const tables: any = {
    ...drop,
    organization: { findUnique: jest.fn(async ({ where }: any) => orgs.find((o) => o.id === where.id) ?? null) },
    ground: { findUnique: jest.fn(async ({ where }: any) => grounds[where.id] ?? null) },
    groundParticipant: {
      findUnique: jest.fn(async ({ where }: any) => {
        const p = places.find((x: any) => x.id === where.id);
        return p ? { ...p, stopRemindersToken: `stop-${p.id.slice(0, 4)}` } : null;
      }),
      update: jest.fn(async () => null),
    },
    user: { findFirst: jest.fn(async ({ where }: any) => users.find((u: any) => u.email === where.email.equals) ?? null), findUnique: jest.fn(async () => null) },
    workItem: drop.workItem,
    checkIn: { findUnique: jest.fn(async ({ where }: any) => [...N.drop.checkIns, ...N.lit.checkIns].map((c: any) => ({ ...c, availableFrom: c.availableFrom && new Date(c.availableFrom), createdAt: new Date(c.createdAt), completedAt: c.completedAt && new Date(c.completedAt) })).find((c: any) => c.id === where.id) ?? null) },
    personObjective: lit.personObjective,
  };
  return new Proxy(tables, { get: (t, k: string) => t[k] ?? nothing[k] });
}

function aMailer(on: boolean) {
  caught.length = 0;
  const config: any = { get: (k: string) => ({ 'resend.sendsForReal': false, 'resend.apiKey': '', 'resend.frontendUrl': 'http://localhost:5220' } as any)[k] };
  const email = new EmailService(config, { recordSend: async () => undefined } as any, theDatabase(on) as any);
  Object.assign(email as any, {
    wouldTheyRatherNot: async () => null,
    theyHadTheirOneToday: async () => null,
    theSummaryWentOnWhatsAppToday: async () => null,
    holdForTheMorning: async () => false,
    writeItDown: async () => undefined,
    theWayToStopHearingFromUs: async () => 'http://localhost:5220/unsubscribe/u1',
    theWhatsAppLine: async () => '<p>You can also check in on WhatsApp. Send Hi to +44 7700 900123.</p><p><a href="https://wa.me/447700900123?text=Hi">Connect WhatsApp</a></p>',
    whatHappensWhenTheyJoin: async () => '<p>When you join, you go straight in and can check in at once.</p>',
  });
  return email;
}

/** What a mail program shows, with every link's address left out (the tokens differ from run to run). */
const read = (to: string) => {
  const m = [...caught].reverse().find((x) => x.to === to);
  return m ? { subject: m.subject as string, text: String(m.text).replace(/\s*\((?:https?:)[^)]*\)/g, '').replace(/https?:\/\/\S+/g, '<link>').trim() } : null;
};

/* Session 1 of "Sales team, Q4", as the report was served (Monday 12 October). */
const MONDAYS_REPORT = {
  whereThingsStand: {
    settled: ['a', 'b', 'c'],
    differences: ["The standard for what counts as a 'sold' unit is not being applied consistently"],
    openWithReasons: [{ topic: "The standard for what counts as a 'sold' unit is not being applied consistently", settledBy: "Agree on the single, specific point at which a deal is counted as 'sold' in the team's official tally." }],
  },
};

async function everyEmail(on: boolean) {
  const email = aMailer(on);
  const out: Record<string, { subject: string; text: string } | null> = {};
  const lead = theFirstInsight(MONDAYS_REPORT, 'Sales team, Q4', { isTheLead: true })!;
  const rep = theFirstInsight(MONDAYS_REPORT, 'Sales team, Q4', { isTheLead: false })!;
  await email.sendReportReady(GRACE, 'Sales team, Q4', 'http://localhost:5220/grounds/g/check-in/1', undefined, DROP, lead.subjectForTheLead ?? undefined, lead.lines, { url: 'http://localhost:5220/chat?about=g', label: 'I can help you do that' }, null);
  out.leadReport = read(GRACE);
  await email.sendReportReady(JOSEPH, 'Sales team, Q4', 'http://localhost:5220/invite?token=t', undefined, DROP, theSharedPictureSubject('Sales team, Q4', null, null), rep.lines, undefined, null);
  out.repReport = read(JOSEPH);
  await email.sendParticipantInvite(KEVIN, 'Grace', 'Sales team, Q4', 'tok', 'Sales rep', { kind: 'PARTICIPANT_INVITE', participantId: KEVINS_PLACE } as any);
  out.invite = read(KEVIN);
  await email.sendParticipantCheckedIn(GRACE, 'Kevin Omondi', 'Sales team, Q4', 'http://localhost:5220/grounds/g', 0, undefined, { groundId: DROP, participantId: KEVINS_PLACE, checkInId: KEVINS_MONDAY });
  out.checkedIn = read(GRACE);
  await email.sendNudge(DAVID, 'Litigation team daily', 'http://localhost:5220/checkin/c', 'PULSE_CHECK', true, null, DAVIDS_PLACE);
  out.nudge = read(DAVID);
  await email.sendTheAnswerByEmail(GRACE, 'Thank you, your answer for Sales team, Q4 is in', THANKS_YOUR_ANSWER_IS_IN('Sales team, Q4'), null, null, '9594ee31-5f40-41d2-97fe-e87527405712');
  out.thanks = read(GRACE);
  await email.sendAddPasswordEmail(KEVIN, 'Kevin', 'tok');
  out.password = read(KEVIN);
  return out;
}

describe('with the direct morning on, every email says what happened and nothing else', () => {
  let m: Record<string, { subject: string; text: string } | null>;
  beforeAll(async () => { m = await everyEmail(true); });

  it('Grace, the report is ready: the finding and what to do, and the link', () => {
    expect(m.leadReport!.subject).toBe(`In "Sales team, Q4", the standard for what counts as a 'sold' unit is not being applied consistently`);
    expect(m.leadReport!.text).toBe([
      "The standard for what counts as a 'sold' unit is not being applied consistently.",
      "Here is what I would do first. Agree on the single, specific point at which a deal is counted as 'sold' in the team's official tally.",
      'I can help you do that',
      'Read the report',
    ].join('\n\n'));
  });

  it('Joseph, the report is ready: the finding, and the link', () => {
    expect(m.repReport!.subject).toBe('Your report for "Sales team, Q4" is ready');
    expect(m.repReport!.text).toBe(["The standard for what counts as a 'sold' unit is not being applied consistently.", 'Read the report →'].join('\n\n'));
  });

  /* Changed 4 November 2026 (Hafsah: one plain consent line stays where people first agree): the invitation says who sees what they say. */
  it('Kevin, the invitation: who asks, what it is, who sees what he says, and the button', () => {
    expect(m.invite!.text).toBe([
      'Hi Kevin,',
      'Grace would like to know what you are seeing in Sales team, Q4.',
      'It is a short check-in, about ten minutes, where you say what is actually going on from where you sit.',
      'You see your own report straight away. The person who runs it shares a team report when it is ready. Nobody else reads your conversation.',
      'When you join, you go straight in and can check in at once.',
      'Sales rep',
      'Start my check-in →',
      'You can also check in on WhatsApp. Send Hi to +44 7700 900123.',
      'Connect WhatsApp',
      'Would you rather I stopped reminding you? Stop the reminders.',
    ].join('\n\n'));
  });

  it('Grace, Kevin has checked in: the customers, units and money he reported, and his next steps', () => {
    expect(m.checkedIn!.subject).toBe('Kevin Omondi has checked in on Sales team, Q4');
    expect(m.checkedIn!.text).toBe([
      'Kevin Omondi has checked in on Sales team, Q4.',
      'Ngong Road Minimart has a quote for 5 units, and the value Kevin gave is KES 25,000. The next step is "paid on delivery on Wednesday".',
      'Roysambu Gym bought 3 units, and the value Kevin gave is KES 15,000. The next step is "Faith is working on getting approval".',
      'Savannah Cafe bought 6 units, and the value Kevin gave is KES 15,000 deposit. The next step is "pay the deposit tomorrow".',
      'Everyone has now checked in.',
      'Read the check-in →',
    ].join('\n\n'));
  });

  it('David, the reminder: the check-in, how long, and that he is the last', () => {
    expect(m.nudge!.subject).toBe('Your check-in for Litigation team daily is waiting');
    expect(m.nudge!.text).toBe([
      'Your check-in for Litigation team daily is still open. It takes about ten minutes.',
      'Everyone else has checked in. Yours is the last one.',
      'Check in',
      'Would you rather I stopped reminding you? Stop the reminders.',
      'You can also check in on WhatsApp. Send Hi to +44 7700 900123.',
      'Connect WhatsApp',
      'If you would rather not get the emails I decide to send, you can stop them here.',
    ].join('\n\n'));
  });

  it('Grace, her own answer is in', () => {
    expect(m.thanks!.text).toBe('Thank you, your answer for Sales team, Q4 is in. You will be told when the report is ready.');
  });

  it('Kevin, set a password: what it is for, and nothing about what Groundwork is', () => {
    expect(m.password!.text.split('\n\n').slice(0, 2)).toEqual(['Hi Kevin,', 'Setting a password means you can come back and sign in with this email address and your password.']);
  });

  it('no email, to anybody, explains Groundwork, notes who sees what, or hedges (the invitation keeps its one consent line)', () => {
    for (const [kind, mail] of Object.entries(m).filter(([k]) => k !== 'invite')) {
      const all = `${mail!.subject}\n${mail!.text}`;
      expect({ kind, all }).toEqual({ kind, all: expect.not.stringMatching(/Groundwork is where|including your manager|stay private|shared picture|settled|conversation worth having|never obligated|What you share here is yours|nothing is recorded/i) });
    }
  });
});

describe('the round digest (to Kevin, session 1 of "Sales team, Q4")', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { digestBody } = require('./nothing-lands-at-3am');
  const facts = { groundLabel: 'Sales team, Q4', sessionNumber: 1, participantCount: 5, accountsGiven: 5, needsAttention: 1, permalink: 'http://localhost:5220/grounds/g' };
  it('on: the link in a sentence, and one way to stop them, in the footer', () => {
    expect(digestBody(facts)).toBe([
      'Everyone has checked in for check-in 1 of Sales team, Q4.',
      "5 people took part. One thing somebody is waiting for is still open, and the check-in's board shows who is waiting and for what.",
      "Read it on the check-in's board at http://localhost:5220/grounds/g",
    ].join('\n'));
  });
});

describe('somebody is waiting to be let in (to Grace)', () => {
  const send = async (on: boolean) => {
    const email = aMailer(on);
    await email.sendSomebodyIsWaiting(GRACE, 'Grace', 'peter@dropaccess.test', 'Grace Achieng', 'Sales team, Q4', { name: 'Peter Njoroge', organisationName: 'Drop Access (test)', cameThroughTheLink: true });
    return read(GRACE)!;
  };
  it('on: what it needs from her', async () => {
    const m = await send(true);
    expect(m.subject).toBe('Peter Njoroge is waiting to be let into Drop Access (test).');
    expect(m.text.split('\n\n')[2]).toBe('They can sign in, and they cannot start until you approve them joining.');
  });
});
