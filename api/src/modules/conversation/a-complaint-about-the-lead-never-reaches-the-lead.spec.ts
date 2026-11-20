/**
 * A COMPLAINT ABOUT THE LEAD NEVER REACHES THE LEAD (Hafsah, 3 November 2026: "A team member's complaint about their lead is never
 * shown to that lead anywhere they read; it goes privately to an admin, or HR where there is one (and to someone else when the HR
 * person is the lead, as in Joyce and Daniel's case), and the person is told exactly who will see it.")
 *
 * Joyce checks in with Daniel, who leads her check-in and is an admin and the HR person of Baridi Appliances. In her second message she
 * complains about how Daniel speaks to her, and in the same message says she is waiting on him for the price list. What is proved:
 *   - the lead reads none of her complaint on any surface built from the assessment: the facts Ask, the reports and the board read,
 *     the record lines the board, Today and the morning messages read, the waits, the promises, the work mentions, layer 2;
 *   - whoever hears it reads it, and only it; Joyce reads it as her own;
 *   - it goes to another admin when the HR person is the lead, to HR when HR is somebody else, and when there is nobody, Joyce is told so;
 *   - Joyce is told, by name, exactly who will see it, and the email Amina reads says what Joyce said.
 */
import { assessTheConversation } from './assess-the-conversation';
import { theAssessmentIn, whatTheyAreWaitingOn, whatTheyPromisedThemselves, theWorkTheyMentioned, type TheAssessment } from './the-assessment';
import { theFactsIn, aFactAsALine } from './the-facts-on-record';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { whoHearsAComplaintAbout, whoWillSeeIt, aComplaintAboutTheLeadBlock, theComplaintAsTheyReadIt } from './a-complaint-about-the-lead';
import { AComplaintIsToldListener } from './a-complaint-is-told.listener';
import * as fs from 'fs';
import * as path from 'path';

const TURNS = [
  { id: 't0', role: 'AI', content: 'How did the Westgate order go this week?' },
  { id: 't1', role: 'PERSON', content: 'I delivered 40 cartons to Westgate on Monday.' },
  { id: 't2', role: 'AI', content: 'Anything in your way?' },
  { id: 't3', role: 'PERSON', content: 'Daniel shouts at me in front of customers and I am still waiting on him for the price list since last week.' },
];

const THE_READ = {
  summary: 'Joyce delivered 40 cartons to Westgate.',
  claims: [{ words: 'I delivered 40 cartons to Westgate on Monday.', from: [1], claim: 'Delivered 40 cartons', proof: 'said' }],
  numbers: [{ words: '40 cartons', from: [1], figure: '40', measures: 'cartons delivered', unit: 'cartons' }],
  blockers: [{ words: 'I am still waiting on him for the price list since last week.', from: [2], what: 'the price list', onName: 'Daniel', status: 'WAITING', namedTheThing: true }],
  people: [{ words: 'Daniel shouts at me in front of customers', from: [2], name: 'Daniel', kind: 'person', spokenOf: 'criticism', theirWork: 'none' }],
  observations: [{ words: 'Daniel shouts at me', from: [2], observed: 'other', what: 'Upset with her lead.' }],
  aboutTheLead: [{ words: 'Daniel shouts at me in front of customers', from: [2], what: 'Daniel shouts at her in front of customers.' }],
  nothingToRecord: [],
};
const HER_COMPLAINT = /shouts|in front of customers|upset/i;

async function joycesAssessment(): Promise<{ a: TheAssessment; system: string; content: string }> {
  let stored: any = null;
  let seen = { system: '', content: '' };
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci-j', groundId: 'g', participantId: 'p-joyce', sessionNumber: 1, startedAt: new Date('2026-11-03T08:00:00Z'), completedAt: new Date('2026-11-03T08:10:00Z'),
        whatWeHave: null, sessionReport: null, turns: TURNS,
        participant: { partyType: 'PARTICIPANT', nameGiven: null, roleAsDescribed: null, user: { firstName: 'Joyce', lastName: 'Mwangi', jobTitle: 'Sales rep' } },
        ground: { label: 'Sales team', initiator: { firstName: 'Daniel', lastName: 'Otieno' } },
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async (u: any) => { stored = u.data.sessionReport; return {}; }),
    },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => []) },
    groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
  };
  const anthropic: any = { extract: jest.fn(async (system: string, h: any[]) => { seen = { system, content: h[0].content }; return THE_READ; }) };
  await assessTheConversation({ prisma, anthropic, prompts: null, events: null }, 'ci-j', { howItEnded: 'finished by the person', closedAt: new Date('2026-11-03T08:10:00Z') });
  return { a: theAssessmentIn(stored) as TheAssessment, ...seen };
}

