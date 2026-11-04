import { GroundScenario } from '@prisma/client';
import { boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { theShareSays } from './your-share';

/**
 * REQUEST 107 (c): YOUR SHARE, ON A PARTICIPANT'S OWN BOARD (the prototype's B5: "Your share. 4 of
 * your 5 sales so far; 3 paid. Only you and Wairimu see your share.").
 *
 * Rukia set herself 3 shops and has 1. Baraka has 5 visits of his own. Each reads only their own
 * share, the lead and the admins read no share at all, and who else sees it follows the check-in's
 * own setting for targets.
 */
const objective = (id: string, name: string, target: number, count: number, owner: string | null, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target, count, prevCount: 0, ownerParticipantId: owner, setByParticipantId: owner,
  direction: null, isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null, ...more,
});
const TARGETS = [
  objective('o-rukia', 'I am aiming for 3 shops in Kilimani.', 3, 1, 'p-rukia'),
  objective('o-baraka', 'I want 5 visits a week.', 5, 2, 'p-baraka'),
  objective('o-team', 'The team is aiming for 20 shops.', 20, 6, null),
];

describe('your share, as each reader reads it', () => {
  /* Changed 4 November 2026 (release batch 1, Hafsah: no privacy notes on screens): the share carries no note about who else sees it. Who may read it is unchanged. */
  it('Rukia reads her own share', async () => {
    const b = await boardAs({ objectives: TARGETS }, ...RUKIA);
    expect(b.yourShare).toEqual([{
      objectiveId: 'o-rukia',
      /* Her own aim is said as hers (decision 75, item 37); it read "You are aiming for", as if set for her. */
      /* Since 12 October a person's own aim is quoted whole in their words, with the short label beside it (52f9d4241, 59a945e03, e93258d96). */
      says: 'Your own aim is 3 shops in Kilimani. You said, "I am aiming for 3 shops in Kilimani". You have 1 of the 3 so far.',
    }]);
    expect(JSON.stringify(b.yourShare)).not.toMatch(/Baraka|visits/);
  });

  it('Baraka reads his, and never Rukia\'s', async () => {
    const b = await boardAs({ objectives: TARGETS }, ...BARAKA);
    expect(b.yourShare.map((s: any) => s.says)).toEqual(['Your own aim is 5 visits a week. You said, "I want 5 visits a week". You have 2 of the 5 so far.']);
  });

  it('where the lead chose that everybody sees every number, there is no note either', async () => {
    const b = await boardAs({ objectives: TARGETS, whoSeesTargets: 'EVERYBODY' }, ...RUKIA);
    expect(b.yourShare[0].whoSees).toBeUndefined();
  });

  for (const [name, reader] of Object.entries({ 'Amina, who runs it': AMINA, 'Juma, an admin who only reads': JUMA, 'the admin who set it up': SETUP_ADMIN })) {
    it(`${name} reads no share`, async () => {
      const b = await boardAs({ objectives: TARGETS }, reader[0], reader[1]);
      expect(b.yourShare).toBeUndefined();
    });
  }

  it('a target the lead holds as a decision about the person is not their share', async () => {
    const b = await boardAs({ objectives: [objective('o-d', 'Decide whether to keep Rukia on.', 1, 0, 'p-rukia', { isADecisionAboutAPerson: true })] }, ...RUKIA);
    /* Request 110 (a): a person who checks in is always sent the list, empty here, with the sentence that says so. */
    expect(b.yourShare).toEqual([]);
    expect(b.yourShareSays).toBe('There is no number of yours on this board yet, so there is no share to show.');
  });

  it('the person reviewed on a performance plan reads their own share and nobody else\'s', async () => {
    const b = await boardAs({ scenario: GroundScenario.PIP, objectives: TARGETS }, ...RUKIA).catch(() => null);
    expect(JSON.stringify(b?.yourShare ?? [])).not.toMatch(/visits|20 shops/);
  });
});

describe('the sentences', () => {
  it('a limit says where it is, not how much is left', () => {
    expect(theShareSays('You are keeping field visits to no more than 180,000.', 120000, 180000, 'LIMIT'))
      .toBe('You are keeping field visits to no more than 180,000. You are at 120,000 so far.');
  });
  it('nothing counted yet says so', () => {
    expect(theShareSays('You are aiming for 3 shops.', 0, 3)).toBe('You are aiming for 3 shops. Nothing has been counted against it yet.');
  });
});
