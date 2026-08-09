import { forensicPhrases, forensicInReport } from './forensic-voice';

/**
 * A REPORT SHOULD SOUND LIKE A COLLEAGUE, NOT A FILING.
 *
 * People answer honestly only while it does not feel like they are being
 * assessed or put on trial. A report that narrates through "the record" and "the
 * accounts", and calls the people in it "parties", reads as disclosure. That
 * changes what the next person writes, which changes what the product can see at
 * all. The register is not decoration here.
 *
 * Real sentences from a live twelve-session ground, all of which now fail:
 *
 *   "Both parties' records show a progression where participant A's role evolved"
 *   "The record shows a confident, positive assessment"
 *   "Another account describes success as clearing tickets"
 *
 * The synthesis prompt now forbids all of it at length. A prompt is a request
 * though, and a model under load falls back to the register it was trained on,
 * so this is the check that it held.
 *
 * THE HARD PART IS THE TWO WORDS THAT ARE BOTH FINE AND NOT FINE.
 *
 *   "record" is right as the thing a closed ground becomes. "Your record."
 *   "This stays on record for everyone who was in it." Only "the record shows"
 *   is forensic.
 *
 *   "account" is right as the mechanism, and it is the sentence the whole
 *   product rests on: "everyone gives their own independent account". Only
 *   "the accounts differ" is forensic.
 *
 * A blunt word list would either miss the problem or delete the line that
 * explains what Groundwork is. Both halves are pinned below.
 */

describe('narrating through the record', () => {
  it('catches the openings a real report used', () => {
    expect(forensicPhrases('The record shows a confident, positive assessment.')).not.toHaveLength(0);
    expect(forensicPhrases('The record describes a six-week period of work.')).not.toHaveLength(0);
    expect(forensicPhrases("Both parties' records show a progression.")).not.toHaveLength(0);
  });

  it('says why, so the writer knows what to change', () => {
    expect(forensicPhrases('The record shows deadlines slipped.')[0].why)
      .toMatch(/instead of saying what happened/);
  });
});

describe('the word "record" is not the problem', () => {
  it('leaves the legitimate noun completely alone', () => {
    // The thing a closed ground becomes. This is the product, not a smell.
    expect(forensicPhrases('Your record stays with you and with everyone who was in it.')).toHaveLength(0);
    expect(forensicPhrases('This stays on record for everyone who was in this ground.')).toHaveLength(0);
    expect(forensicPhrases('You can correct your own record from a session you finished.')).toHaveLength(0);
  });
});

describe('the word "account" is not the problem either', () => {
  it('leaves the mechanism line alone, because it is the moat', () => {
    expect(forensicPhrases('Everyone gives their own independent account.')).toHaveLength(0);
    expect(forensicPhrases('Each person gives their own account, privately.')).toHaveLength(0);
    expect(forensicPhrases("For small teams getting each person's own account on the record.")).toHaveLength(0);
  });

  it('catches it as narration', () => {
    expect(forensicPhrases('The accounts differ on what success meant.')).not.toHaveLength(0);
    expect(forensicPhrases('Another account describes success as clearing tickets.')).not.toHaveLength(0);
  });
});

describe('people are not parties', () => {
  it('catches every shape it appeared in', () => {
    for (const line of [
      'Both parties agree the work is on track.',
      'All parties have now checked in.',
      "One party's position has changed.",
      'The other party has already submitted their version.',
    ]) {
      expect({ line, hits: forensicPhrases(line).length }).toMatchObject({ hits: expect.any(Number) });
      expect(forensicPhrases(line).length).toBeGreaterThan(0);
    }
  });

  it('does not fire on ordinary uses of the word', () => {
    // "third party" is a real thing in the world and not a way of describing
    // the people in a ground.
    expect(forensicPhrases('We moved the data to a third-party tool in March.')).toHaveLength(0);
    expect(forensicPhrases('The launch party was in April.')).toHaveLength(0);
  });
});

describe('language lifted from a filing', () => {
  it('catches the rest of it', () => {
    expect(forensicPhrases('As stated, the deliverable was late.')).not.toHaveLength(0);
    expect(forensicPhrases('This party has opted out of the process.')).not.toHaveLength(0);
    expect(forensicPhrases('Per the account, nothing was agreed.')).not.toHaveLength(0);
  });

  it('leaves plain sentences about the work alone', () => {
    for (const line of [
      'Deadlines slipped in October and nobody flagged it.',
      'He sees success as clearing the queue. She sees it as owning a client end to end.',
      'For the first seven weeks the two of them were working to different ideas of doing well.',
      'Abubakar is running two client accounts end to end, including the calls.',
    ]) {
      expect({ line, hits: forensicPhrases(line) }).toMatchObject({ hits: [] });
    }
  });
});

describe('finding it anywhere in a report', () => {
  it('looks inside the nested parts', () => {
    const found = forensicInReport({
      sharedPicture: 'For the first seven weeks the two of them meant different things by doing well.',
      centralQuestion: 'What names the goal in week one?',
      agreements: ['Two client accounts are running end to end.'],
      divergences: [{ topic: 'Success', evidence: ['Both parties agree the queue was cleared.'] }],
    });
    expect(found?.field).toMatch(/divergences/);
    expect(found?.hit.phrase).toMatch(/both parties/i);
  });

  it('passes a report written like a person wrote it', () => {
    expect(forensicInReport({
      sharedPicture: 'Abubakar moved from clearing tickets to running two client accounts. For the first seven weeks he and Hafsah meant different things by doing well.',
      centralQuestion: 'For the next new hire, what one sentence defines success in the first 30 days?',
      agreements: ['He is doing the job he was hired for.', 'Both would be comfortable with a third account.'],
      divergences: [{ topic: 'What doing well meant', evidence: ['She wanted judgement. He was counting tickets, the only number anyone had named.'] }],
    })).toBeNull();
  });
});
