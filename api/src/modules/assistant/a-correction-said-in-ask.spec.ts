import { isACorrection, whatTheyMean, theCorrectionAnswered } from './a-correction-said-in-ask';

/* Polish round 1 (26 October): Wanjiru's "I did not say that" in Ask was answered "I cannot answer that one yet". */
describe('a correction said in Ask is checked against what they wrote', () => {
  const MON = new Date('2026-10-12T06:30:00Z');
  const turns = [
    { text: 'Njeri will know today when I set up the check-in. She will be told that fee notes must be raised for all reported filings.', at: MON, label: 'Litigation team daily' },
    { text: 'FN-004 has not been paid.', at: new Date('2026-10-13T06:30:00Z'), label: 'Fee notes' },
  ];

  it('knows a correction when it hears one, and not otherwise', () => {
    expect(isACorrection('I did not say that. I do not normally mention Njeri in the check-in.')).toBe(true);
    expect(isACorrection('That is not right, I sent the Kilele proof on Monday.')).toBe(true);
    expect(isACorrection('What is on my list?')).toBe(false);
  });

  it('finds what she did write, and shows her where and when, asking what is true now', () => {
    const found = whatTheyMean('I did not say that. I do not normally mention Njeri in the check-in.', turns);
    expect(found?.sentence).toBe('Njeri will know today when I set up the check-in.');
    expect(theCorrectionAnswered(found, false)).toBe('I checked. On Monday 12 October, in “Litigation team daily”, you wrote: “Njeri will know today when I set up the check-in.” If that is no longer true, tell me what is true now and I will put it on record.');
  });

  it('a quotation nothing of hers holds is taken off; with nothing to go on it asks which line', () => {
    expect(whatTheyMean('I never said "Aisha is my strongest associate"', turns)).toBeNull();
    expect(theCorrectionAnswered(null, true)).toBe('I checked, and nothing you wrote says that. It is taken off, and Groundwork will not say it again.');
    expect(theCorrectionAnswered(null, false)).toMatch(/^Which line is wrong\?/);
  });
});

describe('a change said in Ask is put on record next to what it changes (Aisha, polish round 1)', () => {
  const { aChangeOfTheirs, theChangePutOnRecord, whatTheyMean: mean } = require('./a-correction-said-in-ask');
  const theirs = [
    { text: 'I will reach out to Jamii Clinics for the signed engagement letter on Tuesday.', at: new Date('2026-10-14T09:00:00+03:00'), label: 'Fee notes', checkInId: 'c1', participantId: 'p1' },
    { text: 'Fee note FN-007 is paid.', at: new Date('2026-10-13T09:00:00+03:00'), label: 'Fee notes', checkInId: 'c0', participantId: 'p1' },
  ];
  it('a statement about a line of theirs is their update, and says where it went', () => {
    const said = "I actually don't need to reach out to Jamii Clinics for the letter, the partner has it.";
    expect(aChangeOfTheirs(said)).toBe(true);
    const found = mean(said, theirs, 2);
    expect(found).toMatchObject({ checkInId: 'c1', participantId: 'p1' });
    /* Changed 26 October 2026 (polish round 3): nothing said in Ask is written to the record; Ask shows the line and says how to add the change. */
    expect(theChangePutOnRecord(found, said)).toBe('I checked. On Wednesday 14 October, in “Fee notes”, you wrote: “I will reach out to Jamii Clinics for the signed engagement letter on Tuesday.” What you have just told me is not on your record yet. To put it there, press Add something on your check-in, or say it in your next check-in.');
  });
  it('a question, or a few words, is never taken for an update', () => {
    expect(aChangeOfTheirs('Is FN-007 paid?')).toBe(false);
    expect(aChangeOfTheirs('Jamii Clinics')).toBe(false);
  });
  it('one shared word is not enough to say which line they mean', () => {
    expect(mean('The partner has the letter now.', theirs, 2)).toBeNull();
  });
});

describe('a statement about a request still waiting is answered with where it stands (Grace, polish round 1)', () => {
  const { aWaitingRequestNamed, stillWaitingSaid, theChangePutOnRecord: kept } = require('./a-correction-said-in-ask');
  const mercy = { kind: 'leave', firstName: 'Mercy', thing: 'Mercy’s leave from Monday 26 October to Tuesday 27 October' };
  it('"Mercy\'s leave is already approved." is checked against the record', () => {
    const r = aWaitingRequestNamed("Mercy's leave is already approved.", [mercy]);
    expect(stillWaitingSaid(r)).toBe('I checked, and Mercy’s leave from Monday 26 October to Tuesday 27 October is still waiting for you. Nothing has been decided on it yet. Reply "approve" or "decline" to decide it now.');
  });
  it('a sentence about somebody else, or about nothing decided, is not taken for it', () => {
    expect(aWaitingRequestNamed("Kevin's leave is already approved.", [mercy])).toBeNull();
    expect(aWaitingRequestNamed('Mercy is on leave next week.', [mercy])).toBeNull();
  });
  it('"a done deal" is kept as their word, and asks for what shows it', () => {
    expect(kept({ sentence: 'Mama Pima wants 15 units.', at: new Date('2026-10-12T09:00:00+03:00'), label: 'Sales team, Q4' }, 'Mama Pima is a done deal, 15 units.'))
      .toMatch(/It counts as done once something shows it, such as the payment message or the signed order\. To put it there, press Add something on your check-in, or say it in your next check-in\.$/);
  });
});

describe('nothing typed in Ask is written to the record (polish round 3)', () => {
  it('the Ask service never creates a record line', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'assistant.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/recordEntry\??\.create/);
  });
});
