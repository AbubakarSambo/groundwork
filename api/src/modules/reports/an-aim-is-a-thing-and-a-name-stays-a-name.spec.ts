import { aTargetThisWeek } from './the-weekly-report';
import { anAimIsAThing, theAimItself } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 8. The aims were stored as whole sentences ("my plan is five kits to the shops and three to
 * households.", "This week I will do twelve kits, six for the women's group on Wednesday and the Oyugis stockist, this time for
 * sure."), the board read "Hassan Mwenda is aiming for 8 my plan is five kits ...", the week in numbers read "esther is aiming
 * for every sale to be verifiable ...", and five aims with no number read "0 ... It stayed at 0 this week." These are the
 * run's own stored names.
 */
describe('an aim is a thing, a name stays a name, and an aim with no number is not a 0', () => {
  it('a whole sentence of their own is stored as the thing it counts', () => {
    expect(anAimIsAThing('my plan is five kits to the shops and three to households.')).toBe('kits');
    expect(anAimIsAThing("This week I will do twelve kits, six for the women's group on Wednesday and the Oyugis stockist, this time for sure.")).toBe('kits');
    expect(anAimIsAThing('Next week I will do fifteen kits.')).toBe('kits');
    expect(theAimItself('my plan is five kits to the shops and three to households.', 8)).toBe('8 kits');
    /* An aim already said as a thing is kept as it is. */
    expect(anAimIsAThing('Sell 24 kits a week')).toBe('Sell 24 kits a week');
  });

  it('Hassan\'s own aim reads as 8 kits, his, in the week in numbers', () => {
    const f = aTargetThisWeek({ id: 'o-h', name: 'my plan is five kits to the shops and three to households.', target: 8, count: 0, from: 0, direction: null, ownerParticipantId: 'p-hassan', isADecisionAboutAPerson: false, setByTheHolder: true } as any, { label: 'Hassan Mwenda' }, true)!;
    expect(f.of).toBe("8 kits, Hassan Mwenda's own aim");
    expect(f.of).not.toMatch(/my plan/);
  });

  it('"Esther is aiming for ..." keeps her name, and an aim nothing counts says so instead of 0', () => {
    const f = aTargetThisWeek({ id: 'o-e', name: 'Esther is aiming for every sale to be verifiable with an M-Pesa code or delivery note.', target: null, count: 0, from: 0, direction: null, ownerParticipantId: null, isADecisionAboutAPerson: false } as any, 'team', true)!;
    expect(f).toEqual({ figure: 'Not counted yet', of: 'Esther is aiming for every sale to be verifiable with an M-Pesa code or delivery note', says: 'Nothing on record counts this yet.' });
    const team = aTargetThisWeek({ id: 'o-t', name: 'The team is aiming to sell 24 kits a week.', target: null, count: 0, from: 0, direction: null, ownerParticipantId: null, isADecisionAboutAPerson: false } as any, 'team', true)!;
    expect(team.of).toBe('the team is aiming to sell 24 kits a week');
    expect(team.figure).toBe('Not counted yet');
  });
});
