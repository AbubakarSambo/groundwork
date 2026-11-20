import { addAnExecutive } from './onboard-an-executive';
import { keepWhatWasForwarded, QUIET_FOR_MS, type AnArrival } from './the-intake';
import { answerTheQuietBatches } from './the-first-picture';
import { theFirstPicture, type ThePicture } from './the-words';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';

/**
 * FATIMA ROUND 4, UNTRUE LINES 1 AND 2 (N27, N25). The first picture said "I have already asked Sanusi Kabir and Bashir Lawal" when nothing had reached either of them, and
 * "The record now covers January to December" when no December note had come. "Asked" is said only of a person something reached (the delivery rows), and what the notes cover
 * is read from the monthly notes she forwarded, with the month that has none named. Everything a person reads is printed.
 */
const b = (s: string) => Buffer.from(s, 'utf8');
const note = (month: string, line: string) => `Abuja office activity note, ${month} 2026\n\n${line}`;

async function fatimaIsAdded() {
  const w = aWorldForOnboarding(new Date('2026-11-10T09:00:00Z'));
  await addAnExecutive(w.prisma, w.ports, addFatima(w));
  w.sent.length = 0;
  const arrival = (over: Partial<AnArrival> = {}): AnArrival => ({ organizationId: ORG, principalUserId: 'u-fatima', fromUserId: 'u-fatima', fromAddress: 'fatimawale@example.com', channel: 'email', providerId: null, subject: null, body: null, receivedAt: w.now, files: [], beyondTheLimit: 0, now: w.now, ...over });
  return { w, arrival };
}

describe('the first picture says "asked" only of people something reached', () => {
  it('names the person who was written to as asked, and the person nothing reached as not asked', async () => {
    const { w, arrival } = await fatimaIsAdded();
    w.t.outreachContact.rows.push(
      { id: 'oc-a', organizationId: ORG, principalUserId: 'u-fatima', state: 'introduced', kind: 'team', name: 'Amina Yusuf', email: 'amina@example.com', phone: null, contactKey: 'amina@example.com' },
      { id: 'oc-s', organizationId: ORG, principalUserId: 'u-fatima', state: 'introduced', kind: 'team', name: 'Sanusi Kabir', email: null, phone: '+2348010000841', contactKey: '2348010000841' },
    );
    w.t.introductionDelivery.rows.push(
      { id: 'd1', organizationId: ORG, principalUserId: 'u-fatima', audience: 'team', recipient: 'amina@example.com', channel: 'email', state: 'sent', sendKey: 'k1' },
      { id: 'd2', organizationId: ORG, principalUserId: 'u-fatima', audience: 'team', recipient: '+2348010000841', channel: 'whatsapp', state: 'held', sendKey: 'k2' },
    );
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'm1', subject: 'Fwd: payments', body: 'Payments for the quarter.', files: [{ fileName: 'Payments.csv', mimeType: 'text/csv', bytes: b('payee,amount\nA,100') }] }));
    await answerTheQuietBatches(w.prisma, w.ports, new Date(w.now.getTime() + QUIET_FOR_MS + 1000), async () => 'assistant@myground.work');
    const text = w.sent[0].text;
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('I have already asked Amina Yusuf.');
    expect(text).toContain('I have not asked Sanusi Kabir yet, because nothing has reached them.');
    expect(text).not.toMatch(/already asked[^.]*Sanusi/);
  });
});

describe('what the notes cover is read from the monthly notes, and the month with none is named', () => {
  it('a payments tracker dated across the year and an email about December do not make those months covered by a note', async () => {
    const { w, arrival } = await fatimaIsAdded();
    const file = (name: string, text: string) => ({ fileName: name, mimeType: 'text/plain', bytes: b(text) });
    await keepWhatWasForwarded(w.prisma, w.intake, arrival({ providerId: 'm1', subject: 'Fwd: notes', body: 'The notes I have.', files: [
      file('note-jan.txt', note('January', 'The office met the Federal Ministry of Industry about local content guidelines.')),
      file('note-feb.txt', note('February', 'A briefing note was sent to the Senate Committee clerk on 19 February.')),
      file('note-apr.txt', note('April', 'The office hosted a delegation lunch for guests in April.')),
      file('tracker.txt', 'Payments tracker. 2026-03-12 vehicle hire 4,580,000. 2026-06-02 caterer 120,000. 2026-12-01 printing 90,000.'),
      file('chain.txt', 'From: Ibrahim Danjuma\nTo: Folake\nSubject: Local Content Bill hearing\nDate: 2 December 2026\n\nThe committee asked for written views by 15 December.'),
    ] }));
    await answerTheQuietBatches(w.prisma, w.ports, new Date(w.now.getTime() + QUIET_FOR_MS + 1000), async () => 'assistant@myground.work');
    const text = w.sent[0].text;
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('The notes I have so far cover January, February and April.');
    expect(text).toMatch(/I have no note for March/);
    expect(text).not.toMatch(/January to December|cover[^.]*December/);
  });
});

describe('a later forward is thanked, added, and does not change the report she already has', () => {
  const picture = (extra: Partial<ThePicture> = {}): ThePicture => ({
    first: 'Folake', forName: null, messages: 1, files: 1, voiceNotes: 0, duplicates: 0, couldNotRead: [], archivesNotOpened: [], insideArchives: [], voiceUnsure: [], subjects: ['the March note'],
    workstreams: [], open: 10, awaitingDecision: 3, noOwner: 0, unverified: 0, months: ['January', 'February', 'March'], monthsAreNotes: true, gapMonths: ['April'], hasTeam: true, team: ['Aminu'], later: true, ...extra,
  });
  it('says what the notes cover, names the month with none, and says the report has to be asked for again', () => {
    const text = theFirstPicture(picture({ draftVersion: 3 }));
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('The notes I have cover January to March. I have no note for April.');
    expect(text).toContain('Version 3 of the report does not include them yet. Say “update the draft” and I will make a new version. That does not approve anything.');
  });
  it('says nothing about a report when there is none', () => {
    expect(theFirstPicture(picture())).not.toMatch(/Version \d of the report/);
  });
});
