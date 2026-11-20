import { WHAT_WAS_DONE_FOR_THE_TEAM } from './the-words';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';
import { addAnExecutive } from './onboard-an-executive';
import { hearHer } from './her-words';

/**
 * Fatima round 1, H1: she was told "I have written to Musa" while his only message, a WhatsApp introduction, was held and he has no email.
 * What she is told about a send is read from the delivery state, and "written" is said only of a person something really went to.
 */
describe('what she is told about the introductions', () => {
  it('says written only where something went, and held where it is held (plain words)', () => {
    const told = WHAT_WAS_DONE_FOR_THE_TEAM([
      { name: 'Aminu Sule', email: 'sent', whatsapp: 'held' },
      { name: 'Musa Ibrahim', email: null, whatsapp: 'held' },
      { name: 'Grace Ogunleye', email: 'sent', whatsapp: null },
    ]);
    console.log(`WHAT FATIMA READS\n${told}`);
    expect(told).toBe('Thank you. I have written to Aminu Sule and Grace Ogunleye, each with their own message. The WhatsApp message to Aminu Sule has to wait. WhatsApp does not let me message a new number first, so it goes when they write to me, and they have the email. The WhatsApp message to Musa Ibrahim has to wait. WhatsApp does not let me message a new number first, so it goes when they write to me. I have no email address for Musa Ibrahim. Nothing has reached Musa Ibrahim yet. I will tell you what they say, and I will not ask you again.');
    expect(told).not.toMatch(/written to[^.]*Musa/);
  });

  it('a mail held for the morning is held, not written', () => {
    expect(WHAT_WAS_DONE_FOR_THE_TEAM([{ name: 'Hauwa Lawal', email: 'held', whatsapp: null }])).toBe('Thank you. The email to Hauwa Lawal is held until the morning. Nothing has reached Hauwa Lawal yet. I will tell you what they say, and I will not ask you again.');
  });

  it('through the real handler: a person with only a number, whose WhatsApp is held, is not said to have been written to', async () => {
    const w = aWorldForOnboarding(new Date('2026-11-11T10:00:00Z'));
    await addAnExecutive(w.prisma as any, w.ports, addFatima(w));
    const says = (m: string) => hearHer(w.prisma as any, w.ports, { organizationId: ORG, userId: 'u-fatima', message: m, now: w.now });
    await says('My team is Musa Ibrahim, +234 801 000 0206.');
    const done = await says('Yes please.');
    console.log(`WHAT FATIMA READS\n${done}`);
    expect(done).not.toMatch(/I have written to/);
    expect(done).toMatch(/The WhatsApp message to Musa Ibrahim has to wait\. WhatsApp does not let me message a new number first, so it goes when they write to me\./);
    expect(done).toMatch(/Nothing has reached Musa Ibrahim yet\./);
  });
});
