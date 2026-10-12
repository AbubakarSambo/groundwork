import { aTargetThisWeek } from './the-weekly-report';
import { anAimIsAThing, theAimItself, anAimAsASentence } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 8. The aims were stored as whole sentences ("my plan is five kits to the shops and three to
 * households.", "This week I will do twelve kits, six for the women's group on Wednesday and the Oyugis stockist, this time for
 * sure."), the board read "Hassan Mwenda is aiming for 8 my plan is five kits ...", the week in numbers read "esther is aiming
 * for every sale to be verifiable ...", and five aims with no number read "0 ... It stayed at 0 this week." These are the
 * run's own stored names.
 */
/*
 * HAFSAH, 12 OCTOBER: the person's full sentence is always kept as they wrote it; a short label may only be shown beside it,
 * never instead of it. The aim is stored whole again, the label ("8 kits") is worked out when it is read, and their sentence
 * is quoted as their words, never spliced into "is aiming for".
 */
const HASSAN = 'my plan is five kits to the shops and three to households.';
const AMANI = 'I am aiming for 3 shops in Kilimani.';

describe('an aim is their whole sentence with a label beside it, a name stays a name, and an aim with no number is not a 0', () => {
  it('the label is the thing their sentence counts, worked out when it is read', () => {
    expect(anAimIsAThing(HASSAN)).toBe('kits');
    expect(anAimIsAThing("This week I will do twelve kits, six for the women's group on Wednesday and the Oyugis stockist, this time for sure.")).toBe('kits');
    expect(anAimIsAThing('Next week I will do fifteen kits.')).toBe('kits');
    expect(theAimItself(HASSAN, 8)).toBe('8 kits');
    expect(theAimItself(AMANI, 3)).toBe('3 shops in Kilimani');
    /* An aim already said as a thing is kept as it is. */
    expect(anAimIsAThing('Sell 24 kits a week')).toBe('Sell 24 kits a week');
  });

  it('Amani reads her whole sentence with the label beside it, and so does the lead', () => {
    expect(anAimAsASentence(AMANI, { speaker: 'You', holder: 'You', target: 3, setByTheHolder: true }))
      .toBe('Your own aim is 3 shops in Kilimani. You said, "I am aiming for 3 shops in Kilimani".');
    expect(anAimAsASentence(AMANI, { speaker: 'Amani Wekesa', holder: 'Amani Wekesa', target: 3, setByTheHolder: true }))
      .toBe('Amani Wekesa\'s own aim is 3 shops in Kilimani. Amani Wekesa said, "I am aiming for 3 shops in Kilimani".');
  });

  it('Hassan\'s sentence is shown as his words beside "8 kits", never spliced into "is aiming for"', () => {
    const board = anAimAsASentence(HASSAN, { speaker: 'Hassan Mwenda', holder: 'Hassan Mwenda', target: 8 });
    expect(board).toBe('Hassan Mwenda is aiming for 8 kits. Hassan Mwenda said, "my plan is five kits to the shops and three to households".');
    const own = anAimAsASentence(HASSAN, { speaker: 'Hassan Mwenda', holder: 'Hassan Mwenda', target: 8, setByTheHolder: true });
    expect(own).toBe('Hassan Mwenda\'s own aim is 8 kits. Hassan Mwenda said, "my plan is five kits to the shops and three to households".');
    const f = aTargetThisWeek({ id: 'o-h', name: HASSAN, target: 8, count: 0, from: 0, direction: null, ownerParticipantId: 'p-hassan', isADecisionAboutAPerson: false, setByTheHolder: true } as any, { label: 'Hassan Mwenda' }, true)!;
    expect(f.of).toBe('8 kits, Hassan Mwenda\'s own aim. Hassan Mwenda said, "my plan is five kits to the shops and three to households".');
    for (const said of [board, own, f.of, f.says]) expect(said).not.toMatch(/aiming for 8 my plan|own aim is 8 my plan/);
  });

  it('"This coming week I am targeting twelve kits." is quoted as he said it, never with "I" changed to his name', () => {
    const SAID = 'This coming week I am targeting twelve kits.';
    const toHim = anAimAsASentence(SAID, { speaker: 'You', holder: 'You', target: 12, setByTheHolder: true });
    const toTheLead = anAimAsASentence(SAID, { speaker: 'Hassan Mwenda', holder: 'Hassan Mwenda', target: 12, setByTheHolder: true });
    expect(toHim).toBe('Your own aim is 12 kits. You said, "This coming week I am targeting twelve kits".');
    expect(toTheLead).toBe('Hassan Mwenda\'s own aim is 12 kits. Hassan Mwenda said, "This coming week I am targeting twelve kits".');
    for (const said of [toHim, toTheLead]) expect(said).not.toMatch(/Hassan Mwenda is targeting|You are targeting/);
    const f = aTargetThisWeek({ id: 'o-c', name: SAID, target: 12, count: 0, from: 0, direction: null, ownerParticipantId: 'p-hassan', isADecisionAboutAPerson: false, setByTheHolder: true } as any, { label: 'Hassan Mwenda' }, true)!;
    expect(f.of).toBe('12 kits, Hassan Mwenda\'s own aim. Hassan Mwenda said, "This coming week I am targeting twelve kits".');
    /* A sentence the lead wrote about him keeps today's form. */
    expect(anAimAsASentence('Hassan to close 8 renewals per quarter', { speaker: 'Amina', holder: 'Hassan Mwenda', target: 8 })).toBe('Hassan needs to close 8 renewals per quarter.');
  });

  it('an aim with no number shows his sentence and says it is not counted yet', () => {
    const f = aTargetThisWeek({ id: 'o-n', name: 'I want every sale to have a delivery note.', target: null, count: 0, from: 0, direction: null, ownerParticipantId: 'p-hassan', isADecisionAboutAPerson: false, setByTheHolder: true } as any, { label: 'Hassan Mwenda' }, true)!;
    expect(f.figure).toBe('Not counted yet');
    expect(f.of).toContain('Hassan Mwenda said, "I want every sale to have a delivery note".');
    expect(f.says).toBe('Nothing on record counts this yet.');
  });

  it('"Esther is aiming for ..." keeps her name, and an aim nothing counts says so instead of 0', () => {
    const f = aTargetThisWeek({ id: 'o-e', name: 'Esther is aiming for every sale to be verifiable with an M-Pesa code or delivery note.', target: null, count: 0, from: 0, direction: null, ownerParticipantId: null, isADecisionAboutAPerson: false } as any, 'team', true)!;
    expect(f).toEqual({ figure: 'Not counted yet', of: 'Esther is aiming for every sale to be verifiable with an M-Pesa code or delivery note', says: 'Nothing on record counts this yet.' });
    const team = aTargetThisWeek({ id: 'o-t', name: 'The team is aiming to sell 24 kits a week.', target: null, count: 0, from: 0, direction: null, ownerParticipantId: null, isADecisionAboutAPerson: false } as any, 'team', true)!;
    expect(team.of).toBe('the team is aiming to sell 24 kits a week');
    expect(team.figure).toBe('Not counted yet');
  });
});
