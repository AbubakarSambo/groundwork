import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { whoAPromiseIsAbout, theAnswersIn } from '../conversation/a-promise-said-done-is-kept';

/**
 * A PROMISE ABOUT THE READER IS "ABOUT YOU" (messages test, fourth run). From the run's own check-ins.
 *
 * Drop Access. On Wednesday 14 October Groundwork asked Joseph "When will you speak to Grace about it?" and he said "I'll speak to her
 * tomorrow." Grace's summary on Friday 16 October said "Joseph said “I'll speak to her tomorrow” about Grace." Grace is the reader.
 *
 * Muchemi & Co. On Monday 12 October Brian said "The review is Wanjiru's." and, asked "What will you do about getting Wanjiru's feedback,
 * and by when?", "The draft will be with her tomorrow for review." Wanjiru's summaries said "... about Wanjiru's."
 */
const at = (s: string) => new Date(s);
const turn = (role: 'AI' | 'PERSON', content: string, createdAt: string) => ({ role, content, createdAt: at(createdAt) });

describe('Joseph\'s "I\'ll speak to her tomorrow", told to Grace', () => {
  const G = 'g-sales';
  const people: Record<string, [string, string]> = { grace: ['Grace', 'Achieng'], joseph: ['Joseph', 'Kariuki'] };
  const person = (id: string) => ({ id, groundId: G, userId: `u-${id}`, email: `${id}@x.test`, nameGiven: null, managingOnly: false, leftAt: null, partyType: id === 'grace' ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: people[id][0], lastName: people[id][1], awaitingOrgApproval: false } });
  const PEOPLE = Object.keys(people).map(person);
  const promise = { id: 'joseph-speak-to-her', groundId: G, participantId: 'joseph', owedToParticipantId: null, text: "I'll speak to her tomorrow.", kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: at('2026-10-15T00:00:00Z'), createdAt: at('2026-10-14T11:08:20.000Z') };
  const wednesday = { id: 'joseph-2', participantId: 'joseph', turns: [
    turn('AI', 'You have a specific request from Mr Kariuki for Juja Hardware. It sounds like the next step is to confirm the pricing with Grace. Have you already spoken to Grace about the KES 4,500 per unit price for Mr Kariuki?', '2026-10-14T11:08:01.000Z'),
    turn('PERSON', "No, I haven't spoken to Grace yet.", '2026-10-14T11:08:02.000Z'),
    turn('AI', 'Getting a confirmation from Grace on the KES 4,500 price for Mr Kariuki is the key next step. When will you speak to Grace about it?', '2026-10-14T11:08:10.000Z'),
    turn('PERSON', "I'll speak to her tomorrow.", '2026-10-14T11:08:11.000Z'),
  ] };
  const prisma = new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))) },
    personObjective: { findMany: jest.fn(async () => [{ ...promise, participant: { ground: { id: G, label: 'Sales team, Q4', scenario: 'PULSE_CHECK', overWhatsApp: true }, ...PEOPLE[1] } }]) },
    checkIn: { findMany: jest.fn(async () => [wednesday]) },
  } as any, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const lead = { userId: 'u-grace', organizationId: 'org', grounds: [{ id: G, label: 'Sales team, Q4', scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 18, cadence: 'DAILY' }] };

  it('Grace reads "about you" on Friday 16 October, never "about Grace"', async () => {
    const out: WhatIsOutstanding = await whatIsOutstandingFor(prisma, lead, { boards: {} as any, release: new Date('2026-01-01') }, at('2026-10-16T08:00:00Z'));
    const said = theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(theseForAPhone(out)), 'http://localhost/today').params[1];
    expect(said).toContain('Joseph said “I\'ll speak to her tomorrow” about you. That was due by Thursday 15 October and is one day late.');
    expect(said).not.toContain('about Grace');
  });
});

describe('Brian\'s "The draft will be with her tomorrow for review" is about Wanjiru, not "Wanjiru\'s"', () => {
  it('the name is said without its \'s', () => {
    const answers = theAnswersIn([{ id: 'brian-1', participantId: 'brian', turns: [
      turn('AI', 'Understood. Which parts of that do you own, as opposed to depend on somebody else for?', '2026-10-12T11:02:00.000Z'),
      turn('PERSON', "I own the drafting of the reply. The review is Wanjiru's.", '2026-10-12T11:02:01.000Z'),
      turn('AI', "What will you do about getting Wanjiru's feedback, and by when?", '2026-10-12T11:02:10.000Z'),
      turn('PERSON', 'The draft will be with her tomorrow for review. I will follow up with her then.', '2026-10-12T11:02:11.000Z'),
    ] }]);
    const p = { id: 'p', participantId: 'brian', text: 'The draft will be with her tomorrow for review', createdAt: at('2026-10-12T11:02:30.000Z') };
    expect(whoAPromiseIsAbout(p, answers, (id) => (id === 'brian' ? ['Brian', 'Otieno'] : []))).toBe('Wanjiru');
  });
});
