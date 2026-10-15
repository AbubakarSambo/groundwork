import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ORG, TODAY, aTimeSheetsOrganisation, type ARecordForSpecs } from './a-time-sheets-organisation-for-specs';
import { DRAFT_NOTHING_FOUND, DRAFT_NOT_SENT } from './a-week-drafted-from-the-record';

/**
 * A WEEK OF HOURS DRAFTED FROM THE RECORD, AS EACH PERSON READS IT (decision 85, item 3; build step 11).
 *
 * Wednesday 7 October 2026 at 10:00 in Lagos. The rules ask 40 hours a week. Brian, in Sales, has given
 * no hours this week. His own record shows, on Monday, his check-in "Naivas Ngong Road install" and the
 * commitment he kept, "Send Lakeside the service report"; on Tuesday, his check-in "Sales team" (which
 * names no client) and the work he owns, "Naivas freezer 3 wiring"; on Wednesday, "Lakeside maintenance
 * plan", which he owns. Aisha's own check-in on Monday is on the record too, and never reaches Brian.
 *
 * Groundwork drafts Brian's week from it, says what it found and where the hours came from, and only
 * Brian's yes sends it to Wairimu. He changes a line first. Nothing is kept before the yes, and the
 * draft feeds nothing about Brian (decision 10).
 */
const at = (s: string) => new Date(s);
const RECORD: ARecordForSpecs = {
  sessions: [
    { userId: 'u-brian', label: 'Naivas Ngong Road install', startedAt: at('2026-10-05T13:00:00Z'), completedAt: at('2026-10-05T14:00:00Z') },
    { userId: 'u-brian', label: 'Sales team', startedAt: at('2026-10-06T09:00:00Z'), completedAt: at('2026-10-06T09:30:00Z') },
    { userId: 'u-brian', label: 'Last week', startedAt: at('2026-09-30T09:00:00Z'), completedAt: at('2026-09-30T09:30:00Z') },
    { userId: 'u-aisha', label: 'Naivas Westlands', startedAt: at('2026-10-05T10:00:00Z'), completedAt: at('2026-10-05T11:00:00Z') },
  ],
  commitments: [
    { personExternalId: 'p-brian', text: 'Send Lakeside the service report', state: 'KEPT', resolvedAt: at('2026-10-05T16:00:00Z') },
    { personExternalId: 'p-brian', text: 'Call Naivas about the invoice', state: 'OPEN', resolvedAt: null },
  ],
  subjects: [{ externalId: 's-1', title: 'Lakeside maintenance plan', ownerExternalId: 'p-brian', updatedAt: at('2026-10-07T07:00:00Z') }],
  workItems: [{ ownerUserId: 'u-brian', name: 'Naivas freezer 3 wiring', updatedAt: at('2026-10-06T12:00:00Z'), label: 'Installs' }],
};
const RULES = { hoursAWeek: 40 };
const FAKE = { doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] as any };
beforeEach(() => jest.useFakeTimers({ now: TODAY, ...FAKE }));
afterEach(() => jest.useRealTimers());

const THE_DRAFT = [
  'I have enough to draft this week\'s hours. Here is what I found.',
  'On Monday 5 October, the record shows your check-in "Naivas Ngong Road install" and the commitment you kept, "Send Lakeside the service report".',
  'On Tuesday 6 October, the record shows your check-in "Sales team" and the work you own, "Naivas freezer 3 wiring".',
  'On Wednesday 7 October, the record shows "Lakeside maintenance plan", which you own.',
  'This is the draft.',
  'I put 4 hours on Naivas and 4 hours on Lakeside for Monday 5 October.',
  'I put 8 hours on Naivas for Tuesday 6 October.',
  'I put 8 hours on Lakeside for Wednesday 7 October.',
  'I gave each day 8 hours, from the 40 hours a week your organisation asks for, shared equally between the clients and projects the record shows that day. The record does not say how long anything took, so please check each line.',
  'I could not tell which client or project your check-in "Sales team" on Tuesday 6 October was for, so it is not in the draft.',
  'Change anything that is wrong before you send it. You can tell me, for example "6 hours on Naivas on Monday", or "remove Naivas on Monday".',
  'Shall I log these hours and send them to Wairimu to approve?',
].join('\n');

