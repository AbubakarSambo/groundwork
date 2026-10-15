import { anActionWithItsLabel, everyActionHasALabel, whatToDoAboutALeadAction, whatToDoAboutADecision } from './what-needs-you-and-what-to-do';
import { withoutItsOwnSpeaker } from './a-view-does-not-start-with-its-speaker';

/**
 * Requests 152 (1), 151 (S2, E6): what the lead reads under "What needs you in this check-in".
 */
describe('an action always says what its button is (request 152, 1)', () => {
  it('every action the engine builds has a label', () => {
    const all = [
      ...['own-1', 'waiting-on-the-lead-1', 'nobody-named-1', 'tell-1', 'other-1'].map((id) => whatToDoAboutALeadAction({ id }, 'g', 'Amani Wekesa')),
      whatToDoAboutADecision({ source: 'lead', question: 'Whether it counts', contextItemId: 'c' }, 'g', 'l', () => null),
      whatToDoAboutADecision({ source: 'lead', question: 'Pick one', contextItemId: null }, 'g', 'l', () => null),
      whatToDoAboutADecision({ source: 'blocker', question: 'q', waitsOn: { participantId: 'p', outside: null, what: 'w' } }, 'g', 'l', () => null),
      whatToDoAboutADecision({ source: 'blocker', question: 'q', waitsOn: { participantId: null, outside: null, what: 'w' } }, 'g', 'l', () => null),
      whatToDoAboutADecision({ source: 'divergence', question: 'q' }, 'g', 'l', () => null),
    ];
    for (const a of all) expect(a.label.trim().length).toBeGreaterThan(0);
  });

  it('an empty or blank label is given the plain one for where it goes, on the lead\'s board as it is served', () => {
    const board = everyActionHasALabel({
      leadActions: [{ id: 'a', says: 'Amani Wekesa is waiting on you for the price list.', action: { label: '', says: 's', goesTo: 'check-in' } }],
      decisions: [{ question: 'Whether to open Karen first.', action: { label: '  ', says: 's', goesTo: 'context' } }],
    });
    expect(board.leadActions[0].action.label).toBe('Open your check-in');
    expect(board.decisions[0].action.label).toBe('Open the Context page');
    expect(anActionWithItsLabel({ label: 'Ask Amani', goesTo: 'context' }).label).toBe('Ask Amani');
  });

  it('a decision the lead actions already say is read once, in the lead\'s list', () => {
    const board = everyActionHasALabel({
      leadActions: [{ id: 'a', says: 'Decide on the tax view.', action: { label: 'Open your check-in', goesTo: 'check-in' } }],
      decisions: [{ question: 'decide on the tax view', action: { label: 'Open your check-in', goesTo: 'check-in' } }, { question: 'Whether to open Karen first.' }],
    });
    expect(board.decisions.map((d: any) => d.question)).toEqual(['Whether to open Karen first.']);
  });
});

describe('a divergence view does not start with its speaker (request 151, S2)', () => {
  it('Amani reads "Amani Wekesa said an aim of 12 shops", not her name twice', () => {
    const view = withoutItsOwnSpeaker('amani Wekesa stated an aim of 12 shops onboarded.', 'Amani Wekesa');
    expect(`Amani Wekesa said ${view}`).toBe('Amani Wekesa said an aim of 12 shops onboarded.');
  });
  it('strips a first name alone, and leaves a view that does not start with it, and the stored text, alone', () => {
    expect(withoutItsOwnSpeaker('Amani says the price list is late.', 'Amani Wekesa')).toBe('the price list is late.');
    expect(withoutItsOwnSpeaker('The price list is late.', 'Amani Wekesa')).toBe('The price list is late.');
    expect(withoutItsOwnSpeaker("Amani's shop is in Karen.", 'Amani Wekesa')).toBe("Amani's shop is in Karen.");
    expect(withoutItsOwnSpeaker('Amani Wekesa', 'Amani Wekesa')).toBe('Amani Wekesa');
    expect(withoutItsOwnSpeaker('Amani said it.', 'A colleague')).toBe('Amani said it.');
  });
});
