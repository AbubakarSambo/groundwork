import { EntryService } from './entry.service';
import { whatTheyAskedFor } from './what-they-asked-for-in-so-many-words';

/** User journeys F-2 and F-3: what the lead said in so many words is what is recorded. */
describe('how often, and for how long', () => {
  it('"weekly for twelve weeks" is weekly, and 84 days, not a month at a time for 360 days', () => {
    expect(whatTheyAskedFor(['I want us to check in weekly for twelve weeks.'])).toEqual({ cadence: 'WEEKLY', timelineDays: 84 });
    expect(whatTheyAskedFor(['Weekly for twelve weeks please'])).toMatchObject({ cadence: 'WEEKLY', timelineDays: 84 });
  });
  it('"Check in weekly for four weeks" is weekly and 28 days', () => {
    expect(whatTheyAskedFor(['Check in weekly for four weeks. Nobody is joining yet, I will add people later.'])).toMatchObject({ cadence: 'WEEKLY', timelineDays: 28 });
  });
  it('other ways of saying a rhythm, next to check-ins', () => {
    expect(whatTheyAskedFor(['fortnightly check-ins for three months'])).toMatchObject({ cadence: 'FORTNIGHTLY', timelineDays: 90 });
    expect(whatTheyAskedFor(['a monthly check-in over the next 6 months'])).toMatchObject({ cadence: 'MONTHLY', timelineDays: 180 });
    expect(whatTheyAskedFor(['I want them to check in every other week'])).toMatchObject({ cadence: 'FORTNIGHTLY' });
  });
  it('a rhythm that is not about check-ins is not read as one', () => {
    expect(whatTheyAskedFor(['We send a monthly report to the board and a weekly newsletter.'])).toEqual({});
    expect(whatTheyAskedFor(['Our sales figures are reviewed monthly by finance.'])).toEqual({});
  });
  it('nothing is made up when nothing was said', () => {
    expect(whatTheyAskedFor(['I lead the sales team and want to know how the quarter is going.'])).toEqual({});
  });
  it('the last thing said stands, as a person correcting themselves means it', () => {
    expect(whatTheyAskedFor(['Weekly check-ins for six weeks.', 'Actually make it fortnightly check-ins for twelve weeks.'])).toMatchObject({ cadence: 'FORTNIGHTLY', timelineDays: 84 });
  });
});

describe('the name', () => {
  it('"Call it X" is the name, without the instruction after it', () => {
    expect(whatTheyAskedFor(['Call it New starter onboarding. Start it now.']).name).toBe('New starter onboarding');
    expect(whatTheyAskedFor(['Call it Sales team, last quarter']).name).toBe('Sales team, last quarter');
    expect(whatTheyAskedFor(['Call it Website relaunch and start it now']).name).toBe('Website relaunch');
    expect(whatTheyAskedFor(['Please name it "Weekly pulse".']).name).toBe('Weekly pulse');
  });
  it('no name is made up from a sentence that only says called', () => {
    expect(whatTheyAskedFor(['The team is called Harbor Foods and I lead it.']).name).toBeUndefined();
  });
});

/** AS THE SAVE RECORDS IT: what the lead said fills what nobody picked, and a pick made on the screen is kept. */
describe('what the save records', () => {
  const make = () => {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'w@kito.test' })) },
      organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
      platformSetting: { findUnique: jest.fn(async () => null) },
      entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
      conversationTurn: { createMany: jest.fn(async () => ({})) },
      leadContextNote: { create: jest.fn(async () => ({})) },
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
    };
    const grounds: any = { create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
    const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
    return { service: new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any), grounds };
  };
  const body = (more: any) => ({ groundLabel: 'Sales team', scenario: 'OKR_ALIGNMENT', history: [{ role: 'user', content: 'I want us to check in weekly for twelve weeks.' }], report: null, contributors: [], ...more }) as any;

  it('weekly for twelve weeks is recorded as weekly and 84 days when nobody picked a rhythm on the screen', async () => {
    const { service, grounds } = make();
    await service.commit('org1', 'u1', body({ cadence: 'FORTNIGHTLY', cadenceChosen: false }));
    expect(grounds.create.mock.calls[0][2]).toMatchObject({ cadence: 'WEEKLY', timelineDays: 84 });
  });
  it('a rhythm picked on the screen is kept, and so is a date picked for the last check-in', async () => {
    const { service, grounds } = make();
    await service.commit('org1', 'u1', body({ cadence: 'MONTHLY', cadenceChosen: true, lastCheckInBy: '2026-12-31' }));
    const made = grounds.create.mock.calls[0][2];
    expect(made.cadence).toBe('MONTHLY');
    expect(made.timelineDays).toBeUndefined();
  });
  it('nothing is recorded that was not said', async () => {
    const { service, grounds } = make();
    await service.commit('org1', 'u1', body({ history: [{ role: 'user', content: 'I lead sales.' }], cadenceChosen: false }));
    const made = grounds.create.mock.calls[0][2];
    expect(made.cadence).toBeUndefined();
    expect(made.timelineDays).toBeUndefined();
  });
});
