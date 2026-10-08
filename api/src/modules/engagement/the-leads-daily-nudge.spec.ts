import { sendTheLeadsDailyNudges, theWindowForm, theTemplateParagraph, theNudgeParts, theNudgeSubject, atMostThreeLines, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { TEMPLATES, A_TEMPLATE_BODY_LIMIT, OUTSIDE_THE_WINDOW } from '../whatsapp/a-message-outside-the-window';
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

const promise = (over: any) => ({ text: 'send the price list', dueDate: day('2026-10-06'), groundId: 'g-sales', authoredBy: 'self', seenBySubject: true, participantId: 'p-omar', participant: { ...PEOPLE['p-omar'], ground: SALES }, ...over });

interface Opts { phone?: string | null; whatsappOn?: boolean; promises?: any[]; waits?: any[]; objectives?: any[]; snapshots?: any[]; waiting?: boolean; onLeave?: boolean; stopped?: boolean; quiet?: boolean; sendResult?: any; held?: boolean; weekend?: boolean }

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
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: '2026-09-01T00:00:00Z' } })), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', email: 'wairimu@x.test', phoneNumber: o.phone === undefined ? null : o.phone, deletedAt: null, isActive: true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: o.phone === undefined ? '+254711000111' : o.phone, externalId: 'e-wairimu' })), findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => (o.onLeave ? [{ startsOn: day('2026-10-12'), endsOn: day('2026-10-13') }] : [])) },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => (where.userId ? [PEOPLE['p-wairimu']] : Object.values(PEOPLE).filter((p) => where.groundId.in.includes(p.groundId) && p.userId !== 'u-wairimu'))),
    },
    personObjective: { findMany: jest.fn(async () => promises) },
    groundDependency: { findMany: jest.fn(async () => o.waits ?? []) },
    subject: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async ({ where }: any) => (where.groundId === 'g-sales' ? o.objectives ?? [] : [])) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => o.snapshots ?? []) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => (o.quiet && where.groundId === 'g-sales' ? QUIET_ROWS : [])) },
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
  it('has the approval first, then the overdue, most late first, and the link to Today', async () => {
    const m = aMorning();
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.whats).toHaveLength(1);
    const { params } = m.whats[0].context;
    expect(m.whats[0].context.kind).toBe('lead-summary');
    expect(params[0]).toBe('Wairimu');
    expect(params[2]).toBe('https://myground.work/today');
    expect(params[1]).toBe(
      'These need you. Amina’s leave from Wednesday 14 October to Friday 16 October is waiting for you to approve or decline. '.replace('’', "'")
      + 'You committed to “write up the Kisumu visit” by Friday 9 October, and it is three days late. '
      + 'These are overdue on your team. Omar committed to “send the price list” by Tuesday 6 October, and it is six days late. '
      + 'Bisi committed to “call the Naivas buyer” by Saturday 10 October, and it is two days late. '
      + 'Kofi committed to “update the pipeline sheet” by Sunday 11 October, and it is one day late.',
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
      overdueOnYourTeam: Array.from({ length: n }, (_x, i) => ({ text: `Person${i} committed to “${'do a very long piece of work '.repeat(6).trim()}” by Tuesday 6 October, and it is ${i + 1} days late.`, late: n - i })),
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
      + 'You committed to “write up the Kisumu visit” by Friday 9 October, and it is three days late.\n\n'
      + 'Overdue on your team\n'
      + 'Omar committed to “send the price list” by Tuesday 6 October, and it is six days late.\n'
      + 'Bisi committed to “call the Naivas buyer” by Saturday 10 October, and it is two days late.\n'
      + 'Kofi committed to “update the pipeline sheet” by Sunday 11 October, and it is one day late.\n\n'
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
    expect(byEmail.mails[0][2].needsYou[1]).toBe('You committed to \u201cwrite up the Kisumu visit\u201d in \u201cSales team, Q3\u201d by Friday 9 October, and it is three days late.');
    const onPhone = aMorning();
    await onPhone.run();
    expect(onPhone.whats[0].text).not.toContain('in \u201cSales team, Q3\u201d by');
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

  it('when the day\'s one message has already gone, nothing more is sent by any door', async () => {
    const m = aMorning({ sendResult: { sent: false, error: 'They have already been sent one routine message today, by email or on WhatsApp.' } });
    await m.run();
    expect(m.mails).toEqual([]);
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
    expect(risks).toContain('Bisi has been waiting on Omar for the price list since Monday 21 September.');
    expect(risks).toContain('Three of the three people in “Sales team, Q3” have not answered the latest check-in for more than a week.');
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

  it('a wait with a day that has passed is overdue on the team, in the one who owes it', async () => {
    const m = aMorning({
      promises: [], waiting: false, phone: null,
      waits: [{ id: 'w-3', groundId: 'g-sales', what: 'the stock count', namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day('2026-10-01'), dueOn: day('2026-10-09'), blockerKind: null, fromParticipantId: 'p-kofi', onParticipantId: 'p-omar', fromParticipant: PEOPLE['p-kofi'], onParticipant: PEOPLE['p-omar'] }],
    });
    await m.run();
    expect(m.mails[0][2].overdueOnYourTeam).toEqual(['Kofi is waiting on Omar for the stock count, which was due on Friday 9 October and is three days late.']);
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

describe('the subject', () => {
  it('counts each part as a plain fact', () => {
    const o: WhatIsOutstanding = { needsYou: [{ text: 'a' }], overdueOnYourTeam: [{ text: 'b' }, { text: 'c' }], risks: [{ text: 'd' }] };
    expect(theNudgeSubject(o)).toBe('One thing needs you, two are overdue on your team and one risk is open');
    expect(theNudgeParts(o).risks).toEqual(['d.']);
    expect(theWindowForm(null, o, 'https://x.test/today')).toMatch(/^Good morning there\./);
  });
});
