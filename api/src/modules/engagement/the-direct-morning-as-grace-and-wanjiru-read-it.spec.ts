import { sendTheLeadsDailyNudges, whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, theBoardTheMessageIsAbout } from './the-leads-daily-nudge';
import { theDirectMorningFor, theParagraph, theEmailParts, theSubject, asServedOnTheBoard, aWaitOnYouSaid, aWaitOnAHolderSaid } from './the-direct-morning';
import { theNightRunsDatabase, theLeadsBoard, theLeadOf, N } from './the-night-run-bed';
import { TEMPLATES } from '../whatsapp/a-message-outside-the-window';

/**
 * THE DIRECT MORNING AS GRACE AND WANJIRU READ IT (Hafsah, 20 October 2026), from the second night run (gw_night_run2) and the boards
 * they were served on Tuesday 20 October in the morning. Seven o'clock in Nairobi. Test data only; no model is called.
 */
const NOW = new Date('2026-10-20T04:00:00Z');
const BASE = 'http://localhost:5220';
const DROP = N.drop.ground.id;

function doors(g: 'drop' | 'fees' | 'lit', directMorning: boolean, more: Partial<{ grounds: any[] }> = {}) {
  const db = theNightRunsDatabase(g, { directMorning });
  const ground = { ...N[g].ground, createdAt: new Date(N[g].ground.createdAt) };
  db.ground.findMany = jest.fn(async () => more.grounds ?? [ground]);
  const sent: any[] = [];
  const mails: any[] = [];
  return {
    db, sent, mails,
    deps: {
      prisma: db,
      whatsapp: { isEnabled: async () => true, hasSaidStop: async () => false, sendFor: jest.fn(async (_o: string, phone: string, text: string, ctx: any) => { sent.push({ phone, text, ctx }); return { sent: true }; }) },
      email: {
        sendTheLeadsDailyNudge: jest.fn(async (...a: any[]) => { mails.push({ kind: 'nudge', a }); return 'sent'; }),
        sendTheDirectMorning: jest.fn(async (...a: any[]) => { mails.push({ kind: 'direct', a }); return 'sent'; }),
      },
      boards: {} as any,
      frontendUrl: BASE,
      board: { get: async (groundId: string) => theLeadsBoard(groundId === N.fees.ground.id ? 'fees' : groundId === N.lit.ground.id ? 'lit' : 'drop') },
    } as any,
  };
}

describe('Grace’s direct morning, Tuesday 20 October, Drop Access (test), from the record', () => {
  let m: any;
  beforeAll(async () => {
    m = await theDirectMorningFor(theNightRunsDatabase('drop', { directMorning: true }), { groundId: DROP, leadUserId: theLeadOf('drop').userId, board: theLeadsBoard('drop'), now: NOW });
  });

  it('answers the four questions in order, with names, numbers, customers and days', () => {
    expect(asServedOnTheBoard(m).parts).toEqual([
      { key: 'target', heading: 'Will we reach 120 units sold by 30 October?', lines: [
        '75 of 120 sold, 47 paid.',
        'None of the open deals is likely by 30 October.',
        "You're 45 short, and the open deals cover only 40 of them, so the team needs new leads this week.",
      ] },
      { key: 'needsYou', heading: 'What needs you today', lines: [
        'Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph.',
        'Peter has been waiting on you since Thursday for a specific area to focus on.',
        'Peter is waiting for a list of leads for this week, and nobody has been named to give it, so send it or say who will.',
      ] },
      { key: 'closing', heading: 'About to close', lines: ['Ngong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow.'] },
      { key: 'team', heading: 'Your team today', lines: [
        "Kevin's sale to Roysambu Gym has no proof yet, so ask Kevin for the payment record.",
        'Mercy has 2 sales with proof, so tell Mercy well done.',
      ] },
    ]);
  });

  it('says no label, no judgement and nothing about how a person is, only what happened and the move', () => {
    const all = asServedOnTheBoard(m).parts.flatMap((p) => p.lines).join(' ');
    expect(all).not.toMatch(/\b(?:PIP|at risk|exit|struggl|weak|strong performer|lazy|pattern|coaching|shared picture|a conversation worth having|settled and still open|described differently)\b/i);
  });

  it('the subject says the gap and the first thing that needs her', () => {
    expect(theSubject('Grace', [m])).toBe('Grace: 45 short of 120, and Joseph needs your yes on Juja Hardware');
  });

  it('is cut by priority to fit, whole sentences only, and the target’s first line always stays', () => {
    const short = theParagraph([m], 300).text;
    expect(short.startsWith('Target: 75 of 120 sold, 47 paid.')).toBe(true);
    expect(short.length).toBeLessThanOrEqual(300);
    expect(short).toMatch(/[.!?]$/);
    expect(short).not.toContain('Mercy has 2 sales');
  });
});

