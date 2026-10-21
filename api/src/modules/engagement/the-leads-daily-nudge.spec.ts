import 'reflect-metadata';
import { TodayController } from '../grounds/today.controller';
import { everythingOutstandingFor, sendTheLeadsDailyNudges, theWindowForm, theTemplateParagraph, theNudgeParts, theNudgeSubject, atMostThreeLines, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { TEMPLATES, A_TEMPLATE_BODY_LIMIT, OUTSIDE_THE_WINDOW, NOT_TODAY, THEY_SAID_NOT_NOW, NOT_TURNED_ON_QUIETLY } from '../whatsapp/a-message-outside-the-window';
import { THEY_HAD_ONE_TODAY } from './one-routine-message-a-day';
import { THEIR_KEYS_CANNOT_BE_OPENED } from '../whatsapp/an-organisations-own-keys';
import { WHATSAPP_NOT_ON_A_PAID_PLAN } from '../billing/whatsapp-add-on.service';
import { theFirstContactLine, ITS_OWN_WORDS_AT_MOST } from '../whatsapp/the-first-message-to-a-number';

/**
 * THE LEAD'S DAILY NUDGE (decision 120). Read as Wairimu reads it at seven in the morning in Lagos, on her phone and by email.
 *
 * Wairimu leads "Sales team, Q3" (Omar, Bisi, Kofi, Amina and Juma, who is waiting for an admin to let him in) and keeps "Performance plan, Femi" in the app.
 * Today is Monday 12 October 2026. Amina's leave waits for her decision.
 */
const NOW = new Date('2026-10-12T06:00:00Z');
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const person = (userId: string, first: string, extra: any = {}) => ({ userId, email: `${first.toLowerCase()}@x.test`, nameGiven: null, managingOnly: false, leftAt: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, ...extra });
const PEOPLE: Record<string, any> = {
  'p-wairimu': { id: 'p-wairimu', groundId: 'g-sales', ...person('u-wairimu', 'Wairimu') },
  'p-omar': { id: 'p-omar', groundId: 'g-sales', ...person('u-omar', 'Omar') },
  'p-bisi': { id: 'p-bisi', groundId: 'g-sales', ...person('u-bisi', 'Bisi') },
  'p-kofi': { id: 'p-kofi', groundId: 'g-sales', ...person('u-kofi', 'Kofi') },
  'p-amina': { id: 'p-amina', groundId: 'g-sales', ...person('u-amina', 'Amina') },
  'p-juma': { id: 'p-juma', groundId: 'g-sales', ...person('u-juma', 'Juma', { user: { firstName: 'Juma', lastName: null, awaitingOrgApproval: true } }) },
  'p-femi': { id: 'p-femi', groundId: 'g-pip', ...person('u-femi', 'Femi') },
};
const SALES = { id: 'g-sales', label: 'Sales team, Q3', scenario: 'ALIGNMENT', overWhatsApp: null, organizationId: 'org-1', initiatorId: 'u-wairimu', timelineDays: 84, cadence: 'WEEKLY', workingDays: [] };
const PLAN = { id: 'g-pip', label: 'Performance plan, Femi', scenario: 'ALIGNMENT', overWhatsApp: false, organizationId: 'org-1', initiatorId: 'u-wairimu', timelineDays: 30, cadence: 'WEEKLY', workingDays: [] };

let promiseCount = 0;
const promise = (over: any) => ({ id: `pr-${++promiseCount}`, text: 'send the price list', dueDate: day('2026-10-06'), groundId: 'g-sales', authoredBy: 'self', seenBySubject: true, participantId: 'p-omar', participant: { ...PEOPLE['p-omar'], ground: SALES }, ...over });

interface Opts { phone?: string | null; whatsappOn?: boolean; promises?: any[]; waits?: any[]; colleaguesPromises?: any[]; objectives?: any[]; snapshots?: any[]; waiting?: boolean; onLeave?: boolean; stopped?: boolean; quiet?: boolean; quietRows?: any[]; sendResult?: any; held?: boolean; weekend?: boolean; releaseOne?: boolean }

function aMorning(o: Opts = {}) {
  const whats: { org: string; to: string; text: string; context: any }[] = [];
  const mails: any[] = [];
  const promises = o.promises ?? [
    promise({ text: 'send the price list', dueDate: day('2026-10-06') }),
    promise({ text: 'call the Naivas buyer', dueDate: day('2026-10-10'), participantId: 'p-bisi', participant: { ...PEOPLE['p-bisi'], ground: SALES } }),
    promise({ text: 'update the pipeline sheet', dueDate: day('2026-10-11'), participantId: 'p-kofi', participant: { ...PEOPLE['p-kofi'], ground: SALES } }),
    promise({ text: 'write up the Kisumu visit', dueDate: day('2026-10-09'), participantId: 'p-wairimu', participant: { ...PEOPLE['p-wairimu'], ground: SALES } }),
    /* Written by Wairimu for Amina, who was never told: it is not Amina's to be late on. */
    promise({ text: 'close the Mombasa account', dueDate: day('2026-10-01'), authoredBy: 'lead', seenBySubject: false, participantId: 'p-amina', participant: { ...PEOPLE['p-amina'], ground: SALES } }),
    /* In the plan she keeps in the app. */
    promise({ text: 'keep the plan notes', dueDate: day('2026-10-05'), groundId: 'g-pip', participantId: 'p-femi', participant: { ...PEOPLE['p-femi'], ground: PLAN } }),
  ];
  const prisma: any = {
    ground: { findMany: jest.fn(async () => [SALES, PLAN]) },
    /* Release 1's sales board, off unless the case switches it on (release-one-sales-board). */
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]), findUnique: jest.fn(async () => ({ release1SalesBoardOn: !!o.releaseOne })) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: '2026-09-01T00:00:00Z' } })), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', email: 'wairimu@x.test', phoneNumber: o.phone === undefined ? null : o.phone, deletedAt: null, isActive: true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: o.phone === undefined ? '+254711000111' : o.phone, externalId: 'e-wairimu' })), findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => (o.onLeave ? [{ startsOn: day('2026-10-12'), endsOn: day('2026-10-13') }] : [])) },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => (where.userId ? [PEOPLE['p-wairimu']] : Object.values(PEOPLE).filter((p) => where.groundId.in.includes(p.groundId) && p.userId !== 'u-wairimu'))),
    },
    personObjective: { findMany: jest.fn(async () => promises) },
    groundDependency: { findMany: jest.fn(async () => o.waits ?? []) },
    /* The colleagues' own promises: only these confirm a wait on them (decision 137). */
    groundCommitment: { findMany: jest.fn(async () => o.colleaguesPromises ?? []) },
    subject: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async ({ where }: any) => (where.groundId === 'g-sales' ? o.objectives ?? [] : [])) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => o.snapshots ?? []) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => (o.quiet && where.groundId === 'g-sales' ? o.quietRows ?? QUIET_ROWS : [])) },
    notification: { findMany: jest.fn(async () => []) },
  };
  const whatsapp: any = {
    isEnabled: jest.fn(async () => o.whatsappOn !== false),
    hasSaidStop: jest.fn(async () => !!o.stopped),
    sendFor: jest.fn(async (org: string, to: string, text: string, context: any) => { whats.push({ org, to, text, context }); return o.sendResult ?? { sent: true }; }),
  };
  const email: any = { sendTheLeadsDailyNudge: jest.fn(async (...a: any[]) => { mails.push(a); return 'sent'; }) };
  const boards: any = { leave: { board: jest.fn(async () => ({ waiting: o.waiting === false ? [] : [{ id: 'l-1', name: 'Amina Yusuf', startsOn: '2026-10-14', endsOn: '2026-10-16', mayDecide: true }] })) } };
  const run = () => sendTheLeadsDailyNudges({ prisma, whatsapp, email, boards, frontendUrl: 'https://myground.work' }, NOW);
  return { prisma, run, whats, mails };
}

