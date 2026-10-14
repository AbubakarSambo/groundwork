import { stripCloseMarker } from '../conversation/prompt-library';
import { forHumans } from '../presentation/outbound';
import { namesOffFor } from './the-weekly-report.service';
import { withNames } from './party-labels';
import { dateSentence } from '../documents/what-a-document-holds';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 13: what reached the screen.
 */
describe('no marker reaches a screen', () => {
  it('"Speak soon. [[]]" loses the empty brackets', () => {
    expect(stripCloseMarker('Your report is ready now. Speak soon. [[]]').text).toBe('Your report is ready now. Speak soon.');
    expect(forHumans('Asking David for the documents by Wednesday morning. [[]]')).toBe('Asking David for the documents by Wednesday morning.');
  });
});

describe('a surname in a case name is the case, not the person', () => {
  const parties = [
    { id: 'p-njeri', nameGiven: null, user: { firstName: 'Njeri', lastName: 'Kamau' } },
    { id: 'p-brian', nameGiven: null, user: { firstName: 'Brian', lastName: 'Kiptoo' } },
  ];
  const labels = new Map([['p-njeri', 'the initiator'], ['p-brian', 'participant A']]);
  const off = namesOffFor(parties, labels);

  it('"Kamau v. Apex" stays a case when names come off, and Njeri reads it as written', () => {
    const kept = off('Confirm the actual date of the filing. The submission date of Kamau v. Apex is not on record. Njeri Kamau said Brian files it.');
    expect(kept).toBe('Confirm the actual date of the filing. The submission date of Kamau v. Apex is not on record. the initiator said participant A files it.');
    const read = withNames(kept, new Map([['the initiator', 'Njeri Kamau'], ['participant A', 'Brian Kiptoo']]), ['the initiator', 'participant A'], { viewerLabel: 'the initiator' });
    expect(read).toContain('The submission date of Kamau v. Apex is not on record.');
    expect(read).not.toContain('you v.');
  });

  it('"the Kamau defence" is the matter, and a surname on its own elsewhere is still the person', () => {
    expect(off('Brian filed the Kamau defence.')).toBe('participant A filed the Kamau defence.');
    expect(off('Kamau asked for the comments.')).toBe('the initiator asked for the comments.');
  });
});

describe('a date a document names as a date is said plainly', () => {
  it('"Date of draft" is not said as "the date it sets for Date of draft"', () => {
    expect(dateSentence({ what: 'Date of draft', when: '22 October 2026' })).toBe('It gives the date of draft as 22 October 2026.');
    expect(dateSentence({ what: 'The hearing', when: '3 November' })).toBe('The date it sets for the hearing is 3 November.');
  });
});

describe('one quotation mark at a time', () => {
  it("Aisha's words are quoted once", () => {
    expect(forHumans('You defined success as ’’’Getting filings in on time.’’’')).toBe('You defined success as “Getting filings in on time.”');
    expect(forHumans("She said 'it is done' and left.")).toContain('it is done');
  });
});
