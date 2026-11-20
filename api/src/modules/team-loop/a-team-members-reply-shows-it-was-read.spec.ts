import { aMindThatReadsMeaning } from './a-mind-that-reads-meaning';
import { aTeamLoopWorld } from './a-world-for-the-team-loop';
import type { TheReplyBasis, WhatTheySaid } from './the-team-mind';

/**
 * FATIMA ROUND 1, GROUP G (issues I-19 and I-20): the loop for the team was thin. Almost every reply was "thank you, I have noted the 2 things" or a request
 * for proof, whatever the person sent. Now the reply is written from what they said and their job, with one precise question at most, kindly said where
 * something is only their word, and the plain reply carries on whenever the writer is off or its words are not safe to send.
 *
 * The writer is stood in for here by one that builds a reply from the words it is given (a-mind-that-reads-meaning.ts is for her words; this one is for
 * the reply). What is tested is everything around it, which is code: what it is told, what it may ask, how often, and what is sent when it fails. The real
 * model is run on a sample of these by api/journey/fatima-fix-a-sanity-with-the-real-model.ts. Every reply a person reads is printed.
 */
const said = (over: Partial<WhatTheySaid>): WhatTheySaid => ({ kind: 'update', commitments: [], outcomes: [], blockers: [], answers: [], vague: null, ...over });

const PEOPLE: { who: string; role: string; words: string; read: Partial<WhatTheySaid>; reply: (b: TheReplyBasis) => string; expectInBasis?: RegExp }[] = [
  { who: 'Amina Yusuf', role: 'government relations', words: 'I am working on getting the Permanent Secretary meeting confirmed. I will try to sort it out sometime soon, hopefully next week.', read: { commitments: [{ text: 'I will try to sort it out sometime soon, hopefully next week', whenSaid: 'sometime soon, hopefully next week' }] },
    reply: () => 'Amina, thank you. You are working on confirming the Permanent Secretary meeting. Which day do you want it to be, so that I can note the date and ask the ministry for it?' },
  { who: 'Amina Yusuf', role: 'policy monitor', words: 'The week 47 report is partial. I will send the full one once the committee clerk replies.', read: { commitments: [{ text: 'I will send the full one once the committee clerk replies', whenSaid: null }] },
    reply: () => 'Amina, thank you. The week 47 report is partial, and you will send the full one when the clerk replies. When did you write to the clerk, so that I can remind you if the reply is late?' },
  { who: 'Amina Yusuf', role: 'executive assistant', words: 'Madam asked me to sort out the Kano trip. I will book the flights tomorrow.', read: { commitments: [{ text: 'I will book the flights tomorrow', whenSaid: 'tomorrow' }] },
    reply: () => 'Amina, thank you. You will book the Kano flights tomorrow. Here is a line you could send the travel desk. Please hold two seats to Kano for Madam and one escort, and tell me the fare by noon.' },
  { who: 'Amina Yusuf', role: 'finance', words: 'The payment has been made to the vendor.', read: { outcomes: [{ commitmentId: null, text: 'The payment has been made to the vendor' }] },
    reply: (b) => `Amina, thank you. You say the vendor payment has been made. ${b.mustSay.some((m) => /only their word/.test(m)) ? 'Right now that is only what you have told me, so please send the transfer message or the bank slip, and I will record it as paid.' : ''}` },
  { who: 'Ibrahim Sule', role: 'protocol', words: 'The delegation visit on the 20th is confirmed for 11:00. The lunch has moved to 1:30.', read: { commitments: [{ text: 'The lunch has moved to 1:30', whenSaid: null }] },
    reply: () => 'Ibrahim, thank you. The visit on the 20th is at 11:00, and lunch has moved to 1:30. Have the two guests who have not replied about lunch confirmed yet?' },
  { who: 'Ibrahim Sule', role: 'reporting analyst', words: 'I flagged that 14 meetings with 6 institutions is not what the log shows. I will correct the draft.', read: { commitments: [{ text: 'I will correct the draft', whenSaid: null }] },
    reply: () => 'Ibrahim, thank you. You say the draft claims 14 meetings with 6 institutions and the log shows fewer. Which count do you want in the corrected draft, so that the two versions agree?' },
  { who: 'Ibrahim Sule', role: 'field liaison', words: 'I delivered the letter to the liaison officer. The Kano road was bad. I need a new letter of introduction.', read: { outcomes: [{ commitmentId: null, text: 'I delivered the letter to the liaison officer' }], blockers: [{ text: 'I need a new letter of introduction', waitingOn: null }] },
    reply: () => 'Ibrahim, thank you. You delivered the letter, and you need a new letter of introduction. Who should sign it, so that I can help you write it?' },
  { who: 'Ibrahim Sule', role: 'approver', words: 'I approved the vehicle payment on 9 November by email.', read: { outcomes: [{ commitmentId: null, text: 'I approved the vehicle payment on 9 November by email' }] },
    reply: () => 'Ibrahim, thank you. You approved the vehicle payment on 9 November. Please forward that email to me, so that the approval is on the record.' },
];

