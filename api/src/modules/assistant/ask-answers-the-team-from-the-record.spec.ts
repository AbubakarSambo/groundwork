import { askGroundwork, textOf } from './request-92-harness';
import { ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';
import { boardAs, SALES_RUN, answered, type Setup } from '../board/the-switchboards-sections-harness';

/**
 * ASK ANSWERS ABOUT THE TEAM FROM THE RECORD, FOR EVERY READER (release test, 22 November evening, R-8 and R-9).
 *
 * R-8: Amani, in Wairimu's sales check-in at Msingi Foods, asked "whats the team goal now?" and read the company's priorities. The
 * model placed her question on the nearest thing in the guide it was given, the company's priorities, because the guide had nothing
 * for a team's goal. Wairimu's same question was answered from the goal rows. Both now read the same goals on record, as each may.
 *
 * R-9: Wairimu asked "How is my sales team doing?" the day session 3 opened, and read "Nobody has answered yet.", over five people
 * who had answered sessions 1 and 2. The answer now says this round as this round, and the team's targets as the board counts them.
 */

/* ---------------------------------------------------------------- R-8 */

const people = [
  { id: 'p-wairimu', groundId: 'g', userId: 'u-wairimu', email: 'wairimu@msingi.test', nameGiven: null },
  { id: 'p-amani', groundId: 'g', userId: 'u-amani', email: 'amani@msingi.test', nameGiven: null },
  { id: 'p-chidi', groundId: 'g', userId: 'u-chidi', email: 'chidi@msingi.test', nameGiven: null },
];
const users = [
  { id: 'u-wairimu', firstName: 'Wairimu', lastName: 'Njoroge' },
  { id: 'u-amani', firstName: 'Amani', lastName: 'Wekesa' },
  { id: 'u-chidi', firstName: 'Chidi', lastName: 'Okeke' },
];
const goals = [
  { id: 'o-team', name: 'Each person builds a waitlist of 15 shops by 31 December', target: 15, count: 0, ownerParticipantId: null, setByParticipantId: 'p-wairimu' },
  { id: 'o-chidi', name: 'Chidi signs 5 new shops', target: 5, count: 1, ownerParticipantId: 'p-chidi', setByParticipantId: 'p-wairimu' },
];
const groundAuditLog = {
  timeline: [],
  targetChanges: [{
    objectiveId: 'o-team', from: 40, to: 15, fromNames: ['the team’s “Freezers sold by the team this quarter”'], toName: goals[0].name,
    because: 'The freezers we sell are out of stock until January', stopsTheWork: true, byParticipantId: 'p-wairimu', said: null, at: '2026-11-22T10:00:00Z',
  }],
};

/** Gemini as it read these: the question placed on the thing in the guide that answers it, the closest one where none does. */
function gemini() {
  const given: string[] = [];
  return {
    given,
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, history: any[]) => {
      const content = String(history?.[0]?.content ?? '');
      if (/You read one message/.test(prompt)) {
        if (!/team goal/i.test(content)) return { kind: 'other' };
        const things = [...content.matchAll(/^(\w+): (.+?)\. For example/gm)].map((m) => ({ key: m[1], does: m[2] }));
        const theTeams = things.find((t) => /\bteam\b/.test(t.does) && /\b(aiming|goal)\b/.test(t.does));
        return { kind: 'question', guide: theTeams?.key ?? 'company_priorities' };
      }
      if (prompt === ANSWER_FROM_THE_DOCUMENTS_PROMPT) {
        given.push(content);
        const line = content.split('\n').find((l) => l.startsWith('- The team’s goal is'));
        return line ? { found: true, answer: line.replace(/^- /, '') } : { found: false, whyNot: 'nothing' };
      }
      return null;
    }),
  };
}

function asksAs(userId: string) {
  const engine = gemini();
  const h = askGroundwork({ userId, role: 'MEMBER', engine, participants: [{ groundId: 'g', partyType: userId === 'u-wairimu' ? 'INITIATOR' : 'PARTICIPANT' }] });
  h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: userId, displayName: users.find((u) => u.id === userId)!.firstName, active: true, linkedUserId: userId, email: `${userId}@msingi.test` }));
  h.prisma.ground.findMany = jest.fn(async () => [{ id: 'g', label: 'Sales team, Q4', initiatorId: 'u-wairimu', organizationId: 'org-a', groundAuditLog, participants: people.filter((p) => p.userId === userId).map((p) => ({ id: p.id })) }]);
  h.prisma.groundParticipant.findMany = jest.fn(async ({ where }: any = {}) => people.filter((p) => !where?.userId || p.userId === where.userId).map((p) => ({ ...p, partyType: p.userId === 'u-wairimu' ? 'INITIATOR' : 'PARTICIPANT' })));
  h.prisma.user.findMany = jest.fn(async ({ where }: any) => users.filter((u) => where?.id?.in?.includes(u.id)));
  h.prisma.groundObjective = { findMany: jest.fn(async () => goals.map((o) => ({ ...o }))) };
  h.prisma.personObjective = { findMany: jest.fn(async () => []) };
  h.prisma.organization.findUnique = jest.fn(async () => ({ name: 'Msingi Foods', personJudgementsOn: true }));
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: userId }, sessions: { value: [] } }) };
  return { say: async (m: string) => { const r: any = await h.service.respond('org-a', 'p1', m); return { lane: r.lane, text: textOf(r) }; }, given: engine.given };
}