/* Review of 1d9ef0a5: an idea, or an offer waiting for a yes, is kept as a work item, and is not work Brian owns. */
describe('an idea is never drafted as work', () => {
  it('Brian\'s captured idea and a waiting request offer are not in his week', async () => {
    const withAnIdea = { ...RECORD, workItems: [
      ...(RECORD.workItems ?? []),
      { ownerUserId: 'u-brian', name: 'send the price list to every shop on Monday', updatedAt: at('2026-10-06T12:00:00Z'), label: 'Installs', kind: 'idea' },
      { ownerUserId: 'u-brian', name: 'leave', updatedAt: at('2026-10-06T12:00:00Z'), label: 'Installs', kind: 'request-offered' },
    ] };
    const o = aTimeSheetsOrganisation({ rules: RULES, record: withAnIdea });
    const said = await o.says('u-brian', 'Can you draft my hours for this week?');
    expect(said).toBe(THE_DRAFT);
    expect(said).not.toMatch(/price list|"leave"/);
  });
});

describe('Brian asks Groundwork to draft his week', () => {
  it('reads what was found, the draft, where its hours came from, and the question, and nothing is kept yet', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    expect(await o.says('u-brian', 'Can you draft my hours for this week?')).toBe(THE_DRAFT);
    expect(o.prisma.timeEntry.createMany).not.toHaveBeenCalled();
    expect(o.events).toEqual([]);
    expect(o.proposals).toHaveLength(1);
  });

  it('only his own record is read, never Aisha’s', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    const said = await o.says('u-brian', 'draft my time sheet');
    expect(said).not.toMatch(/Westlands/);
    expect(o.prisma.checkIn.findMany.mock.calls[0][0].where.participant).toEqual({ userId: 'u-brian' });
    expect(o.prisma.commitment.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: ORG, personExternalId: 'p-brian', state: 'KEPT' });
  });

  it('changes a line and takes one out, each said back with the whole draft, then his yes sends it to Wairimu', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    await o.says('u-brian', 'draft my hours');
    expect(await o.says('u-brian', '6 hours on Naivas on Monday')).toBe([
      'I have changed the draft. This is it now.',
      'I put 4 hours on Lakeside and 6 hours on Naivas for Monday 5 October.',
      'I put 8 hours on Naivas for Tuesday 6 October.',
      'I put 8 hours on Lakeside for Wednesday 7 October.',
      'Shall I log these hours and send them to Wairimu to approve?',
    ].join('\n'));
    expect(await o.says('u-brian', 'remove Lakeside on Wednesday')).toBe([
      'I have changed the draft. This is it now.',
      'I put 4 hours on Lakeside and 6 hours on Naivas for Monday 5 October.',
      'I put 8 hours on Naivas for Tuesday 6 October.',
      'Shall I log these hours and send them to Wairimu to approve?',
    ].join('\n'));
    expect(o.prisma.timeEntry.createMany).not.toHaveBeenCalled();
    expect(await o.says('u-brian', 'yes')).toBe('I have logged 18 hours for this week and sent them to Wairimu to approve. They are not approved until Wairimu decides, and you will see them under your hours.');
    expect(o.prisma.timeEntry.createMany.mock.calls[0][0].data.map((e: any) => [e.client, e.onDay.toISOString().slice(0, 10), e.minutes / 60])).toEqual([
      ['Lakeside', '2026-10-05', 4], ['Naivas', '2026-10-05', 6], ['Naivas', '2026-10-06', 8],
    ]);
    /* Wairimu reads Brian's week on her board as any other hours, waiting for her. */
    const b = await o.svc.board(o.as('u-wairimu'), TODAY);
    expect(b.weeks.find((w: any) => w.weekOf === '2026-10-05')!.people.find((p: any) => p.name === 'Brian Mwangi')).toMatchObject({ total: 18 * 60, mayApprove: true, where: 'They are waiting for you.' });
  });

  it('a line he says that cannot be read is asked again, and the draft waits', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    await o.says('u-brian', 'draft my hours');
    expect(await o.says('u-brian', 'Naivas on Monday was less')).toBe('I could not tell which line to change. Tell me the hours, the client or project and the day, for example "6 hours on Naivas on Monday", or "remove Naivas on Monday". Or say yes to send the draft as it is, or no to leave it.');
    expect(o.proposals[0].state).toBe('PARKED');
  });

  it('his no sends nothing and keeps nothing', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    await o.says('u-brian', 'draft my hours');
    expect(await o.says('u-brian', 'no')).toBe(DRAFT_NOT_SENT);
    expect(o.prisma.timeEntry.createMany).not.toHaveBeenCalled();
  });
});