const QUIET_ROWS = ['p-omar', 'p-bisi', 'p-kofi'].map((id) => ({ participantId: id, sessionNumber: 2, status: 'NOT_STARTED', createdAt: day('2026-09-28'), availableFrom: day('2026-09-28'), participant: PEOPLE[id] }));

describe('what Wairimu reads on her phone, outside the 24 hours (the template, one paragraph)', () => {
  /* The link is the board of the check-in the facts are about: the template says "You can open your board for the full picture here" (Drop Access short run, item 11). */
  it('has the approval first, then the overdue, most late first, and the link to the board of the check-in it is about', async () => {
    const m = aMorning();
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toHaveLength(1);
    const { params } = m.whats[0].context;
    expect(m.whats[0].context.kind).toBe('lead-summary');
    expect(params[0]).toBe('Wairimu');
    expect(params[2]).toBe('https://myground.work/grounds/g-sales/board');
    expect(params[1]).toBe(
      'These need you. Amina’s leave from Wednesday 14 October to Friday 16 October is waiting for you to approve or decline. '.replace('’', "'")
      + 'You committed to “write up the Kisumu visit”. That was due by Friday 9 October and is three days late. '
      + 'These are overdue on your team. Omar committed to “send the price list”. That was due by Tuesday 6 October and is six days late. '
      + 'Bisi committed to “call the Naivas buyer”. That was due by Saturday 10 October and is two days late. '
      /* The sentences are longer since 8 October (the due day is its own sentence), so the fourth no longer fits in Meta's limit and the paragraph says there is more. */
      + 'There is more, and the link shows all of it.',
    );
  });

  it('is one paragraph with no line break, in whole sentences, and fits Meta\'s limit with the template\'s own words around it', async () => {
    const m = aMorning();
    await m.run();
    const p = m.whats[0].context.params[1] as string;
    expect(p).not.toMatch(/[\r\n\t]/);
    expect(p).not.toMatch(/ {2,}/);
    const whole = TEMPLATES['lead-summary'].body.replace('{{1}}', 'Wairimu').replace('{{2}}', p).replace('{{3}}', 'https://myground.work/today');
    expect(whole.length).toBeLessThanOrEqual(A_TEMPLATE_BODY_LIMIT);
    for (const s of p.split(/(?<=\.) /)) expect(s).toMatch(/[.]$/);
  });

  it('says nothing about Amina\'s task she was never told of, Juma who is not let in, or the plan she keeps in the app', async () => {
    const m = aMorning();
    await m.run();
    const all = `${m.whats[0].text} ${m.whats[0].context.params.join(' ')}`;
    expect(all).not.toMatch(/Mombasa|Juma|plan notes|Femi|Performance plan/);
  });

  it('leaves out whole sentences that do not fit, never cuts one in the middle, and says there is more', () => {
    const many = (n: number): WhatIsOutstanding => ({
      needsYou: [],
      overdueOnYourTeam: Array.from({ length: n }, (_x, i) => ({ text: `Person${i} committed to “${'do a very long piece of work '.repeat(6).trim()}”. That was due by Tuesday 6 October and is ${i + 1} days late.`, late: n - i })),
      risks: Array.from({ length: n }, (_x, i) => ({ text: `The target “${'a long target name '.repeat(8).trim()} ${i}” is behind.` })),
    });
    const { params, text } = theTemplateParagraph('Wairimu', many(6), 'https://myground.work/today');
    expect(text.length).toBeLessThanOrEqual(A_TEMPLATE_BODY_LIMIT);
    expect(params[1]).not.toMatch(/…/);
    expect(params[1]).toMatch(/There is more, and the link shows all of it\.$/);
    expect(params[1]).not.toMatch(/[\r\n]/);
  });
});

