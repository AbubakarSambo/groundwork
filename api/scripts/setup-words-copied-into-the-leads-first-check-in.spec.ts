import { theCopiedSetupIn, withTheCopiedMessagesAsSetup } from './setup-words-copied-into-the-leads-first-check-in';

/* The one-time script finds only a setup whose turns were copied, and marks only those messages as setup. */
const column = (messages: any[], howItEnded = 'setup saved', isTheLead = true) => ({ kind: 'assessment', version: 1, about: { howItEnded, isTheLead }, messages, setup: {} });

describe('setup words copied into the lead\'s first check-in, found and undone', () => {
  it('finds the messages that came from copied turns, in a setup the lead saved', () => {
    const c = column([{ n: 1, where: 'setup', turnId: null }, { n: 2, where: 'check-in', turnId: 't1' }, { n: 3, where: 'check-in', turnId: 't2' }]);
    expect(theCopiedSetupIn({ id: 'c1', groundId: 'g1', sessionReport: c })).toEqual({ checkInId: 'c1', groundId: 'g1', copied: [2, 3] });
  });

  it('leaves a setup saved since the fix, whose update she typed in setup, and any ordinary check-in', () => {
    expect(theCopiedSetupIn({ id: 'c1', groundId: 'g1', sessionReport: column([{ n: 1, where: 'setup', turnId: null }, { n: 2, where: 'check-in', turnId: 't9', saidInSetup: true }]) })).toBeNull();
    expect(theCopiedSetupIn({ id: 'c2', groundId: 'g1', sessionReport: column([{ n: 1, where: 'check-in', turnId: 't1' }], 'finished by the person') })).toBeNull();
    expect(theCopiedSetupIn({ id: 'c3', groundId: 'g1', sessionReport: column([{ n: 1, where: 'check-in', turnId: 't1' }], 'setup saved', false) })).toBeNull();
  });

  it('marks only the copied messages as setup', () => {
    const c = column([{ n: 1, where: 'setup', turnId: null }, { n: 2, where: 'check-in', turnId: 't1' }]);
    expect((withTheCopiedMessagesAsSetup(c, [2]) as any).messages.map((m: any) => m.where)).toEqual(['setup', 'setup']);
  });
});
