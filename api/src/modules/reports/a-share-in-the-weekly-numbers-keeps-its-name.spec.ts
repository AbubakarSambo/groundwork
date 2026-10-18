import { aTargetThisWeek } from './the-weekly-report';

/**
 * A PERSON'S SHARE IN THE WEEK IN NUMBERS KEEPS ITS NAME, AND SAYS WHOSE IT IS ONCE (screen match, 16 October).
 * Wairimu read the tile "aisha's share, Aisha Otieno's number": the name lowered, and whose it is said twice.
 */
const t = (name: string) => ({ id: 'o', name, target: 6, direction: 'AIM' as const, ownerParticipantId: 'p-aisha', isADecisionAboutAPerson: false, count: 7, from: null });

describe('a share in the week in numbers', () => {
  it('reads "Aisha’s share", once', () => {
    expect(aTargetThisWeek(t('Aisha’s share'), { label: 'Aisha Otieno' }, true)?.of).toBe('Aisha’s share');
  });
  it('a target that does not name its holder still says whose it is', () => {
    expect(aTargetThisWeek(t('Close 6 deals'), { label: 'Aisha Otieno' }, true)?.of).toBe("close 6 deals, Aisha Otieno's number");
  });
});
