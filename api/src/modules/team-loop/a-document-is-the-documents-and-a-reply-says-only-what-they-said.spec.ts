import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { theReadingMadeSafe, whatTheyAreToldTheySaidIsTheirs, READ_PROMPT, REPLY_PROMPT, HELP_PROMPT, type TheReplyBasis } from './the-team-mind';
import { SHOWS_IT_PROMPT } from './which-document-shows-it';

/**
 * FATIMA ROUND 4, UNTRUE LINES 7 TO 10 (N29) AND BASHIR'S HELP LOOP (N30). A reply built from documents told a person "You confirmed the Permanent Secretary meeting date" when he
 * had only said he would, put a sentence from an attached document on the sender's list as his promise, quoted "Here is the signed copy." as something said to be done, and said
 * "exactly as you sent it" of a file a colleague had sent first. Each line keeps whose it is: the person's own words, a document's, or a colleague's. Every reply is printed.
 */
const work = { first: 'Hadiza', commitments: [], openQuestions: [] };

describe('a sentence in a document is the document\'s, never the sender\'s promise', () => {
  const raw = { kind: 'update', commitments: [{ text: 'Please pay after the invoice is stamped' }] };
  it('read from a document, it is put on nobody\'s list', () => {
    expect(theReadingMadeSafe(raw, 'Supplier terms. Please pay after the invoice is stamped.', true, work)!.commitments).toEqual([]);
  });
  it('the same words in the person\'s own message are their promise', () => {
    expect(theReadingMadeSafe(raw, 'Please pay after the invoice is stamped.', false, work)!.commitments).toHaveLength(1);
  });
});

describe('"you said" and "you confirmed" find that person\'s own line', () => {
  const theirs = 'I will confirm the Permanent Secretary date. Here is the signed copy.';
  it.each([
    ['You confirmed the Permanent Secretary meeting date as the week of 16 November.', false],
    ['You said "The invoice is stamped" is done. What was it?', false],
    ['You said you will confirm the Permanent Secretary date. Which day do you expect to confirm it?', true],
    ['You promised to send the Kano letter by Friday.', false],
    ['Thank you. The document says the vehicle hire was paid.', true],
    ['I have put "Please pay after the invoice is stamped" on your list.', false],
    ['I have put "I will confirm the Permanent Secretary date" on your list.', true],
  ])('%s', (reply, kept) => {
    expect(whatTheyAreToldTheySaidIsTheirs(reply, theirs)).toBe(kept);
  });

  it('through the service: a reply that says "You confirmed" of a date he only promised is not sent, and the plain thank-you goes instead', async () => {
    const mind: any = aScriptedMind({ readings: [['Permanent Secretary', { commitments: [{ text: 'I will confirm the Permanent Secretary date', whenSaid: null, waitingOn: null }] }]] });
    mind.replyToThem = async () => 'Ibrahim, thank you. You confirmed the Permanent Secretary meeting date as the week of 16 November. Who attended the meeting?';
    const x = await aTeamLoopWorld({ mind });
    const read = await x.theyWrite('Ibrahim Sule', { words: 'I will confirm the Permanent Secretary date.' });
    console.log(`IBRAHIM READS\n${read}`);
    expect(read).not.toMatch(/You confirmed|Who attended/);
    expect(read).toMatch(/Ibrahim, thank you\. I have noted/);
  });

  it('through the service: a reply that says what he said, in his words, is sent', async () => {
    const mind: any = aScriptedMind({ readings: [['Permanent Secretary', { commitments: [{ text: 'I will confirm the Permanent Secretary date', whenSaid: null, waitingOn: null }] }]] });
    mind.replyToThem = async () => 'Ibrahim, thank you. You said you will confirm the Permanent Secretary date. Which day do you expect to do it?';
    const x = await aTeamLoopWorld({ mind });
    const read = await x.theyWrite('Ibrahim Sule', { words: 'I will confirm the Permanent Secretary date.' });
    console.log(`IBRAHIM READS\n${read}`);
    expect(read).toBe('Ibrahim, thank you. You said you will confirm the Permanent Secretary date. Which day do you expect to do it?');
  });
});

