import { addAnExecutive } from './onboard-an-executive';
import { aWelcomeThatKnowsHerOffice } from './her-welcome';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';

/**
 * BATCH D, R7, D6 AND D20, IN THE RUN'S OWN WORDS. "Good morning. Kabiru said you will help my office this year." read "I cannot answer that one yet. Here is
 * what I can do with ..." on the web. She is met by the assistant her administrator set up, which says for which office, what it is keeping for her, who
 * acts for her and that it writes to nobody without her yes. The office she was given as "Fatima's office" is never "the Fatima's office".
 */
describe('a hello from her', () => {
  it('is met with what was set up for her office', async () => {
    const w = aWorldForOnboarding(new Date('2026-01-05T09:30:00Z'));
    await addAnExecutive(w.prisma, w.ports, addFatima(w, { officeName: "Fatima's office" }));
    await grantADelegate(w.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Maryam Sule', via: 'admin' });
    const said = await aWelcomeThatKnowsHerOffice(w.prisma, { organizationId: ORG, userId: 'u-fatima' });
    console.log(`FATIMA SAYS\nGood morning. Kabiru said you will help my office this year.\nFATIMA READS\n${said}`);
    expect(said).toMatch(/^Hello, Fatima\. Yes, I am the assistant Grace set up for Fatima's office on \d{1,2} [A-Z][a-z]+\./);
    expect(said).toMatch(/I am keeping two pieces of work for you, “/);
    expect(said).toMatch(/Maryam Sule can act for you\./);
    expect(said).toMatch(/What would you like to start with\?$/);
    expect(said).not.toMatch(/the Fatima's office|I cannot answer that one yet|Choose a file/);
  });

  it('says nothing for somebody no administrator set up, so their hello is answered as before', async () => {
    const w = aWorldForOnboarding(new Date('2026-01-05T09:30:00Z'));
    expect(await aWelcomeThatKnowsHerOffice(w.prisma, { organizationId: ORG, userId: 'u-tunde' })).toBeNull();
  });
});
