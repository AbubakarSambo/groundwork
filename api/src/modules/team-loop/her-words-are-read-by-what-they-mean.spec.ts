import { aMindThatReadsMeaning } from './a-mind-that-reads-meaning';
import { aTeamLoopWorld } from './a-world-for-the-team-loop';
import { hearHer } from '../executive-onboarding/her-words';
import { ORG } from '../executive-onboarding/a-world-for-onboarding';
import { readARequestPlainly } from '../principal-work/the-work-reader';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';

/**
 * FATIMA ROUND 1, GROUP B: "UNDERSTAND, DON'T MATCH" (issues I-02, I-05, I-07 and I-08).
 *
 * Her words are read by what they mean behind the swappable seam (the-team-mind.ts). The model is stood in for by a reader that works out meaning from the
 * words (a-mind-that-reads-meaning.ts), so everything after the reading runs for real: who is written to, what is kept, what waits for her yes. Every text
 * she reads is printed. The real model is run on a sample by api/journey/fatima-fix-a-sanity-with-the-real-model.ts.
 *
 * A work reader that, as the model did in round 1, takes any mention of "updates" as "give me my update now" is wired in front of the instruction
 * on purpose: the standing instruction has to win over it by being read first, not by luck.
 */
const NOW = new Date('2026-11-11T10:00:00Z');

async function aWorld() {
  const mind = aMindThatReadsMeaning();
  const x = await aTeamLoopWorld({ mind, now: NOW });
  (x.service as any).mind = mind;
  const ports: any = {
    ...x.w.ports,
    mind,
    theInstruction: (a: any) => x.service.hearAnInstruction(a),
    /* The work reader as it misread in round 1: any "update" is her weekly update, now. */
    theWork: async (a: any) => (/update|summary/i.test(a.message) && !readARequestPlainly(a.message)?.kind?.startsWith('standing') ? 'HERE IS YOUR UPDATE NOW.' : null),
  };
  const hear = (message: string, userId = 'u-fatima') => hearHer(x.prisma, ports, { organizationId: ORG, userId, message, now: NOW });
  return { ...x, hear, mind };
}

const proposedNames = (x: any) => x.t.outreachContact.rows.filter((c: any) => c.state === 'proposed').map((c: any) => c.name);
const introducedNames = (x: any) => x.t.outreachContact.rows.filter((c: any) => c.state === 'introduced').map((c: any) => c.name);

const YES = ['Yes, go ahead.', 'Yes please.', 'Sure, go ahead.', 'Please do.', "That's fine, carry on.", 'Okay, do it.', 'Yes thanks', 'Absolutely, please write to them.', 'Go ahead please', 'Yep, fine.', 'Yes, that is right.', 'Yes, do go ahead.'];
const NOT_A_YES = ['Yes, but not Musa.', 'What will you say to them?', 'Not yet.', 'No, leave it.', 'Wait, I need to check first.', 'Yes, and also write to Hauwa at hauwa@example.com.'];

describe('her yes to writing to her team is understood by what it means', () => {
  it.each(YES)('%s', async (said) => {
    const x = await aWorld();
    const question = await x.hear('Musa Ibrahim, field liaison, musa@example.com');
    expect(question).toBe('Shall I write to Musa Ibrahim, field liaison (musa@example.com), tell them you asked me to, and ask what they are working on?'.replace('tell them you asked me to', 'tell them you asked me to'));
    const before = x.w.sent.length;
    const back = await x.hear(said);
    console.log(`SHE SAYS "${said}" AND READS\n${back}`);
    expect(back).toMatch(/^Thank you\. I have written to Musa Ibrahim/);
    expect(introducedNames(x)).toContain('Musa Ibrahim');
    expect(x.w.sent.length).toBeGreaterThan(before);
  });

  it.each(NOT_A_YES)('%s writes to nobody', async (said) => {
    const x = await aWorld();
    await x.hear('Musa Ibrahim, field liaison, musa@example.com');
    const before = x.w.sent.length;
    const back = await x.hear(said);
    console.log(`SHE SAYS "${said}" AND READS\n${back}`);
    expect(introducedNames(x)).not.toContain('Musa Ibrahim');
    expect(x.w.sent.length).toBe(before);
  });

  it('a "no" in other words is a no, and nobody is written to', async () => {
    for (const said of ['No thank you.', 'Nope.', "No, don't write to them."]) {
      const x = await aWorld();
      await x.hear('Musa Ibrahim, field liaison, musa@example.com');
      expect(await x.hear(said)).toBe('Understood. I have not written to anyone, and I will not unless you ask me to.');
    }
  });

  it('with no model at all, the plain words still work and nothing else is guessed', async () => {
    const x = await aWorld();
    const ports: any = { ...x.w.ports, mind: null };
    await hearHer(x.prisma, ports, { organizationId: ORG, userId: 'u-fatima', message: 'Musa Ibrahim, musa@example.com, my team', now: NOW });
    expect(await hearHer(x.prisma, ports, { organizationId: ORG, userId: 'u-fatima', message: 'Yes, go ahead.', now: NOW })).toBeNull();
    expect(await hearHer(x.prisma, ports, { organizationId: ORG, userId: 'u-fatima', message: 'Yes please.', now: NOW })).toMatch(/^Thank you\. I have written to Musa Ibrahim/);
  });
});