describe('a file a colleague sent first is not "exactly as you sent it", and a flag is answered with the flag', () => {
  const FILE = { fileName: 'CE031-bank-confirmation.txt', text: 'Bank confirmation. Payee Capital Events, reference CE031, amount NGN 120,000, 28 April 2026.' };
  it('the colleague\'s copy is "a document I already have", with nobody named; their own copy is "exactly as you sent it"', async () => {
    const replies: TheReplyBasis[] = [];
    const mind: any = aScriptedMind({ readings: [['please see', { commitments: [{ text: 'I will send the receipt', whenSaid: null, waitingOn: null }] }]] });
    mind.replyToThem = async (b: TheReplyBasis) => { replies.push(b); return 'Ibrahim, thank you. I have noted it.'; };
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'Please see the confirmation. I will send the receipt.', files: [FILE] });
    replies.length = 0;
    await x.theyWrite('Ibrahim Sule', { words: 'Please see the confirmation. I will send the receipt tomorrow.', files: [FILE] });
    const told = replies[replies.length - 1].mustSay.join(' ');
    console.log(`WHAT THE WRITER IS TOLD ABOUT THE COPY\n${told}`);
    expect(told).toContain('I already have this document, so I have not added it again');
    expect(told).toMatch(/Never say who sent it/);
    expect(told).not.toMatch(/exactly as you sent it/);
    replies.length = 0;
    await x.theyWrite('Ibrahim Sule', { words: 'Please see it again. I will send the receipt tomorrow.', files: [FILE] });
    expect(replies[replies.length - 1].mustSay.join(' ')).toContain('I already have this exactly as you sent it');
  });

  it('a file sent again with a word of courtesy is answered, in plain words, and is not counted twice (Fatima round 4, N31)', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind() });
    await x.theyWrite('Amina Yusuf', { words: 'The report for this week.', files: [FILE] });
    const read = await x.theyWrite('Amina Yusuf', { words: 'Again.', files: [FILE] });
    console.log(`AMINA READS\n${read}`);
    expect(read).not.toBeNull();
  });

  it('a person who says a figure is not backed up is told the flag is on the record, and is never asked for their findings', async () => {
    const replies: TheReplyBasis[] = [];
    const mind: any = aScriptedMind({ readings: [['not supported', { disputed: [{ text: '14 meetings with 6 institutions' }] }]] });
    mind.replyToThem = async (b: TheReplyBasis) => { replies.push(b); return 'Amina, thank you.'; };
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'The Q3 draft says 14 meetings with 6 institutions. That is not supported by the log.' });
    const told = replies[0].mustSay.join(' ');
    console.log(`WHAT THE WRITER IS TOLD\n${told}`);
    expect(told).toMatch(/put that flag on the record/);
    expect(told).toMatch(/Never ask them for their findings/);
  });
});

describe('the words the model is given say what it must not do', () => {
  it('a covering line is not an outcome', () => expect(READ_PROMPT).toMatch(/Here is the signed copy[^]*not an outcome, a promise or an event/));
  it('"you said" is only of their own words, and a flag is answered with the flag', () => {
    expect(REPLY_PROMPT).toMatch(/only of words the person wrote themselves/);
    expect(REPLY_PROMPT).toMatch(/Never ask them for their findings/);
  });
  it('a part payment does not show a whole one', () => expect(SHOWS_IT_PROMPT).toMatch(/part payment[^]*does not show it all/));
  it('help drafts at once, signs only what it writes for them, and does not argue with a count', () => {
    expect(HELP_PROMPT).toMatch(/Write the draft at once from what you have/);
    expect(HELP_PROMPT).toMatch(/Your own reply to them is never signed with their name/);
    expect(HELP_PROMPT).toMatch(/two guests[^]*the guests they mean/);
  });
});