describe('Joyce complains about Daniel, who leads her check-in', () => {
  it('the read is told who leads the check-in and asked for a complaint by its meaning', async () => {
    const { system, content } = await joycesAssessment();
    expect(content).toContain('The person who leads this check-in: Daniel Otieno.');
    expect(system).toContain('aboutTheLead');
    expect(system).toMatch(/by its meaning/);
  });

  it('Daniel reads none of it in the facts Ask, the reports and the board read', async () => {
    const { a } = await joycesAssessment();
    const asTheLeadReads = theFactsIn(a, { kind: 'the lead', judgements: true }).map((f) => aFactAsALine(f, () => '3 November')).join('\n');
    expect(asTheLeadReads).toContain('I delivered 40 cartons to Westgate on Monday.');
    expect(asTheLeadReads).not.toMatch(HER_COMPLAINT);
    /* What came in the same message goes with it, so no part of that message reaches him. */
    expect(asTheLeadReads).not.toMatch(/price list/);
    const sharedWithTheCheckIn = theFactsIn(a, { kind: 'everybody in the check-in' }).map((f) => f.words).join('\n');
    expect(sharedWithTheCheckIn).not.toMatch(HER_COMPLAINT);
  });

  it('nor in the record lines the board, Today and the morning messages read, nor in the waits, promises, mentions and layer 2', async () => {
    const { a } = await joycesAssessment();
    expect(theRecordLinesIn(a, () => true).map((l) => l.text).join('\n')).not.toMatch(HER_COMPLAINT);
    expect(JSON.stringify(whatTheyAreWaitingOn(a))).not.toMatch(HER_COMPLAINT);
    expect(JSON.stringify(whatTheyPromisedThemselves(a))).not.toMatch(HER_COMPLAINT);
    expect(JSON.stringify(theWorkTheyMentioned(a))).not.toMatch(HER_COMPLAINT);
    expect(JSON.stringify(a.acrossTime ?? null)).not.toMatch(HER_COMPLAINT);
    expect(JSON.stringify(a.interventions ?? null)).not.toMatch(HER_COMPLAINT);
    for (const s of ['people', 'observations', 'blockers'] as const) expect(JSON.stringify(a[s])).not.toMatch(HER_COMPLAINT);
  });

  it('whoever hears it reads her complaint and nothing else of the check-in, and Joyce reads it as her own', async () => {
    const { a } = await joycesAssessment();
    const theyRead = theFactsIn(a, { kind: 'who hears a complaint' }).map((f) => f.words);
    expect(theyRead).toContain('Daniel shouts at me in front of customers');
    expect(theyRead.join('\n')).not.toContain('40 cartons');
    expect(theFactsIn(a, { kind: 'the person', participantId: 'p-joyce' }).map((f) => f.words)).toContain('Daniel shouts at me in front of customers');
    expect(theFactsIn(a, { kind: 'the person', participantId: 'p-someone-else' })).toEqual([]);
  });
});

describe('who hears it', () => {
  const org = (o: { hr?: string; admins: string[] }) => ({
    organizationSuite: { findUnique: jest.fn(() => ({ catch: () => Promise.resolve(o.hr ? { answers: { hr: o.hr } } : null) })) },
    organizationMembership: { findMany: jest.fn(async () => o.admins.map((userId) => ({ userId }))) },
    user: {
      findMany: jest.fn(async ({ where }: any) => ([
        { id: 'u-daniel', firstName: 'Daniel', lastName: 'Otieno', email: 'daniel@baridi.test' },
        { id: 'u-amina', firstName: 'Amina', lastName: 'Yusuf', email: 'amina@baridi.test' },
        { id: 'u-grace', firstName: 'Grace', lastName: 'Wanjiru', email: 'grace@baridi.test' },
        { id: 'u-peter', firstName: 'Peter', lastName: 'Kamau', email: 'peter@baridi.test' },
      ]).filter((u) => where.id.in.includes(u.id))),
    },
  });
  const forJoyce = { organizationId: 'org', leadUserId: 'u-daniel', personUserId: 'u-joyce' };

  it('Daniel is the HR person and an admin, so it goes to the other admin, Amina', async () => {
    const people = await whoHearsAComplaintAbout(org({ hr: 'u-daniel', admins: ['u-daniel', 'u-amina'] }), forJoyce);
    expect(people.map((p) => p.name)).toEqual(['Amina Yusuf']);
    expect(whoWillSeeIt('Daniel', people, 'Baridi Appliances'))
      .toBe('Daniel will not see this. Amina Yusuf, an admin of Baridi Appliances, will see it, and nobody else will.');
  });

  it('where somebody else looks after HR, it goes to them alone', async () => {
    const people = await whoHearsAComplaintAbout(org({ hr: 'u-grace', admins: ['u-daniel', 'u-amina'] }), forJoyce);
    expect(whoWillSeeIt('Daniel', people, 'Baridi Appliances')).toBe('Daniel will not see this. Grace Wanjiru, who looks after HR, will see it, and nobody else will.');
  });

  it('with no HR person and two other admins, it goes to both', async () => {
    const people = await whoHearsAComplaintAbout(org({ admins: ['u-daniel', 'u-amina', 'u-peter'] }), forJoyce);
    expect(whoWillSeeIt('Daniel', people, 'Baridi Appliances'))
      .toBe('Daniel will not see this. Amina Yusuf and Peter Kamau, the admins of Baridi Appliances, will see it, and nobody else will.');
  });

  it('with nobody but Daniel, Joyce is told so plainly', async () => {
    const people = await whoHearsAComplaintAbout(org({ hr: 'u-daniel', admins: ['u-daniel'] }), forJoyce);
    expect(people).toEqual([]);
    expect(whoWillSeeIt('Daniel', people, 'Baridi Appliances'))
      .toBe('Daniel will not see this. There is nobody else in Baridi Appliances who can look at a complaint about Daniel yet, so for now nobody else will see it either.');
  });
});