describe('the team she names is read by who is who, whatever the layout', () => {
  const cases: { name: string; said: string; proposed: string[]; reads?: RegExp[]; not?: RegExp[] }[] = [
    { name: 'a job between the name and the number', said: 'My team:\nMusa Ibrahim, field liaison, +2348010000206\nAminu Sule, government relations, aminu@example.com, +2348010000201', proposed: ['Musa Ibrahim', 'Aminu Sule'], reads: [/Musa Ibrahim, field liaison \(\+2348010000206\)/, /Aminu Sule, government relations \(aminu@example\.com\)/] },
    { name: 'one person in a plain sentence', said: 'Aminu Sule handles government relations. His number is +2348010000201 and his email is aminu@example.com.', proposed: ['Aminu Sule'], reads: [/Aminu Sule, government relations/] },
    { name: 'a job in brackets', said: 'Musa Ibrahim (field liaison) +2348010000206', proposed: ['Musa Ibrahim'], reads: [/Musa Ibrahim, field liaison/] },
    { name: 'dashes', said: 'Obiora Nnamdi - National Assembly monitor - obiora@example.com', proposed: ['Obiora Nnamdi'] },
    { name: 'a sentence with two people and semicolons', said: 'The team: Hauwa Lawal in finance, hauwa@example.com; Tunde Bakare in protocol, tunde@example.com', proposed: ['Hauwa Lawal', 'Tunde Bakare'] },
    { name: 'a person added with a short remark', said: 'Please also add Kemi Adebayo, she is our reporting analyst, kemi@example.com', proposed: ['Kemi Adebayo'] },
    { name: 'a name, a number with spaces and an address together', said: 'Hauwa Lawal +234 801 000 0203 hauwa@example.com', proposed: ['Hauwa Lawal'] },
    { name: 'her own assistant at the end of the list is not a team member', said: 'Grace Ogunleye, legal and compliance, grace@example.com, +2348010000207\nZainab Musa is my assistant, zainab@example.com', proposed: ['Grace Ogunleye'], not: [/Zainab/] },
    { name: 'a job first, and a number said as a sentence', said: 'My field liaison is Musa Ibrahim and you can reach him on +2348010000206.', proposed: ['Musa Ibrahim'] },
    { name: 'a plain name and number', said: 'Musa Ibrahim, +2348010000206', proposed: ['Musa Ibrahim'] },
  ];
  it.each(cases)('$name', async (c) => {
    const x = await aWorld();
    const back = await x.hear(c.said);
    console.log(`SHE WRITES\n${c.said}\n\nSHE READS\n${back}`);
    expect(proposedNames(x)).toEqual(c.proposed);
    for (const r of c.reads ?? []) expect(back).toMatch(r);
    for (const r of c.not ?? []) expect(back).not.toMatch(r);
    expect(back).not.toMatch(/could not tell whose/);
  });

  it('one person who cannot be read is asked about once, and the others are not dropped', async () => {
    const x = await aWorld();
    const back = await x.hear('My team:\nMusa Ibrahim, field liaison, 080 12\nAminu Sule, government relations, aminu@example.com');
    console.log(`SHE READS\n${back}`);
    expect(proposedNames(x)).toEqual(['Aminu Sule']);
    expect(back).toContain('Shall I write to Aminu Sule, government relations (aminu@example.com)');
    expect(back).toContain('I could not find a number or an email address for Musa Ibrahim. Please send it once more.');
  });

  it('a contact with no name is asked about once, and does not fail the list', async () => {
    const x = await aWorld();
    const back = await x.hear('My team: Aminu Sule, aminu@example.com, and +2348010000299');
    console.log(`SHE READS\n${back}`);
    expect(proposedNames(x)).toEqual(['Aminu Sule']);
    expect(back).toContain('I could not tell whose number that is. Please tell me the name, and the number once more.');
  });

  it('only words she wrote count: a number the reader invents is not used', async () => {
    const x = await aWorld();
    (x.mind as any).readThePeople = async () => [{ name: 'Musa Ibrahim', role: 'field liaison', email: null, phone: '+2348099999999' }];
    const back = await x.hear('Musa Ibrahim handles the field, reach him on +2348010000206');
    expect(proposedNames(x)).toEqual([]);
    expect(back).toBe('I could not find a number or an email address for Musa Ibrahim. Please send it once more.');
  });

  it('the job she gave goes on their entry once she says yes, and nowhere before', async () => {
    const x = await aWorld();
    await x.hear('Musa Ibrahim, field liaison, musa@example.com');
    expect(x.t.person.rows.find((p: any) => p.email === 'musa@example.com')).toBeUndefined();
    await x.hear('Yes, go ahead.');
    expect(x.t.person.rows.find((p: any) => p.email === 'musa@example.com')).toMatchObject({ title: 'field liaison' });
  });
});

