import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, answered } from './the-switchboards-sections-harness';

/**
 * Request 128: Amina runs the check-in and also takes part in it. The 90 days are about Tobi alone, and a promise she or
 * Tobi wrote as a goal is a commitment, not "a goal agreed".
 */
const PEOPLE = [
  { ...person('p-amina', 'u-amina', 'Amina', 'Bello', PartyType.INITIATOR), managingOnly: false },
  person('p-tobi', 'u-tobi', 'Tobi', 'Adewale'),
];
const goal = (id: string, who: string, text: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId: who, text, kind: 'GOAL', dueSaid: null, dueDate: null, status: 'OPEN', statusChangedAt: null,
  awareness: 'TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T09:00:00Z'), ...more,
});
const SETUP = {
  scenario: GroundScenario.NEW_HIRE, people: PEOPLE, initiatorId: 'u-amina', label: 'Pricing lead, first 90 days', peersVisibleToEachOther: false,
  clock: { startsAt: new Date('2026-09-01T08:00:00Z') },
  checkIns: [1, 2].flatMap((n) => [answered('p-amina', n, `2026-09-0${n * 2}T16:00:00Z`), answered('p-tobi', n, `2026-09-0${n * 2}T17:00:00Z`)]),
  personObjectives: [
    goal('o-lead', 'p-amina', 'I need to explicitly empower Tobi to handle pricing and commercial terms.', { dueDate: new Date('2026-09-20T00:00:00Z') }),
    goal('o-tobi', 'p-tobi', 'Handle the pricing for the five biggest clients.', { dueDate: new Date('2026-09-25T00:00:00Z') }),
    goal('o-promise', 'p-tobi', 'If the information is incomplete, I will follow up with her for the missing details.'),
  ],
  commitments: [], dependencies: [], patterns: [],
};

describe('the 90 days and what was agreed, as each reader reads them', () => {
  it('Amina reads the steps about Tobi alone, never "you and Tobi Adewale"', async () => {
    const b: any = await boardAs(SETUP as any, 'u-amina', 'MEMBER');
    const steps = b.ninetyDays.steps as any[];
    expect(steps.map((s) => s.question)).toEqual(['Is Tobi Adewale settled in?', 'Is Tobi Adewale doing the job?', 'What you need to decide']);
    expect(JSON.stringify(steps)).not.toMatch(/you and Tobi|Tobi Adewale and you/);
    expect(steps[0].says).toBe('1 goal was agreed for Tobi Adewale to be met by day 30. It is still open.');
  });
  it('Tobi reads the same as "you", with no promise counted as a goal', async () => {
    const b: any = await boardAs(SETUP as any, 'u-tobi', 'MEMBER');
    expect(b.ninetyDays.steps[0].says).toBe('1 goal was agreed for you to be met by day 30. It is still open.');
    expect(JSON.stringify(b.ninetyDays)).not.toMatch(/Tobi Adewale/);
  });
  it('a promise is not "a goal was agreed" in what was agreed at the start', async () => {
    for (const reader of ['u-amina', 'u-tobi']) {
      const b: any = await boardAs(SETUP as any, reader, 'MEMBER');
      const rows = (b.startingState?.rows ?? []) as any[];
      const promise = rows.find((r) => /follow up with her/.test(r.says));
      expect(promise).toBeTruthy();
      expect(promise.kind).toBe('commitment');
      expect(promise.says).not.toMatch(/A goal was agreed/);
      expect(promise.says).toMatch(reader === 'u-amina' ? /^Tobi Adewale said, "If the information is incomplete, I will follow up with her for the missing details\."$/ : /^You said, "If the information/);
    }
  });
});