describe('what Joyce is told, and what Amina reads', () => {
  it('the conversation is given the exact sentence to say, and decides by meaning when she has complained', () => {
    const block = aComplaintAboutTheLeadBlock('Daniel Otieno', 'Daniel', 'Daniel will not see this. Amina Yusuf, an admin of Baridi Appliances, will see it, and nobody else will.');
    expect(block).toContain('"Daniel will not see this. Amina Yusuf, an admin of Baridi Appliances, will see it, and nobody else will."');
    expect(block).toMatch(/Read it by what they mean/);
  });

  it('every way the conversation is put together for somebody who is not the lead carries it', () => {
    const src = fs.readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toMatch(/const aComplaintBlock = checkIn\.participant\.partyType === PartyType\.INITIATOR \? '' :/);
    expect(src).toMatch(/ANSWER_THE_REMARK, aComplaintBlock, \[/);
    expect(src).toMatch(/OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, aComplaintBlock, planBlock/);
    expect(src).toMatch(/THE_LEAN_CORE, theirLanguage, aComplaintBlock/);
  });

  /* Changed in batch 2 (round 52, H2a): the admin's copy describes the complaint in plain words and never quotes it. */
  it('Amina reads what Joyce\'s complaint is about, about whom, where, and why it comes to her, described and never quoted', () => {
    const m = theComplaintAsTheyReadIt(
      { userId: 'u-amina', name: 'Amina Yusuf', firstName: 'Amina', email: 'amina@baridi.test', holds: 'an admin' },
      { personName: 'Joyce Mwangi', leadName: 'Daniel Otieno', checkIn: 'Sales team', on: '3 November', organisation: 'Baridi Appliances' },
      ['Daniel shouts at her in front of customers.'],
    );
    expect(m.subject).toBe('Joyce Mwangi has made a complaint about Daniel Otieno');
    expect(m.lines).toEqual([
      'Hello Amina,',
      'Joyce Mwangi made a complaint about Daniel Otieno in their check-in for "Sales team" on 3 November. It comes to you because you are an admin of Baridi Appliances.',
      'Daniel shouts at her in front of customers.',
      'You may want to speak to Joyce about it.',
    ]);
  });

  it('the email goes to Amina and never to Daniel', async () => {
    const { a } = await joycesAssessment();
    const sent: string[] = [];
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({
        sessionReport: a, completedAt: new Date('2026-11-03T08:10:00Z'),
        participant: { userId: 'u-joyce', nameGiven: null, user: { firstName: 'Joyce', lastName: 'Mwangi' } },
        ground: { label: 'Sales team', initiatorId: 'u-daniel', organizationId: 'org', initiator: { firstName: 'Daniel', lastName: 'Otieno' }, organization: { name: 'Baridi Appliances' } },
      })) },
      organizationSuite: { findUnique: jest.fn(() => ({ catch: () => Promise.resolve({ answers: { hr: 'u-daniel' } }) })) },
      organizationMembership: { findMany: jest.fn(async () => [{ userId: 'u-daniel' }, { userId: 'u-amina' }]) },
      user: { findMany: jest.fn(async ({ where }: any) => [{ id: 'u-amina', firstName: 'Amina', lastName: 'Yusuf', email: 'amina@baridi.test' }].filter((u) => where.id.in.includes(u.id))) },
    };
    const email: any = { sendTeamAlert: jest.fn(async (to: string) => { sent.push(to); return { sent: true }; }) };
    const r = await new AComplaintIsToldListener(prisma, email, undefined).onAssessmentReady({ checkInId: 'ci-j', groundId: 'g', participantId: 'p-joyce', sessionNumber: 1, howItEnded: 'finished by the person' });
    expect(r.told).toBe(1);
    expect(sent).toEqual(['amina@baridi.test']);
    expect(email.sendTeamAlert.mock.calls[0][2]).toContain('Daniel shouts at her in front of customers.');
    expect(email.sendTeamAlert.mock.calls[0][2].join(' ')).not.toMatch(/“|shouts at me/);
  });
});