describe('what Wairimu reads on her phone, inside the 24 hours (an ordinary message with lines)', () => {
  it('has each part on its own with each line on its own line, at most three lines each, and the link', async () => {
    const m = aMorning();
    await m.run();
    expect(m.whats[0].text).toBe(
      'Good morning Wairimu. Here is what is outstanding today.\n\n'
      + 'Needs you\n'
      + "Amina's leave from Wednesday 14 October to Friday 16 October is waiting for you to approve or decline.\n"
      + 'You committed to “write up the Kisumu visit”. That was due by Friday 9 October and is three days late.\n\n'
      + 'Overdue on your team\n'
      + 'Omar committed to “send the price list”. That was due by Tuesday 6 October and is six days late.\n'
      + 'Bisi committed to “call the Naivas buyer”. That was due by Saturday 10 October and is two days late.\n'
      + 'Kofi committed to “update the pipeline sheet”. That was due by Sunday 11 October and is one day late.\n\n'
      + 'You can see everything here https://myground.work/today',
    );
  });

  it('when there are more than three, the third line says how many are not listed', () => {
    const lines = atMostThreeLines([1, 2, 3, 4, 5].map((i) => ({ text: `Line ${i}.` })));
    expect(lines).toEqual(['Line 1.', 'Line 2.', 'Three more are not listed here.']);
    expect(atMostThreeLines([{ text: 'Only one' }])).toEqual(['Only one.']);
  });
});

