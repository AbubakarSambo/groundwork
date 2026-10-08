import { EntryService } from './entry.service';
import { ParticipantsService } from '../participants/participants.service';
import { THE_FIRST_QUESTION } from './the-first-question-for-this-situation';
import { THE_ANCHOR_FIRST_QUESTION } from '../conversation/the-anchor-lead-conversation';
import { THE_ANCHOR_OPENING_TEXT } from './the-anchor-scenario-content';
import { TheAnchorDoor } from './the-anchor-door';
import { theAnchorInvitation } from './the-anchor-people-step';

/**
 * DECISION 114: THE ANCHOR IS A SCENARIO LIKE THE OTHERS. Its entry opening, its first question and its invitation come out of the
 * ordinary routes, as any scenario's do, and only the content differs. With the switch off the anchor's key is not special.
 */
const prismaWith = (on: boolean, ground: any = {}) => ({
  platformSetting: { findUnique: jest.fn(async () => ({ value: { on } })) },
  groundParticipant: { findUnique: jest.fn(async () => ({ id: 'p1', groundId: 'g1', inviteToken: 'tok', userId: null, awaitingSeat: false, startsAt: null, inviteTokenExpiresAt: new Date(Date.now() + 5 * 86400000), roleAsDescribed: null, email: 'amani@x.test' })) },
  ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Help my team understand', scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor', cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: null, startsAt: null, whoSeesTargets: 'THEIR_OWN', initiator: { firstName: 'Hafsah', lastName: 'Jumare' }, organization: { name: 'Coamana' }, objectives: [], ...ground })) },
  checkIn: { count: jest.fn(async () => 0) },
  personObjective: { findMany: jest.fn(async () => []) },
}) as any;
const entry = (on: boolean) => new EntryService({} as any, prismaWith(on), {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);

describe('the entry chat\'s opening text', () => {
  it('is the anchor\'s own, from the ordinary opener route, by label or by key, with the switch on', async () => {
    for (const name of ['Help my team understand', 'HELP_TEAM_UNDERSTAND']) expect(await entry(true).opener(name)).toBe(THE_ANCHOR_OPENING_TEXT);
  });

  it('reads as plain sentences ending in the first question, and says one to one, never privately', () => {
    expect(THE_ANCHOR_OPENING_TEXT).toBe([
      'You know what it takes to keep the work, customers and company moving. Does your team?',
      'For one month, Groundwork will check in with each person one to one, to help everyone understand how their work connects, contribute more, and move in the same direction. You can add up to 20 people, yourself included.',
      "Tell me what you are trying to get across. What's happening right now that makes you wish your team saw more of what you see?",
    ].join('\n\n'));
    expect(THE_ANCHOR_OPENING_TEXT).not.toMatch(/privately/i);
  });

  it('is the ordinary opener with the switch off, and other scenarios are unchanged', async () => {
    const plain = await entry(false).opener(undefined);
    expect(await entry(false).opener('Help my team understand')).toBe(plain);
    expect(await entry(true).opener('New hire')).toMatch(/^You are setting up a new hire situation/);
  });
});

describe('the first question is said once', () => {
  it('the scenario table, the conversation, the door and the opening text all read the same sentence', async () => {
    const ask = THE_FIRST_QUESTION.HELP_TEAM_UNDERSTAND.ask;
    expect(THE_ANCHOR_FIRST_QUESTION).toBe(ask);
    expect((await new TheAnchorDoor(prismaWith(true)).start(null)).firstQuestion).toBe(ask);
    expect(THE_ANCHOR_OPENING_TEXT.endsWith(ask)).toBe(true);
  });
});

describe('the invitation, on the ordinary invitation read', () => {
  const read = (on: boolean, ground: any = {}) => new ParticipantsService(prismaWith(on, ground), {} as any, {} as any, {} as any).preview('tok') as Promise<any>;

  it('carries the anchor\'s words for the invited person, as any scenario\'s own words', async () => {
    const p = await read(true);
    expect(p.invitationWords).toEqual(theAnchorInvitation('Hafsah'));
    expect(p.invitationWords.lines[0]).toMatch(/one to one/);
  });

  it('is absent with the switch off and for another scenario', async () => {
    expect('invitationWords' in (await read(false))).toBe(false);
    expect('invitationWords' in (await read(true, { scenario: 'NEW_PROJECT', startedFrom: null }))).toBe(false);
  });
});
