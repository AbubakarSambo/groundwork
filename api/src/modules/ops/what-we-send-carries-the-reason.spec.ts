/**
 * THE SEAM WHERE THE REASON WAS BEING DROPPED.
 *
 * Our key results collect why the number matters and how it will be moved. The
 * payload that carries them to Groundwork had a title, a measure and a target —
 * so the objective arriving in the product had a number and no reason, in the
 * one system whose whole argument is that a number opens onto why.
 *
 * This is also the check that our back office is a real customer: the fields
 * only reach the product through the public API, exactly as anybody else's
 * would.
 */
import { subjectsFrom, objectivesFrom } from './what-we-send-to-groundwork';

const objective = {
  id: 'o1',
  title: 'Ten companies onboarded',
  keyResults: [
    {
      id: 'kr1',
      title: 'Companies live',
      target: 10,
      unit: 'companies',
      current: 3,
      dueDate: new Date('2026-10-31'),
      typedByHand: false,
      justification: 'Ten is what the pipeline can actually carry this quarter.',
      approach: 'Sahar works the target list two a week; Abubakar clears blockers.',
    },
  ],
};

describe('what we send', () => {
  it('carries why the number matters and how it will be moved', () => {
    const [subject] = subjectsFrom([objective]);
    expect(subject.justification).toBe(objective.keyResults[0].justification);
    expect(subject.approach).toBe(objective.keyResults[0].approach);
  });

  it('and sends nothing rather than an empty string when we never collected them', () => {
    /* An objective imported before we asked for these has no reason, and a
       blank one would look like somebody wrote nothing rather than like the
       question never having been asked. */
    const older = { ...objective, keyResults: [{ ...objective.keyResults[0], justification: null, approach: null }] };
    const [subject] = subjectsFrom([older]);
    expect(subject.justification).toBeUndefined();
    expect(subject.approach).toBeUndefined();
  });

  it('and still sends the number itself, which is what the check-in opens on', () => {
    const [sent] = objectivesFrom([objective]);
    expect(sent.target).toBe('10');
    expect(sent.measure).toBe('companies');
  });
});