describe('who gets it, and how', () => {
  it('a lead with no number gets it by email, with the same facts, and the subject says how many', async () => {
    const m = aMorning({ phone: null });
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toEqual([]);
    const [to, subject, parts, first, label, link] = m.mails[0];
    expect(to).toBe('wairimu@x.test');
    expect(subject).toBe('Two things need you and four are overdue on your team');
    expect(first).toBe('Wairimu');
    expect([label, link]).toEqual(['See everything', 'https://myground.work/today']);
    expect(parts.needsYou).toHaveLength(2);
    expect(parts.overdueOnYourTeam).toHaveLength(3);
    expect(parts.risks).toEqual([]);
  });

  it('the check-in is named on a line only when she is told about more than one: by email she is (the plan is in the app), on her phone she is not', async () => {
    const byEmail = aMorning({ phone: null });
    await byEmail.run();
    expect(byEmail.mails[0][2].needsYou[1]).toBe('In \u201cSales team, Q3\u201d, you committed to \u201cwrite up the Kisumu visit\u201d. That was due by Friday 9 October and is three days late.');
    const onPhone = aMorning();
    await onPhone.run();
    expect(onPhone.whats[0].text).not.toContain('In \u201cSales team, Q3\u201d, you');
  });

  it('a lead whose organisation never turned WhatsApp on gets it by email', async () => {
    const m = aMorning({ whatsappOn: false });
    await m.run();
    expect(m.whats).toEqual([]);
    expect(m.mails).toHaveLength(1);
  });

  it('a lead who replied STOP is not written to on WhatsApp, and gets the email', async () => {
    const m = aMorning({ stopped: true });
    await m.run();
    expect(m.whats).toEqual([]);
    expect(m.mails).toHaveLength(1);
  });

  it('when the phone cannot be used outside the 24 hours (no approved template), she is owed it by email, once', async () => {
    const m = aMorning({ sendResult: { sent: false, error: OUTSIDE_THE_WINDOW } });
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toHaveLength(1);
    expect(m.mails).toHaveLength(1);
  });

  /* The day's own limits, as the WhatsApp sender words them (whatsapp.service.ts howOftenToday and mayInitiate). The string this
     case used before was a shortened copy of the email's own wording, which the WhatsApp sender never returns. */
  it.each([
    ['the day\'s one message has already gone', NOT_TODAY],
    ['she replied "Not now" today', THEY_SAID_NOT_NOW],
    ['her organisation has not turned WhatsApp on', NOT_TURNED_ON_QUIETLY],
    ['she has had her one routine message today', THEY_HAD_ONE_TODAY],
  ])('when %s, nothing more is sent by any door', async (_why, error) => {
    const m = aMorning({ sendResult: { sent: false, error } });
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toHaveLength(1);
    expect(m.mails).toEqual([]);
  });

  /* Drop Access, October: a refusal by Meta itself, or WhatsApp not working on this server, sent the lead nothing at all. */
  it.each([
    ['Meta refuses it', '{"error":{"message":"(#131026) Message undeliverable","type":"OAuthException","code":131026}}'],
    ['WhatsApp is not configured on this server', 'WhatsApp is not configured on this deployment'],
    ['the organisation\'s keys cannot be opened', THEIR_KEYS_CANNOT_BE_OPENED],
    ['the WhatsApp add-on is held', WHATSAPP_NOT_ON_A_PAID_PLAN],
    ['the template could not be sent', 'template send failed'],
    ['no reason is given', undefined],
  ])('when %s, she is owed it by email, once, with the same facts', async (_why, error) => {
    const m = aMorning({ sendResult: { sent: false, ...(error === undefined ? {} : { error }) } });
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toHaveLength(1);
    expect(m.mails).toHaveLength(1);
    const [to, subject, parts, first, label, link] = m.mails[0];
    expect(to).toBe('wairimu@x.test');
    expect(subject).toBe('Two things need you and four are overdue on your team');
    expect(first).toBe('Wairimu');
    expect([label, link]).toEqual(['See everything', 'https://myground.work/today']);
    expect(parts.needsYou).toHaveLength(2);
  });

  it('nothing outstanding, nothing sent', async () => {
    const m = aMorning({ promises: [], waiting: false });
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.whats).toEqual([]);
    expect(m.mails).toEqual([]);
  });

  it('nothing on a day she is on approved leave', async () => {
    const m = aMorning({ onLeave: true });
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.whats).toEqual([]);
  });

  it('only what is kept in the app is outstanding: nothing goes to her phone, and the email says it', async () => {
    const onlyThePlan = [promise({ text: 'keep the plan notes', dueDate: day('2026-10-05'), groundId: 'g-pip', participantId: 'p-wairimu', participant: { ...PEOPLE['p-wairimu'], ground: PLAN } })];
    const m = aMorning({ promises: onlyThePlan, waiting: false });
    await m.run();
    expect(m.whats).toEqual([]);
    expect(m.mails).toHaveLength(1);
    expect(m.mails[0][2].needsYou[0]).toContain('plan notes');
  });
});

