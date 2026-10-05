import { whereThisIsHeading } from './where-this-is-heading';

/**
 * A SENTENCE USED AS THE OBJECT OF A PREPOSITION (release round, run 32, six scenarios).
 *
 * The board read, on shock, board, handover, project, crisis and openread:
 *
 *   People in this check-in said different things about the reason for Meridian's departure is
 *   understood differently by the three people involved.
 *
 * The three guards in front of it - short enough, no full stop, opens with a determiner - all pass
 * for a topic that is already a whole sentence. The same fault "what changed since last time" had
 * (request 151, E1), and the same answer: say it as a sentence.
 */
const saysOf = (topic: string): string[] => {
  const out: any = whereThisIsHeading({
    scenario: 'DRIFT' as any,
    hadAnObjective: false,
    readerIsTheLead: true,
    leadName: 'Rukia Otieno',
    board: { divergence: { items: [{ topic }] } },
  } as any);
  return (out?.signals ?? []).map((s: any) => String(s.says));
};

describe('a topic that is already a sentence is said as one', () => {
  it('does not glue the sentence from run 32 after "about"', () => {
    const says = saysOf("The reason for Meridian's departure is understood differently by the three people involved");
    expect(says.some((s) => s.includes('about the reason'))).toBe(false);
    expect(says).toContain("The reason for Meridian's departure is understood differently by the three people involved.");
  });

  it('and the same for the other two the review caught', () => {
    expect(saysOf('The timeline for the Kenya market launch is not agreed upon'))
      .toContain('The timeline for the Kenya market launch is not agreed upon.');
    expect(saysOf('The fundamental purpose and scope of the project is described in two conflicting ways'))
      .toContain('The fundamental purpose and scope of the project is described in two conflicting ways.');
  });

  it('still names a plain thing after "about", which is what the line is for', () => {
    expect(saysOf('The renewals target'))
      .toContain('People in this check-in said different things about the renewals target.');
  });

  it('still falls back where the topic is no use as either', () => {
    expect(saysOf('')).toContain('People in this check-in said different things about one thing.');
  });
});
