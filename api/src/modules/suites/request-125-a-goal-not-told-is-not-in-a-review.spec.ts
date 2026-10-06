import { NOW, setup } from './__fixtures__/aisha-review';

/**
 * REQUEST 125, FINDING 2 (decisions 48 and 56). Wairimu leads "Sales team, Q3" and has set Aisha the goal "New supermarket accounts"
 * without telling her yet. The review's record copied the goal in once, for good, and then gave it to Aisha. Now only whoever runs that
 * check-in reads it, read as it stands when the record is served, so a record stored before it is told is read once Wairimu has told her.
 */
const NOT_TOLD = { id: 'pg-1', groundId: 'g-sales', participantId: 'pa-sales', text: 'Open at least four new supermarket accounts.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01') };
const goalLines = (r: any) => (r.record?.parts ?? []).flatMap((x: any) => x.lines.map((l: any) => l.says)).filter((s: string) => /New supermarket accounts/.test(s));

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

describe('a goal the lead has not told Aisha about, in her review', () => {
  it('Aisha does not read it, and Wairimu, who runs the check-in, does', async () => {
    const { svc, as } = setup({ personObjectives: [NOT_TOLD] });
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    expect(goalLines(await svc.one(as('u-aisha'), id))).toEqual([]);
    expect(goalLines(await svc.one(as('u-wairimu'), id))).toEqual(['Aisha owns the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4.']);
  });

  it('the record already stored is read once the goal has been told', async () => {
    const opts: any = { personObjectives: [NOT_TOLD] };
    const { svc, as } = setup(opts);
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    expect(goalLines(await svc.one(as('u-aisha'), id))).toEqual([]);
    NOT_TOLD.awareness = 'TOLD';
    try {
      expect(goalLines(await svc.one(as('u-aisha'), id))).toEqual(['You own the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4.']);
    } finally { NOT_TOLD.awareness = 'NOT_TOLD'; }
  });
});