describe('the risks', () => {
  it('a target that is behind, a wait that has gone on a fortnight, and people who have gone quiet', async () => {
    const m = aMorning({
      promises: [], waiting: false, quiet: true, phone: null,
      objectives: [{ id: 'o-1', name: '25 shops signed', target: 25, count: 4, direction: 'AIM', dueOn: day('2026-11-30') }],
      snapshots: [{ objectiveId: 'o-1', sessionNumber: 1, count: 2 }, { objectiveId: 'o-1', sessionNumber: 2, count: 3 }, { objectiveId: 'o-1', sessionNumber: 3, count: 4 }],
      waits: [{ id: 'w-1', groundId: 'g-sales', what: 'the price list', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-09-21'), dueOn: null, blockerKind: null, fromParticipantId: 'p-bisi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-bisi'], onParticipant: PEOPLE['p-omar'] }],
    });
    await m.run();
    const risks: string[] = m.mails[0][2].risks;
    expect(risks[0]).toMatch(/^The target “25 shops signed” in “Sales team, Q3” is behind\. /);
    expect(risks).toContain('Bisi says the work has been waiting on Omar for the price list since Monday 21 September. Not backed: no attempt to unblock mentioned. Bisi could have messaged Omar, asked again, or raised it with you.');
    expect(risks).toContain('All three people in “Sales team, Q3” have not answered a check-in for more than a week.');
    expect(m.mails[0][1]).toBe('One risk is open'.replace('One risk is open', 'Three risks are open'));
  });

  it('a decision somebody is waiting for her to make is hers, and is said with the day it began', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null,
      waits: [{ id: 'w-2', groundId: 'g-sales', what: 'the pricing for Q4', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-08'), dueOn: null, blockerKind: 'DECISION', fromParticipantId: 'p-kofi', onParticipantId: 'p-wairimu', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-wairimu'] }],
    });
    await m.run();
    expect(m.mails[0][2].needsYou).toEqual(['Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.']);
  });

  it('an answer somebody is waiting on her for, with no day and no kind, needs her too (Drop Access, 16 October), with Release 1\'s switch on', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null, releaseOne: true,
      waits: [{ id: 'w-9', groundId: 'g-sales', what: 'an answer about the KES 4,500 price for Juja Hardware', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-08'), dueOn: null, blockerKind: null, fromParticipantId: 'p-kofi', onParticipantId: 'p-wairimu', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-wairimu'] }],
    });
    await m.run();
    expect(m.mails[0][2].needsYou).toEqual(['Kofi is waiting on you for an answer about the KES 4,500 price for Juja Hardware since Thursday 8 October.']);
  });

  it('a wait with a day that has passed is overdue on the team, in the one who owes it, once they said it is theirs', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null,
      colleaguesPromises: [{ groundId: 'g-sales', participantId: 'p-omar', text: 'I will finish the stock count this week.' }],
      waits: [{ id: 'w-3', groundId: 'g-sales', what: 'the stock count', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-01'), dueOn: day('2026-10-09'), blockerKind: null, fromParticipantId: 'p-kofi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-omar'] }],
    });
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam).toEqual(['Kofi is waiting on Omar for the stock count, which was due on Friday 9 October and is three days late.']);
  });

  /*
   * PROFILE 5 (decision 137; decision 139, must-fix 4). Wairimu's morning message said Juma's shops were "ten days late" on Kevin's word; Juma
   * had sent them, and had never promised them. One person's word is not a late mark on a colleague.
   */
  it('a wait only the one waiting claims is never marked late against the colleague', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null,
      colleaguesPromises: [{ groundId: 'g-sales', participantId: 'p-omar', text: 'I will call the Naivas buyer.' }],
      waits: [{ id: 'w-3', groundId: 'g-sales', what: 'the stock count', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-01'), dueOn: day('2026-10-09'), blockerKind: null, fromParticipantId: 'p-kofi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-omar'] }],
    });
    await m.run();
    const all = JSON.stringify(m.mails[0]?.[2] ?? {});
    expect(m.mails[0][2].overdueOnYourTeam).toEqual([]);
    expect(m.mails[0][2].risks).toEqual(['Kofi says the work is waiting on Omar for the stock count. Not backed: no attempt to unblock mentioned. Kofi could have messaged Omar, asked again, or raised it with you.']);
    expect(all).not.toMatch(/days late|due on/);
  });

  it('and where Kofi said what he tried, it is a confirmed block and reads as any wait does', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null,
      waits: [{ id: 'w-3', groundId: 'g-sales', what: 'the stock count', triedSaid: 'I nudged Omar on Tuesday.', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-01'), dueOn: day('2026-10-09'), blockerKind: null, fromParticipantId: 'p-kofi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-omar'] }],
    });
    await m.run();
    /* Hafsah, 12 October: with his attempt in the record it is a confirmed block, so it reads as any wait does, late and all. */
    expect(m.mails[0][2].risks).toEqual([]);
    expect(m.mails[0][2].overdueOnYourTeam).toEqual(['Kofi is waiting on Omar for the stock count, which was due on Friday 9 October and is three days late.']);
  });
});