describe('the summary she is sent, with the switch on', () => {
  it('on WhatsApp the template is unchanged, {{2}} carries the four parts and {{3}} is her board; the first contact fits in 800 whole', async () => {
    const d = doors('drop', true);
    const r = await sendTheLeadsDailyNudges(d.deps, NOW, { onlyTheDirectMorningAt7: true });
    expect(r.tried).toBe(1);
    const { ctx, text } = d.sent[0];
    expect(TEMPLATES['lead-summary'].body).toBe('Good morning {{1}}. Here is today\'s summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply "not now".');
    expect(ctx.kind).toBe('lead-summary');
    expect(ctx.params[0]).toBe('Grace');
    expect(ctx.params[2]).toBe(`${BASE}/grounds/${DROP}/board`);
    expect(ctx.params[1]).toBe("Target: 75 of 120 sold, 47 paid. None of the open deals is likely by 30 October. You're 45 short, and the open deals cover only 40 of them, so the team needs new leads this week. Needs you today: Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph. Peter has been waiting on you since Thursday for a specific area to focus on. Peter is waiting for a list of leads for this week, and nobody has been named to give it, so send it or say who will. Closing: Ngong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow. Your team: Kevin's sale to Roysambu Gym has no proof yet, so ask Kevin for the payment record. Mercy has 2 sales with proof, so tell Mercy well done.");
    const whole = TEMPLATES['lead-summary'].body.replace(/\{\{(\d+)\}\}/g, (_x: string, n: string) => ctx.params[Number(n) - 1]);
    expect(whole.length).toBeLessThanOrEqual(1024);
    const first = ctx.paramsFor.groundwork_first_contact[0];
    expect(first.length).toBeLessThanOrEqual(800);
    expect(first).toMatch(/^Good morning Grace\. Here is today's summary of your check-ins\. Target: 75 of 120 sold, 47 paid\./);
    expect(first).toContain(`${BASE}/grounds/${DROP}/board`);
    /* Inside the 24 hours: the same four parts, each on its own lines. */
    expect(text).toBe([
      'Good morning Grace.',
      "Will we reach 120 units sold by 30 October?\n75 of 120 sold, 47 paid.\nNone of the open deals is likely by 30 October.\nYou're 45 short, and the open deals cover only 40 of them, so the team needs new leads this week.",
      'What needs you today\nJuja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph.\nPeter has been waiting on you since Thursday for a specific area to focus on.\nPeter is waiting for a list of leads for this week, and nobody has been named to give it, so send it or say who will.',
      'About to close\nNgong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow.',
      "Your team today\nKevin's sale to Roysambu Gym has no proof yet, so ask Kevin for the payment record.\nMercy has 2 sales with proof, so tell Mercy well done.",
      `Your board is here ${BASE}/grounds/${DROP}/board`,
    ].join('\n\n'));
    /* Once a day: the 9am sweep does not send it again. */
    const again = await sendTheLeadsDailyNudges(d.deps, new Date('2026-10-20T08:00:00Z'));
    expect(again.tried).toBe(0);
    expect(d.sent).toHaveLength(1);
  });

  it('by email when WhatsApp cannot take it: the same parts, no template, and a subject with the facts', async () => {
    const d = doors('drop', true);
    d.deps.whatsapp.sendFor = jest.fn(async () => ({ sent: false, error: 'Outside the 24-hour service window and no approved template for this message; not sent' }));
    await sendTheLeadsDailyNudges(d.deps, NOW, { onlyTheDirectMorningAt7: true });
    expect(d.mails).toHaveLength(1);
    const [to, subject, first, parts, label, link] = d.mails[0].a;
    expect(d.mails[0].kind).toBe('direct');
    expect(to).toBeTruthy();
    expect(subject).toBe('Grace: 45 short of 120, and Joseph needs your yes on Juja Hardware');
    expect(first).toBe('Grace');
    expect(parts.map((p: any) => p.heading)).toEqual(['Will we reach 120 units sold by 30 October?', 'What needs you today', 'About to close', 'Your team today']);
    expect(label).toBe('Open your board');
    expect(link).toBe(`${BASE}/grounds/${DROP}/board`);
  });

  it('at seven where the organisation is, and not before', async () => {
    const d = doors('drop', true);
    expect((await sendTheLeadsDailyNudges(d.deps, new Date('2026-10-20T03:30:00Z'), { onlyTheDirectMorningAt7: true })).tried).toBe(0);
    expect(d.sent).toHaveLength(0);
  });
});

describe('with the switch off, Grace reads exactly what she read before', () => {
  it('there is no direct morning, on the board or in the summary', async () => {
    expect(await theDirectMorningFor(theNightRunsDatabase('drop', { directMorning: false }), { groundId: DROP, leadUserId: theLeadOf('drop').userId, board: theLeadsBoard('drop'), now: NOW })).toBeNull();
  });

  it('the seven o’clock sweep sends nothing, and the 9am summary is the one built as before', async () => {
    const d = doors('drop', false);
    expect((await sendTheLeadsDailyNudges(d.deps, NOW, { onlyTheDirectMorningAt7: true })).tried).toBe(0);
    expect(d.sent).toHaveLength(0);
    const at9 = new Date('2026-10-20T08:00:00Z');
    await sendTheLeadsDailyNudges({ ...d.deps, board: undefined }, at9);
    const lead = { userId: theLeadOf('drop').userId, organizationId: N.drop.ground.organizationId, grounds: [{ ...N.drop.ground }] };
    const o = withPlacesWhereTheyTellApart(theseForAPhone(await whatIsOutstandingFor(theNightRunsDatabase('drop', { directMorning: false }), lead as any, { boards: {} as any, release: null }, at9)));
    const before = theTemplateParagraph('Grace', o, theBoardTheMessageIsAbout(BASE, lead.grounds, o));
    if (d.sent.length) {
      expect(d.sent[0].ctx.params).toEqual(before.params);
      expect(d.sent[0].ctx.paramsFor).toBeUndefined();
      expect(d.sent[0].ctx.params[1]).not.toMatch(/^Target:/);
    } else {
      expect(before.params[1]).toBe('');
    }
    expect(d.mails.every((x) => x.kind !== 'direct')).toBe(true);
  });
});

describe('Wanjiru’s direct morning, Muchemi & Co (test): fee notes and the litigation team in one message', () => {
  it('says what is owed and paid with proof, what fell due and why, who to chase, what needs the partner, and the team', async () => {
    const fees = await theDirectMorningFor(theNightRunsDatabase('fees', { directMorning: true }), { groundId: N.fees.ground.id, leadUserId: theLeadOf('fees').userId, board: theLeadsBoard('fees'), now: NOW });
    const lit = await theDirectMorningFor(theNightRunsDatabase('lit', { directMorning: true }), { groundId: N.lit.ground.id, leadUserId: theLeadOf('lit').userId, board: theLeadsBoard('lit'), now: NOW });
    expect(theEmailParts([fees!, lit!])).toEqual([
      { heading: 'What is owed, and what is paid, in Fee notes', lines: [
        'KES 180,000 is owed on 3 fee notes, and 2 of them have no amount on record. Nothing is paid with proof yet.',
        'FN-006 for Baraka Hardware, FN-009 for Upendo Schools and FN-004 for Kasarani Foods are marked paid, KES 670,000 in all, with no proof filed.',
        'No fee note fell due today.',
      ] },
      { heading: 'What needs you today, in Fee notes', lines: [
        'Nyota Logistics disputes FN-008, saying the contract review was billed twice, and Brian follows it up, so decide whether to correct it.',
        'Brian has been waiting on you since 12 October for guidance on how to proceed with the double-billing claim.',
        'You marked FN-004 for Kasarani Foods paid, so file the bank slip or the M-Pesa message.',
      ] },
      { heading: 'Who to chase, in Fee notes', lines: [
        'FN-005 for Kasarani Foods v. Tumaini Traders fell due on 14 October, when the reply was filed, and nothing is paid yet. Brian follows it up.',
        'Jamii Clinics owes KES 180,000 on FN-007, and Aisha follows it up.',
        'Ask Njeri for the proof that FN-006 for Baraka Hardware is paid.',
        'Ask Njeri for the proof that FN-009 for Upendo Schools is paid.',
      ] },
      { heading: 'What needs you today, in Litigation team daily', lines: [
        "Brian has been waiting since 13 October for the court's e-filing portal to be working.",
        'Brian has been waiting on you since Thursday about the Nyota Logistics fee dispute.',
        'People said different things about who is assigned to the Jamii Clinics employment claim, so settle it with them.',
        'People said different things about the current status of the Kasarani Foods reply, so settle it with them.',
      ] },
      { heading: 'Your team today, in Litigation team daily', lines: [
        "David hasn't checked in since Friday.",
        "Brian hasn't checked in since Friday.",
        "Aisha hasn't checked in since Friday.",
      ] },
    ]);
    expect(theSubject('Wanjiru', [fees!, lit!])).toBe('Wanjiru: KES 180,000 owed, and Nyota Logistics disputes FN-008');
  });
});

describe('only the lead who runs the check-in is served it', () => {
  it('a team member, or anybody who does not run it, is served no direct morning', async () => {
    const kevin = N.drop.participants.find((p: any) => p.user?.firstName === 'Kevin').userId;
    expect(await theDirectMorningFor(theNightRunsDatabase('drop', { directMorning: true }), { groundId: DROP, leadUserId: kevin, board: theLeadsBoard('drop'), now: NOW })).toBeNull();
  });
  it('the board adds it only for the lead, after every wall, and only through theDirectMorningFor', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'board', 'board.service.ts'), 'utf8');
    const at = src.indexOf('(asServed as any).theMorning = asServedOnTheBoard(morning)');
    expect(at).toBeGreaterThan(0);
    const before = src.slice(Math.max(0, at - 400), at);
    expect(before).toMatch(/if \(isInitiator\) \{\s*const morning = await theDirectMorningFor\(this\.prisma, \{ groundId, leadUserId: requestingUserId, board: asServed, now \}\)/);
  });
});

