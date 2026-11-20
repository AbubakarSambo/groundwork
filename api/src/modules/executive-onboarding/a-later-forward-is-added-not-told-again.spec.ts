import { theFirstPicture, type ThePicture } from './the-words';

const picture = (extra: Partial<ThePicture> = {}): ThePicture => ({
  first: 'Amara', forName: null, messages: 1, files: 1, voiceNotes: 0, duplicates: 0, couldNotRead: [], archivesNotOpened: [], insideArchives: [], voiceUnsure: [], subjects: ['March note'],
  workstreams: ['Payments'], open: 10, awaitingDecision: 3, noOwner: 0, unverified: 0, months: ['January', 'February', 'March'], gapMonths: ['April'], hasTeam: true, team: ['Aminu'], ...extra,
});

describe('what she sends after her first picture is added, not told again (Fatima round 3)', () => {
  it('tells the whole picture the first time', () => {
    expect(theFirstPicture(picture())).toContain('I will keep following up on the gaps');
  });
  it('thanks, adds, and says what the record now covers, with no second picture and no second question about the team', () => {
    const text = theFirstPicture(picture({ later: true }));
    expect(text).toContain('I have added one message and one file');
    expect(text).toContain('The record now covers January to March.');
    expect(text).toContain('Nothing yet covers April.');
    expect(text).not.toMatch(/Are other people handling|I will keep following up|The messages are about/);
  });
});