describe('R-8: "whats the team goal now?", as each reader reads it', () => {
  it('Amani, in the team, reads the team’s goal as it is now and why it changed, never the company’s priorities or Chidi’s own goal', async () => {
    const amani = asksAs('u-amani');
    const r = await amani.say('whats the team goal now?');
    expect(r.lane).toBe('answer_from_documents');
    expect(r.text).toContain('Each person builds a waitlist of 15 shops by 31 December');
    expect(r.text).toContain('On 22 November the goal changed, because the freezers we sell are out of stock until January.');
    expect(r.text).not.toMatch(/priorities/);
    expect(amani.given.join('\n')).not.toMatch(/Chidi signs|Freezers sold by the team/);
  });

  it('Wairimu, who leads it, reads the same goal from the same rows, with what it was before', async () => {
    const wairimu = asksAs('u-wairimu');
    const r = await wairimu.say('whats the team goal now?');
    expect(r.lane).toBe('answer_from_documents');
    expect(r.text).toContain('Each person builds a waitlist of 15 shops by 31 December');
    expect(r.text).toMatch(/Before that, the goal was the team’s “?Freezers sold by the team this quarter”?\./);
  });
});

/* ---------------------------------------------------------------- R-9 */

/** The sales run on the day its third session opened: everybody answered sessions 1 and 2, nobody has answered session 3 yet. */
const THE_THIRD_DAY: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales team',
  clock: { timelineDays: 84, cadence: 'FORTNIGHTLY', createdAt: new Date('2026-09-01T08:00:00Z'), startsAt: new Date('2026-09-01T08:00:00Z') },
  checkIns: [
    ...(SALES_RUN.checkIns ?? []),
    ...['p-femi', 'p-ngozi', 'p-kwame'].map((p) => ({ ...answered(p, 3), status: 'NOT_STARTED', completedAt: null, availableFrom: new Date('2026-09-30T06:00:00Z') })),
  ],
  objectives: [{ id: 'o-team', groundId: 'g-1', name: 'Credit sales closed this quarter', target: 40, count: 12, prevCount: 7, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null }],
};

function asksHowTheTeamIs(userId: string, role: 'MEMBER' | 'ADMIN') {
  const h = askGroundwork({ userId, role, participants: [{ groundId: 'g-1', partyType: userId === 'u-bisi' ? 'INITIATOR' : 'PARTICIPANT' }] });
  h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: userId, displayName: userId, active: true, linkedUserId: userId }));
  const theGround = { id: 'g-1', label: THE_THIRD_DAY.label, initiatorId: 'u-bisi', organizationId: 'org-a' };
  h.prisma.ground.findMany = jest.fn(async ({ where }: any) => (role === 'ADMIN' || where?.initiatorId === theGround.initiatorId ? [theGround] : []));
  (h.service as any).board = { get: (_g: string, uid: string) => boardAs(THE_THIRD_DAY, uid, role) };
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: userId }, sessions: { value: [] } }) };
  return async () => {
    const r: any = await h.service.respond('org-a', 'p1', 'How is my sales team doing?');
    return { lane: r.lane, text: textOf(r) };
  };
}

describe('R-9: "How is my sales team doing?" the day a new round opens', () => {
  it('Bisi, who leads it, reads that this round has no answers yet, where the check-in is, and the team’s target as her board counts it', async () => {
    const board = await boardAs(THE_THIRD_DAY, 'u-bisi', 'MEMBER');
    const target = (board.objectives as any[]).find((o) => o.id === 'o-team');
    const r = await asksHowTheTeamIs('u-bisi', 'MEMBER')();
    expect(r.lane).toBe('how_is_the_team');
    expect(r.text).not.toMatch(/^Nobody has answered yet\./);
    expect(r.text).toContain('Nobody has answered this round yet.');
    expect(r.text).toContain('Nobody has answered this round yet. Two of the six check-ins are done.');
    expect(r.text).toContain(`${target.name.replace(/[.!?\s]+$/, '')}. So far it is at ${target.count} of 40.`);
    expect(r.text).toMatch(/This is what your board and your latest report say\.$/);
  });

  it('an admin reads the same, and Femi, who only checks in, is told it is not a team he leads', async () => {
    const admin = await asksHowTheTeamIs('u-admin', 'ADMIN')();
    expect(admin.text).toContain('Nobody has answered this round yet.');
    expect(admin.text).toContain('credit sales closed this quarter. So far it is at 12 of 40.');
    const femi = await asksHowTheTeamIs('u-femi', 'MEMBER')();
    expect(femi.text).toBe('You do not run a check-in yet, so there is no team for me to tell you about. You can ask me how you are doing, or what you are waiting on.');
  });
});