describe('in "Needs you", what waits for her to approve comes first, then a decision she owes, then her own late commitments', () => {
  it('whatever the days', async () => {
    const m = aMorning({
      phone: null,
      waits: [{ id: 'w-2', groundId: 'g-sales', what: 'the pricing for Q4', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-11'), dueOn: null, blockerKind: 'DECISION', fromParticipantId: 'p-kofi', onParticipantId: 'p-wairimu', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-wairimu'] }],
    });
    await m.run();
    const needs: string[] = m.mails[0][2].needsYou;
    expect(needs[0]).toMatch(/waiting for you to approve or decline\.$/);
    expect(needs[1]).toMatch(/^Kofi is waiting on you for the pricing for Q4/);
    expect(needs[2]).toMatch(/^(In “[^”]*”, you|You) committed to/);
  });
});

describe('a commitment stored in the person\'s own first-person words is said as theirs', () => {
  it('wherever the "I" is in it, and a person nobody has a name for is not told', async () => {
    const m = aMorning({
      phone: null, waiting: false,
      promises: [
        promise({ text: 'If I don\'t hear back by Friday, I will re-escalate to the Head of Credit', dueDate: day('2026-10-06') }),
        promise({ text: 'chase it on Monday', dueDate: day('2026-10-06'), participantId: 'p-bisi', participant: { ...PEOPLE['p-bisi'], nameGiven: null, user: { firstName: null, lastName: null, awaitingOrgApproval: false }, ground: SALES } }),
      ],
    });
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam).toEqual(['Omar said \u201cIf I don\'t hear back by Friday, I will re-escalate to the Head of Credit\u201d. That was due by Tuesday 6 October and is six days late.']);
  });

  it('"said" for "I will chase legal on Monday", "committed to" for "send the supplier list"', async () => {
    const m = aMorning({
      phone: null, waiting: false,
      promises: [
        promise({ text: 'I will chase legal on Monday', dueDate: day('2026-10-06') }),
        promise({ text: 'Next I will pick up the export bug', dueDate: day('2026-10-07'), participantId: 'p-bisi', participant: { ...PEOPLE['p-bisi'], ground: SALES } }),
        promise({ text: 'send the supplier list', dueDate: day('2026-10-08'), participantId: 'p-kofi', participant: { ...PEOPLE['p-kofi'], ground: SALES } }),
      ],
    });
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam).toEqual([
      'Omar said \u201cI will chase legal on Monday\u201d. That was due by Tuesday 6 October and is six days late.',
      'Bisi said \u201cNext I will pick up the export bug\u201d. That was due by Wednesday 7 October and is five days late.',
      'Kofi committed to \u201csend the supplier list\u201d. That was due by Thursday 8 October and is four days late.',
    ]);
  });
});

describe('who has gone quiet counts everyone who can answer (8 October 2026)', () => {
  const row = (id: string, sessionNumber: number, status: string, opened: string) => ({ participantId: id, sessionNumber, status, createdAt: day(opened), availableFrom: day(opened), participant: PEOPLE[id] ?? { ...person(`u-${id}`, id) } });
  /* Six people can answer. Omar is on the newest session, which he has not answered. Bisi, Kofi and Amina are still on earlier sessions and have said nothing for more than a week. Two have answered everything. */
  const SIX = [
    row('p-omar', 1, 'COMPLETED', '2026-09-14'), row('p-omar', 2, 'NOT_STARTED', '2026-09-28'),
    row('p-bisi', 1, 'NOT_STARTED', '2026-09-14'),
    row('p-kofi', 1, 'COMPLETED', '2026-09-14'), row('p-kofi', 2, 'NOT_STARTED', '2026-09-21'),
    row('p-amina', 1, 'NOT_STARTED', '2026-09-14'),
    row('p-tunde', 1, 'COMPLETED', '2026-09-14'), row('p-tunde', 2, 'COMPLETED', '2026-09-28'),
    row('p-ada', 1, 'COMPLETED', '2026-09-14'), row('p-ada', 2, 'COMPLETED', '2026-09-28'),
  ];
  it('says four of the six, and not "the one person who can answer"', async () => {
    const m = aMorning({ promises: [], waiting: false, quiet: true, phone: null, quietRows: SIX });
    await m.run();
    expect(m.mails[0][2].risks).toEqual(['Four of the six people in \u201cSales team, Q3\u201d have not answered a check-in for more than a week.']);
  });
  it('a person who has answered everything they were given is not counted as quiet', async () => {
    const m = aMorning({ promises: [], waiting: false, quiet: true, phone: null, quietRows: SIX.filter((r) => ['p-tunde', 'p-ada'].includes(r.participantId)) });
    await m.run();
    expect(m.mails).toEqual([]);
  });
});