/*
 * EACH WAIT IS ONE PLAIN SENTENCE: who waits, on whom, since when, and for what. From the stored waits of the second night run: Brian's
 * wait on "the court's e-filing portal" for "the e-filing portal to be working", and his wait on Wanjiru for "the Nyota Logistics fee
 * dispute". They read "Brian is waiting on the court's e-filing portal for the e-filing portal to be working." and "Brian has been
 * waiting for the Nyota Logistics fee dispute from you since Thursday."
 */
/** Two words said together twice in one line ("e-filing portal ... e-filing portal"), or null. */
function theSamePairTwice(line: string): string | null {
  const w = line.toLowerCase().split(/[^a-z0-9'-]+/).filter((x) => x.length > 3);
  const seen = new Set<string>();
  for (let i = 0; i + 1 < w.length; i++) { const pair = `${w[i]} ${w[i + 1]}`; if (seen.has(pair)) return pair; seen.add(pair); }
  return null;
}

describe('each wait in the direct morning is one plain sentence', () => {
  it('the check finds the line as it read', () => {
    expect(theSamePairTwice("Brian is waiting on the court's e-filing portal for the e-filing portal to be working.")).toBe('e-filing portal');
  });

  const lit = N.lit.waits as any[];
  const portal = lit.find((w) => w.what === 'the e-filing portal to be working');
  const dispute = lit.find((w) => w.what === 'the Nyota Logistics fee dispute');

  it('the thing waited on is said once, as the holder', () => {
    expect(portal.onLabel).toBe("the court's e-filing portal");
    expect(aWaitOnAHolderSaid('Brian', portal.onLabel, portal.what, 'since 13 October')).toBe("Brian has been waiting since 13 October for the court's e-filing portal to be working.");
    /* A holder who is not the thing itself is said as who he waits on. */
    expect(aWaitOnAHolderSaid('Aisha', 'Mr. Baraka', 'proof of payment for FN-006', 'since Monday')).toBe('Aisha has been waiting on Mr. Baraka since Monday for proof of payment for FN-006.');
  });

  it('a dispute is what he waits on you about, never a thing to be given', () => {
    expect(aWaitOnYouSaid('Brian', dispute.what, 'since Thursday')).toBe('Brian has been waiting on you since Thursday about the Nyota Logistics fee dispute.');
    expect(aWaitOnYouSaid('Brian', 'guidance on how to proceed with the double-billing claim', 'since 12 October')).toBe('Brian has been waiting on you since 12 October for guidance on how to proceed with the double-billing claim.');
  });

  it('no line of Grace’s or Wanjiru’s morning says the same thing twice in a row or ends on "from you since"', async () => {
    const all: string[] = [];
    for (const g of ['drop', 'fees', 'lit'] as const) {
      const m = await theDirectMorningFor(theNightRunsDatabase(g, { directMorning: true }), { groundId: N[g].ground.id, leadUserId: theLeadOf(g).userId, board: theLeadsBoard(g), now: NOW });
      all.push(...asServedOnTheBoard(m!).parts.flatMap((p) => p.lines));
    }
    for (const line of all) {
      expect(line).not.toMatch(/from you since/);
      expect(theSamePairTwice(line)).toBeNull();
      expect(line).toMatch(/^[A-Z0-9].*[.!?]$/);
    }
  });
});