describe('when there is not enough to draft the hours, nothing is parked and the hours are asked for', () => {
  it('Brian, with no hours asked a week, reads what was found and why there is no draft', async () => {
    const o = aTimeSheetsOrganisation({ record: RECORD });
    expect(await o.says('u-brian', 'draft my hours')).toBe([
      'I found this on your record for this week, but not enough to draft your hours.',
      'On Monday 5 October, the record shows your check-in "Naivas Ngong Road install" and the commitment you kept, "Send Lakeside the service report".',
      'On Tuesday 6 October, the record shows your check-in "Sales team" and the work you own, "Naivas freezer 3 wiring".',
      'On Wednesday 7 October, the record shows "Lakeside maintenance plan", which you own.',
      'I cannot draft the hours. The record does not say how long anything took, and your organisation has not set the hours asked a week.',
      'Tell me the hours instead, for example "I spent 3 hours on a client on Monday", and I will say them back before anything is sent.',
    ].join('\n'));
    expect(o.proposals).toEqual([]);
  });

  it('Aisha, who already gave hours for each day the record shows, is told so', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    const said = await o.says('u-aisha', 'draft my hours');
    expect(said.split('\n')).toEqual([
      'I found this on your record for this week, but not enough to draft your hours.',
      'On Monday 5 October, the record shows your check-in "Naivas Westlands".',
      'You have already given hours for each of those days, so there is nothing more to draft.',
      'Tell me the hours instead, for example "I spent 3 hours on a client on Monday", and I will say them back before anything is sent.',
    ]);
  });

  it('Kamau, with nothing on his record this week, is asked for his hours', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    expect(await o.says('u-kamau', 'draft my hours')).toBe(DRAFT_NOTHING_FOUND);
  });

  it('with the suite off, it says so', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD, on: false });
    expect(await o.says('u-brian', 'draft my hours')).toBe('Time sheets are not switched on in your organisation, so I have not sent or kept these hours. An admin can switch them on under Suites.');
  });
});

describe('the draft is for billing only and feeds nothing about the person (decision 10)', () => {
  it('nothing outside the suites and Ask Groundwork uses the draft', () => {
    const root = join(__dirname, '..');
    const faults: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites' && name !== 'assistant') walk(p); }
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) /* a spec that names the file in a list of excuses does not use it */ && /a-week-drafted-from-the-record|draftAWeek/.test(readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))) faults.push(p);
      }
    };
    walk(root);
    expect(faults).toEqual([]);
    /* The pattern does find the real use. A scan that matches nothing proves nothing. */
    expect(/draftAWeek/.test(readFileSync(join(__dirname, '..', 'assistant', 'assistant.service.ts'), 'utf8'))).toBe(true);
  });

  it('what Brian reads says nothing about how much or how well he works', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES, record: RECORD });
    expect(await o.says('u-brian', 'draft my hours')).not.toMatch(/busiest|most|least|average|rank|score|productiv|behind|lazy|slow|PIP|at[- ]risk/i);
  });
});