describe('a late commitment names its check-in first, then says what was due (8 October 2026)', () => {
  it('"In \u201cRenewal push\u201d, Pia said ... That was due by Saturday 11 July and is 93 days late."', async () => {
    const RENEWAL = { ...SALES, id: 'g-renewal', label: 'Renewal push' };
    const PIA = { id: 'p-pia', groundId: 'g-renewal', ...person('u-pia', 'Pia') };
    const m = aMorning({
      phone: null, waiting: false,
      promises: [
        promise({ text: 'I will chase legal on Monday', dueDate: day('2026-07-11'), groundId: 'g-renewal', participantId: 'p-pia', participant: { ...PIA, ground: RENEWAL } }),
        promise({ text: 'send the price list', dueDate: day('2026-10-06') }),
      ],
    });
    m.prisma.ground.findMany = jest.fn(async () => [SALES, RENEWAL]);
    const was = m.prisma.groundParticipant.findMany;
    m.prisma.groundParticipant.findMany = jest.fn(async (a: any) => (a.where.userId ? [PEOPLE['p-wairimu']] : [...(await was(a)), ...(a.where.groundId.in.includes('g-renewal') ? [PIA] : [])]));
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam[0]).toBe('In \u201cRenewal push\u201d, Pia said \u201cI will chase legal on Monday\u201d. That was due by Saturday 11 July and is 93 days late.');
  });
});

describe('a check-in about one person\'s performance, promotion or renewal is never in it', () => {
  it('a late commitment in a performance plan is not told to the lead, by email or on her phone', async () => {
    const m = aMorning({ phone: null, waiting: false, promises: [promise({ text: 'keep the plan notes', dueDate: day('2026-10-05'), groundId: 'g-pip', participantId: 'p-femi', participant: { ...PEOPLE['p-femi'], ground: { ...PLAN, scenario: 'PIP' } } })] });
    m.prisma.ground.findMany = jest.fn(async () => [SALES, { ...PLAN, scenario: 'PIP' }]);
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.mails).toEqual([]);
    expect(m.whats).toEqual([]);
  });
});