describe('what a team member reads shows that what they sent was read', () => {
  it.each(PEOPLE)('$role', async (p) => {
    const mind = aMindThatReadsMeaning({
      readTheirWords: async () => said(p.read),
      replyToThem: async (b) => { mind.replies.push(b); return p.reply(b); },
    });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    const row = x.t.person.rows.find((r: any) => (r.displayName ?? '').startsWith(p.who.split(' ')[0]) || `${r.givenName} ${r.familyName}` === p.who);
    row.title = p.role;
    const read = await x.theyWrite(p.who, { words: p.words });
    console.log(`${p.who.toUpperCase()} (${p.role}) SENDS\n${p.words}\n\nAND READS\n${read}`);
    expect(read).toBe(p.reply(mind.replies[0]));
    expect(read).not.toMatch(/\[[^\]]*\]/);
    expect((read ?? '').match(/\?/g)?.length ?? 0).toBeLessThanOrEqual(1);
    /* The writer was told who this is, what they said and, where code needs it, what must be said as it is. */
    expect(mind.replies[0]).toMatchObject({ first: p.who.split(' ')[0], role: p.role, text: p.words });
    expect(read).not.toMatch(/I have noted the \d+ things? from what you sent/);
  });

  it('a claim of "done" with nothing to show it is told to the writer as only their word, and the reply says so kindly', async () => {
    const mind = aMindThatReadsMeaning({
      readTheirWords: async () => said({ outcomes: [{ commitmentId: null, text: 'The payment has been made to the vendor' }] }),
      replyToThem: async (b) => { mind.replies.push(b); return 'Amina, thank you. You say the payment has been made. That is only what you have told me so far, so please send the transfer message, and I will record it as paid.'; },
    });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    const read = await x.theyWrite('Amina Yusuf', { words: 'The payment has been made to the vendor.' });
    expect(mind.replies[0].mustSay.join(' ')).toMatch(/only their word/);
    expect(read).toMatch(/only what you have told me/);
    expect(read).not.toMatch(/lied|wrong|false|do not believe/i);
  });

  it('where the code decided on the one question, the writer is told to ask exactly that, and never a second', async () => {
    const mind = aMindThatReadsMeaning({
      readTheirWords: async () => said({ vague: { about: 'the permit', how: 'ongoing' } }),
      replyToThem: async (b) => { mind.replies.push(b); return `Amina, thank you. What has changed on the permit since you last told me?`; },
    });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    await x.theyWrite('Amina Yusuf', { words: 'The permit is ongoing.' });
    expect(mind.replies[0].mustSay[0]).toMatch(/Ask them exactly this one thing/);
    expect(mind.replies[0].mustSay[0]).toContain('What has changed on it since you last told me');
  });

  it('a question of the writer’s own is allowed once for a batch, and never again for it', async () => {
    const mind = aMindThatReadsMeaning({ readTheirWords: async () => said({ commitments: [{ text: 'I will go next week', whenSaid: 'next week' }] }), replyToThem: async () => 'Amina, thank you. Which day next week?' });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    /* The database refuses a second row for the same person, key and asker (information_gaps' unique index); the small world is told to as well. */
    const make = x.t.informationGap.create;
    x.t.informationGap.create = async (a: any) => { if (x.t.informationGap.rows.some((r: any) => ['principalUserId', 'gapKey', 'askedOfEmail'].every((k) => r[k] === a.data[k]))) throw new Error('Unique constraint failed'); return make(a); };
    const contact = x.contact('Amina Yusuf');
    const first = await (x.service as any).aSpecificReply({ batchId: 'b-1', contact, items: [{ text: 'I will go next week', isDocument: false }], done: { reply: 'plain', wrote: { commitments: 1, kept: 0, blockers: 0, answered: [] }, asked: null, readings: [] }, now: new Date() });
    const again = await (x.service as any).aSpecificReply({ batchId: 'b-1', contact, items: [{ text: 'I will go next week', isDocument: false }], done: { reply: 'plain', wrote: { commitments: 1, kept: 0, blockers: 0, answered: [] }, asked: null, readings: [] }, now: new Date() });
    expect(first).toBe('Amina, thank you. Which day next week?');
    expect(again).toBeNull();
  });

  it('words that are not safe to send (a blank in brackets, two questions) give way to the plain reply', async () => {
    for (const bad of ['Dear [Name], thank you.', 'Which day? And which room?', '']) {
      const mind = aMindThatReadsMeaning({ readTheirWords: async () => said({ commitments: [{ text: 'I will send the letter on Monday', whenSaid: 'on Monday' }] }), replyToThem: async () => bad });
      const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
      (x.service as any).mind = mind;
      const read = await x.theyWrite('Amina Yusuf', { words: 'I will send the letter on Monday.' });
      expect(read).toBe('Amina, thank you. I have noted the one thing from what you sent, and I will not ask you for it again.');
    }
  });

  it('with the writer off, the plain reply is what they read, as before', async () => {
    const mind = aMindThatReadsMeaning({ readTheirWords: async () => said({ commitments: [{ text: 'I will send the letter on Monday', whenSaid: 'on Monday' }] }), replyToThem: async () => null });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    expect(await x.theyWrite('Amina Yusuf', { words: 'I will send the letter on Monday.' })).toBe('Amina, thank you. I have noted the one thing from what you sent, and I will not ask you for it again.');
  });
});

