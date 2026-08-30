import { howToSayIt, WHAT_IT_MEANS, WHO_CAN_MOVE_IT, Kind, SEEN_COMING_IS_NOT_AN_ACCUSATION, NEVER_CONCLUDE_FROM_A_KIND } from './what-kind-of-thing-is-in-the-way';

const ALL: Kind[] = ['NOT_BUILT', 'INTEGRATION', 'CONTRACT_CHANGED', 'CANNOT_TEST', 'DECISION', 'SEEN_COMING'];

describe('six ways to be blocked, and they are not the same problem', () => {
  it('says what each one means in words anybody can act on', () => {
    for (const k of ALL) {
      expect(WHAT_IT_MEANS[k].length).toBeGreaterThan(20);
      /* No jargon: the person reading this is often the one who cannot read the code. */
      expect(WHAT_IT_MEANS[k]).not.toMatch(/API|CI\/CD|repo|merge|deploy/i);
    }
  });

  it('says who can move each one, which is the point of telling them apart', () => {
    for (const k of ALL) expect(WHO_CAN_MOVE_IT[k].length).toBeGreaterThan(20);
    expect(WHO_CAN_MOVE_IT.INTEGRATION).toContain('Neither can fix this alone');
    expect(WHO_CAN_MOVE_IT.DECISION).toContain('cheapest one on the list');
  });

  it('names nobody, because it cannot see the org chart', () => {
    for (const k of ALL) {
      expect(WHO_CAN_MOVE_IT[k]).toMatch(/whoever|both sides|the person|a conversation/i);
    }
  });

  it('reads a blocker with no kind as a complete record', () => {
    /* Most blockers are described without being classified. That is not a gap. */
    expect(howToSayIt(null, 'the pricing sheet', 'Finance')).toBe('Waiting on Finance for the pricing sheet.');
  });

  it('adds what it means and who can move it when there is a kind', () => {
    const said = howToSayIt('CANNOT_TEST', 'the rig', 'Hardware');
    expect(said).toContain('Waiting on Hardware for the rig.');
    expect(said).toContain('cannot be tried');
    expect(said).toContain('Whoever controls the environment');
  });
});

describe('the one that is about a person', () => {
  it('carries its own protection, and only it', () => {
    expect(howToSayIt('SEEN_COMING', 'the interface', 'Hardware')).toContain(SEEN_COMING_IS_NOT_AN_ACCUSATION);
    expect(howToSayIt('NOT_BUILT', 'the interface', 'Hardware')).not.toContain(SEEN_COMING_IS_NOT_AN_ACCUSATION);
  });

  it('says it is the waiting person\'s own account, not a finding about anybody', () => {
    expect(SEEN_COMING_IS_NOT_AN_ACCUSATION).toContain('about their own work');
    expect(SEEN_COMING_IS_NOT_AN_ACCUSATION).toContain('not a finding about anybody else');
  });

  it('and separates knowing from being able to stop it', () => {
    expect(SEEN_COMING_IS_NOT_AN_ACCUSATION).toContain('not the same as having been able to stop it');
    expect(NEVER_CONCLUDE_FROM_A_KIND).toContain('not the same as being able to stop it');
  });
});

describe('what a kind cannot settle', () => {
  it('forbids reading it as a finding about the other side', () => {
    expect(NEVER_CONCLUDE_FROM_A_KIND).toContain('not a finding about whoever they are waiting on');
    expect(NEVER_CONCLUDE_FROM_A_KIND).toContain('Never write that one side caused a blocker');
  });
});
