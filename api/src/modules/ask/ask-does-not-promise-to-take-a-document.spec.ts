import { askFirstWelcome, askStarters, askStartersFor, ASK_ADD_LINE } from '../assistant/ask-name';

/**
 * Request 209. Ask cannot take a document or a fact for a check-in, so it does not say it can. It points to the check-in's Context and resources page,
 * where the check-in's own chat does it, and only for somebody who may add context.
 */
describe('what Ask says about adding context or a document', () => {
  it('says where to do it, in a full sentence', () => {
    expect(ASK_ADD_LINE).toBe("To add context or a document, open the check-in's Context and resources page.");
  });
  it('does not tell somebody who may not add context anything about it', () => {
    expect(askFirstWelcome('Baridi', false, { leaveIsOn: true, spendingIsOn: true })).not.toMatch(/context|document/i);
  });
  it('tells somebody who may add context where to go, and never that Ask takes it', () => {
    const w = askFirstWelcome('Baridi', true, { leaveIsOn: true, spendingIsOn: true });
    expect(w).toContain(ASK_ADD_LINE);
    expect(w).not.toMatch(/say it back|You can add context/i);
  });
  it('offers no starter that asks it to add a document or context', () => {
    for (const has of [true, false]) expect(askStarters(has).join(' ')).not.toMatch(/document|context/i);
    expect(askStartersFor({ isAGuest: false, takesPartInOne: true, hasOneToUse: true, runsOne: true, leaveIsOn: true, spendingIsOn: true, contextIsHere: true }).join(' ')).not.toMatch(/document|context/i);
  });
});
