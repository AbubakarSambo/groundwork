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
  ownerId: 'person-1',
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

describe('who an objective belongs to', () => {
  /**
   * WE PUSHED OBJECTIVES THAT BELONGED TO NOBODY, for months.
   *
   * `ownerExternalId` was never sent, so "what am I on" answered "nothing your
   * organisation has sent us lists you as an owner or contributor on" to
   * everybody — correctly. It reads as a person having no work. It was every
   * objective having no person.
   */
  it('is sent, so somebody can be told what they are on', () => {
    const [subject] = subjectsFrom([objective], () => 'sahar');
    expect(subject.ownerExternalId).toBe('sahar');
  });

  it('and is left off rather than guessed when we cannot resolve them', () => {
    /* An objective attributed to the wrong person is worse than one attributed
       to nobody, because it is believed. */
    const [subject] = subjectsFrom([objective], () => null);
    expect(subject.ownerExternalId).toBeUndefined();
  });
});

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

describe('the idempotency key', () => {
  const { fingerprint } = require('./what-we-send-to-groundwork');

  it('changes when the content changes, so an enriched payload is a new write', () => {
    /**
     * IT WAS THE SUBJECT'S ID ALONE, so the first push of an objective set the
     * key and every later push with anything changed was refused 409 — "already
     * used with a different request body". Found the day owners started being
     * sent: five objectives unchanged, one now owned, and that one refused.
     *
     * Which is the API being right. A key promises "this exact write, once".
     */
    const before = fingerprint({ externalId: 'kr1', title: 'A number' });
    const after = fingerprint({ externalId: 'kr1', title: 'A number', ownerExternalId: 'sahar' });
    expect(after).not.toBe(before);
  });

  it('and does not change when the same thing is sent twice', () => {
    const a = fingerprint({ externalId: 'kr1', title: 'A number', ownerExternalId: 'sahar' });
    const b = fingerprint({ ownerExternalId: 'sahar', externalId: 'kr1', title: 'A number' });
    /* Two objects with the same fields in a different order are the same write,
       and JSON.stringify does not think so. */
    expect(a).toBe(b);
  });
});