describe('a wait is told only when it reads as a sentence', () => {
  const wait = (over: any) => ({ id: 'w-x', groundId: 'g-sales', what: 'the price list', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-09-21'), dueOn: null, blockerKind: null, fromParticipantId: 'p-bisi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-bisi'], onParticipant: PEOPLE['p-omar'], ...over });
  it.each([
    ['in the first person ("is mine")', { what: 'in writing whether the 30 September close is mine or Chidinma\'s' }],
    ['as "her" or "his"', { what: 'her login for the order system' }],
    ['with the holder said again ("funding for funding")', { what: 'funding for the solar', onParticipantId: null, onParticipant: null, onLabel: 'funding' }],
    ['with nobody who holds it', { onParticipantId: null, onParticipant: null, onLabel: null }],
    ['when the person did not name the thing', { namedTheThing: false, what: 'how this connects to anything' }],
    ['as a clause and not a thing ("how it ties to the target")', { what: 'how it ties to the group target' }],
    ['when the one waiting has no name anybody knows ("Someone")', { fromParticipant: { ...PEOPLE['p-bisi'], nameGiven: null, user: { firstName: null, lastName: null, awaitingOrgApproval: false } } }],
  ])('not %s', async (_why, over) => {
    const m = aMorning({ phone: null, promises: [], waiting: false, waits: [wait(over)] });
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.mails).toEqual([]);
  });
  it('but one that is whole is', async () => {
    const m = aMorning({ phone: null, promises: [], waiting: false, waits: [wait({})] });
    await m.run();
    expect(m.mails[0][2].risks).toEqual(['Bisi says the work has been waiting on Omar for the price list since Monday 21 September. Not backed: no attempt to unblock mentioned. Bisi could have messaged Omar, asked again, or raised it with you.']);
  });

  /* Drop Access run 1, item 18, behind Release 1's switch: a message no longer carries "Not backed: ... could have messaged ..." (clipped,
     judging, and untrue in the run); it says what was tried, in full with its day, or nothing. */
  it('with Release 1\'s switch on, the same wait carries no "Not backed:" note', async () => {
    const m = aMorning({ phone: null, promises: [], waiting: false, waits: [wait({})], releaseOne: true });
    await m.run();
    expect(m.mails[0][2].risks).toEqual(['Bisi says the work has been waiting on Omar for the price list since Monday 21 September.']);
  });
});

describe('facts about one thing, never a comparison and never a label', () => {
  it('names nobody as better or worse, and puts no word on a person', async () => {
    const m = aMorning({ phone: null });
    await m.run();
    const all = JSON.stringify(m.mails[0][2]) + m.mails[0][1];
    expect(all).not.toMatch(/\b(ahead|behind of|worst|best|slowest|fastest|at risk|exit|PIP|score|rank|compared)\b/i);
    expect(all).not.toMatch(/@/);
  });
});

describe('the page the link goes to shows everything, in the same sentences', () => {
  it('every one of them and not three, including what she keeps in the app, with the check-in named because there are two', async () => {
    const m = aMorning({ phone: null });
    const boards: any = { leave: { board: async () => ({ waiting: [] }) } };
    const all = await everythingOutstandingFor(m.prisma, { userId: 'u-wairimu', organizationId: 'org-1' }, { boards }, NOW);
    expect(all?.needsYou).toEqual(['In \u201cSales team, Q3\u201d, you committed to \u201cwrite up the Kisumu visit\u201d. That was due by Friday 9 October and is three days late.']);
    expect(all?.overdueOnYourTeam).toHaveLength(4);
    expect(all?.overdueOnYourTeam.join(' ')).toContain('keep the plan notes');
    expect(JSON.stringify(all)).not.toMatch(/more are not listed here|Mombasa|Juma/);
    /* And the nudge's email says the same things in fewer lines. */
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam[0]).toBe(all?.overdueOnYourTeam[0]);
  });
  it('says what each sentence is about, in the same order, so Today can match it to its own row by the thing and not by the words (request 205)', async () => {
    const m = aMorning({ phone: null });
    const boards: any = { leave: { board: async () => ({ waiting: [] }) } };
    const all: any = await everythingOutstandingFor(m.prisma, { userId: 'u-wairimu', organizationId: 'org-1' }, { boards }, NOW);
    expect(all.about.needsYou).toHaveLength(all.needsYou.length);
    expect(all.about.overdueOnYourTeam).toHaveLength(all.overdueOnYourTeam.length);
    expect(all.about.risks).toHaveLength(all.risks.length);
    expect(all.about.needsYou[0]).toMatchObject({ kind: 'promise', ids: [expect.stringMatching(/^pr-/)], groundId: 'g-sales' });
    expect(all.about.overdueOnYourTeam.every((a: any) => a.kind === 'promise' && a.ids.length === 1)).toBe(true);
  });
  it('says nothing, rather than an empty page, when nothing is outstanding', async () => {
    const m = aMorning({ promises: [], waiting: false });
    expect(await everythingOutstandingFor(m.prisma, { userId: 'u-wairimu', organizationId: 'org-1' }, { boards: {} as any }, NOW)).toBeNull();
  });
  it('is served at GET /today/outstanding, on the reader\'s own sign-in', () => {
    expect(Reflect.getMetadata('path', TodayController.prototype.outstanding)).toBe('outstanding');
    expect(Reflect.getMetadata('path', TodayController)).toBe('today');
  });
});

describe('the subject', () => {
  it('counts each part as a plain fact', () => {
    const o: WhatIsOutstanding = { needsYou: [{ text: 'a' }], overdueOnYourTeam: [{ text: 'b' }, { text: 'c' }], risks: [{ text: 'd' }] };
    expect(theNudgeSubject(o)).toBe('One thing needs you, two are overdue on your team and one risk is open');
    expect(theNudgeParts(o).risks).toEqual(['d.']);
    expect(theWindowForm(null, o, 'https://x.test/today')).toMatch(/^Good morning there\./);
  });
});
