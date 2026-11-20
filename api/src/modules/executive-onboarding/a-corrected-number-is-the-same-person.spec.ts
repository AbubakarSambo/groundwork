import { addAnExecutive } from './onboard-an-executive';
import { hearHer } from './her-words';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';

/**
 * FIX PLAN 16 NOVEMBER, GROUP 3 (Fatima round 4, issue 1): a correction of two people's numbers turned them into "outside your office", nothing was sent, and their own
 * messages were refused as an unknown number. A corrected number is the same person with a new number: who somebody is, and whether they are on the team, is decided once,
 * from the roster by address or by number, and a person she has already named keeps what they were. Every text she reads is printed.
 */
async function fatimaHasNamedTwoPeople() {
  const w = aWorldForOnboarding();
  await addAnExecutive(w.prisma, w.ports, addFatima(w));
  w.sent.length = 0;
  const says = (message: string) => hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-fatima', message, now: w.now });
  await says('My team is Sanusi Bello, +234 803 555 0101 and Bashir Musa, +234 803 555 0202.');
  return { w, says };
}

describe('a corrected number', () => {
  it('before they were introduced: the same two people stay on the team, and the next question is the team question, not the "outside your office" one', async () => {
    const { w, says } = await fatimaHasNamedTwoPeople();
    const q = await says('Sorry, the numbers were wrong. Sanusi Bello is +234 803 555 0111 and Bashir Musa is +234 803 555 0222.');
    console.log(`FATIMA READS ${q}`);
    expect(q).not.toMatch(/outside your office/);
    expect(w.t.outreachContact.rows.filter((c: any) => c.kind === 'external')).toHaveLength(0);
    expect(w.t.outreachContact.rows.every((c: any) => c.kind === 'team')).toBe(true);
  });

  it('after they were introduced: the roster takes the new number, so their own messages are known from it, and nobody is written to twice', async () => {
    const { w, says } = await fatimaHasNamedTwoPeople();
    await says('Yes');
    const before = w.sent.length;
    const said = await says('Sorry, the numbers were wrong. Sanusi Bello is +234 803 555 0111 and Bashir Musa is +234 803 555 0222.');
    console.log(`FATIMA READS ${said}`);
    expect(said).toBe('I have changed the number for Sanusi Bello and Bashir Musa. They are still on your team, and I will know their messages from the new number.');
    expect(w.t.person.rows.find((p: any) => p.displayName === 'Sanusi Bello').phone).toBe('+2348035550111');
    expect(w.t.person.rows.find((p: any) => p.displayName === 'Bashir Musa').phone).toBe('+2348035550222');
    expect(w.t.person.rows.filter((p: any) => /Sanusi|Bashir/.test(p.displayName))).toHaveLength(2);
    expect(w.t.outreachContact.rows.map((c: any) => [c.name, c.kind, c.state])).toEqual([['Sanusi Bello', 'team', 'introduced'], ['Bashir Musa', 'team', 'introduced']]);
    expect(w.sent.length).toBe(before);
  });

  it('people on the roster by number are on the team even when she gives only the numbers and no cue', async () => {
    const w = aWorldForOnboarding();
    await addAnExecutive(w.prisma, w.ports, addFatima(w));
    for (const [id, name, phone] of [['p-sanusi', 'Sanusi Bello', '+2348035550101'], ['p-bashir', 'Bashir Musa', '+2348035550202']]) w.t.person.rows.push({ id, organizationId: ORG, externalId: id, sourceSystem: 'scim', userName: `${id}@example.com`, displayName: name, email: `${id}@example.com`, phone, active: true });
    const q = await hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-fatima', message: 'Please write to Sanusi Bello, +234 803 555 0101 and Bashir Musa, +234 803 555 0202.', now: w.now });
    console.log(`FATIMA READS ${q}`);
    expect(q).not.toMatch(/outside your office/);
    expect(w.t.outreachContact.rows.map((c: any) => c.kind)).toEqual(['team', 'team']);
  });

  it('a stranger at another organisation is still outside it (the safe direction is kept)', async () => {
    const w = aWorldForOnboarding();
    await addAnExecutive(w.prisma, w.ports, addFatima(w));
    const q = await hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-fatima', message: 'My team is Amina Yusuf, amina@example.com. The Permanent Secretary is Kemi Ade, kemi@other-firm.org.', now: w.now });
    expect(q).toMatch(/outside your office/);
  });
});