describe('a quoted claim is never cut in the middle of a word', () => {
  it('Grace’s approval is quoted whole, not as "by emai"', async () => {
    const claim = 'I approved the Northgate vehicle payment for NGN 4,580,000 on 9 November by email to Hauwa';
    const mind = aMindThatReadsMeaning({ readTheirWords: async () => said({ outcomes: [{ commitmentId: null, text: claim }] }), replyToThem: async () => null });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    const read = await x.theyWrite('Amina Yusuf', { words: `${claim}.` });
    console.log(`SHE READS\n${read}`);
    expect(read).toContain(`You said “${claim}” is done.`);
    expect(read).not.toMatch(/by emai”/);
  });
});

describe('questions a team member asks about other people are answered plainly, and nothing is passed on', () => {
  it.each(['What did Hauwa tell you about the payment?', 'What did the others say about me?', 'How am I doing compared with the rest of the team?', 'Has Ibrahim sent his report?'])('%s', async (question) => {
    const mind = aMindThatReadsMeaning({ readTheirWords: async () => ({ kind: 'about_others', commitments: [], outcomes: [], blockers: [], answers: [], vague: null }) });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    const read = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: question });
    console.log(`AMINA ASKS "${question}" AND READS\n${read}`);
    expect(read).toBe('Amina, I do not tell anybody what somebody else has sent me, and I do not say how anyone is doing. I can tell you what I have noted from you, or help with your own work.');
  });

  it('a letter that comes back with a bracketed blank is not sent as help: the one thing it needs is asked instead', async () => {
    const mind = aMindThatReadsMeaning({
      readTheirWords: async () => ({ kind: 'help', commitments: [], outcomes: [], blockers: [], answers: [], vague: null }),
      helpThem: async () => 'Dear [Name of Director],\n\nI hope this letter finds you well.\n\n[Your Name]',
    });
    const x = await aTeamLoopWorld({ mind, now: new Date('2026-11-11T10:00:00Z') });
    (x.service as any).mind = mind;
    const read = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me write a short letter to the Director of Trade Promotion confirming the visit.' });
    console.log(`AMINA READS\n${read}`);
    expect(read).toBe('Amina, I can help with that. Tell me who it is for and what you want it to achieve, and I will write a first version for you to change.');
  });
});