describe('a standing instruction is understood in any words, and is read before the briefings', () => {
  const COLLECT: [string, number][] = [
    ["Get everyone's updates and email me Friday.", 5],
    ['Ask the team for their updates on Thursday and email me the summary on Friday morning.', 5],
    ['Please collect what everyone is working on and send it to me on Monday.', 1],
    ['Every Friday, tell me what my people have been doing.', 5],
    ['Chase the team for updates and send me a summary on Wednesday.', 3],
    ["Can you pull together everyone's progress and email it to me by Friday?", 5],
    ['I want a summary from the whole team each Thursday.', 4],
    ["Gather the team's updates and tell me on Friday.", 5],
  ];
  it.each(COLLECT)('%s', async (said, day) => {
    const x = await aWorld();
    const back = await x.hear(said);
    console.log(`SHE SAYS "${said}" AND READS\n${back}`);
    expect(back).toMatch(/^Fatima, I understand\. I will ask .* for their updates /);
    expect(back).toMatch(/Shall I go ahead\?$/);
    expect(back).not.toMatch(/UPDATE NOW/);
    const job = x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:'));
    expect(job).toMatchObject({ state: 'proposed', details: { kind: 'collect_and_report', reportWeekday: day } });
    expect(x.w.sent).toHaveLength(0);
  });

  it.each(['Handle this with the team and come back when ready.', "Deal with the Kano matter with everyone and let me know when it is sorted.", "Sort out the permit with the team and tell me when it's done."])('%s', async (said) => {
    const x = await aWorld();
    const back = await x.hear(said);
    console.log(`SHE SAYS "${said}" AND READS\n${back}`);
    /* Batch D, R5: said back as who on her record is written to, how, and about what, in place of "I understand. I will ask ... now". */
    expect(back).toMatch(/^Fatima, I will write to 2 people on your record now, .* I will tell you as soon as they have answered, or after three days/);
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:'))).toMatchObject({ state: 'proposed', details: { kind: 'handle_with_team' } });
  });

  it.each(['What is outstanding?', 'Give me my day.', 'Send me the weekly update now.', 'Thank you.', 'What did the team say about the permit this week?'])('%s is not an instruction', async (said) => {
    const x = await aWorld();
    const back = await x.hear(said);
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'))).toHaveLength(0);
    expect(back ?? '').not.toMatch(/^Fatima, I understand/);
  });

  it.each(YES)('her yes in the words %s sets it going, and only her yes does', async (yes) => {
    const x = await aWorld();
    await x.hear("Get everyone's updates and email me Friday.");
    expect(await x.hear(yes)).toBe('Done. I will do it as I said, and I will tell you if anything stops me.');
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).state).toBe('active');
  });

  it('somebody who acts for her cannot confirm it, whatever words they use', async () => {
    const x = await aWorld();
    await grantADelegate(x.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    await x.hear("Get everyone's updates and email me Friday.");
    const back = await x.hear('Yes, go ahead.', 'u-amina');
    expect(back).toBe('Only Fatima can give me an instruction like that.');
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).state).toBe('proposed');
  });

  it('a matter handed to the team with no owner and no day is asked about once, in one question, and nothing is made', async () => {
    const x = await aWorld();
    await grantADelegate(x.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    const back = await x.hear("Madam said we should sort out the Kano thing before the visit and tell the Governor's office. Not sure who is doing what. Can you help?", 'u-amina');
    console.log(`AMINA READS\n${back}`);
    expect(back).toBe('Amina, I can follow up with the team on “the kano thing”. Who should take it, and by which day should it be done?');
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'))).toHaveLength(0);
  });
});
