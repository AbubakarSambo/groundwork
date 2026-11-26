import { readFileSync } from 'fs';
import { join } from 'path';
import { theReadBackFrom, theReadBackKeptOn, theLinesReadBackIn, THE_READ_BACK_WAS_GIVEN } from './the-read-back';
import { thePartsFrom } from './the-assessment';
import { withTheReplyToTheReadBack, keepTheCorrectionOnItsItem } from './a-correction-is-kept-on-its-item';
import { theFactsIn } from './the-facts-on-record';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { theVerdictMadeSafe } from '../assistant/a-correction-is-checked-like-a-claim';

/**
 * THE READ-BACK AT THE END OF A CHECK-IN, AS RITA READS IT (batch 2, group 4; staging S5 and S6, item 5). Rewritten in batch 2: the
 * read-back is built from the conversation's assessment, the one reading every page reads, not from the working notes, so the old spec of
 * the notes' read-back went with that path. Rita said she will call Naivas Sarit's buyer at 10am, and that she is on leave Monday 16 and
 * Tuesday 17; the assessment first read only Tuesday. Her read-back holds her promise, comes once with no question in it, and "That's not
 * right, it's two days" is answered on the line it names, kept on that item, and read by every page.
 */
const said = new Map<number, string>([
  [1, 'I will call the Naivas Sarit buyer at 10am tomorrow.'],
  [2, 'I am off on Monday 16 and Tuesday 17.'],
]);
const read = thePartsFrom({
  summary: 'Rita will call Naivas and is off next week.',
  nothingToRecord: [],
  promises: [{ words: 'I will call the Naivas Sarit buyer at 10am tomorrow.', from: [1], byThePerson: true, clear: 'Call the buyer at Naivas Sarit at 10am', when: 'tomorrow' }],
  dates: [{ words: 'off on Tuesday 17', from: [2], when: 'Tuesday 17', what: 'leave' }],
}, said, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
const ritas: any = {
  kind: 'assessment', version: 1,
  about: { checkInId: 'c-rita', groundId: 'g', participantId: 'p-rita', who: 'Rita Rep', isTheLead: false, sessionNumber: 1, endedAt: '2026-11-12T10:00:00Z' },
  messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }],
  ...read,
};

describe('the read-back is the assessment, said once', () => {
  const back = theReadBackFrom(ritas)!;
  it('Rita reads each line once, her promise in it, her own words quoted only where she typed them', () => {
    expect(back.text).toBe([
      'Here’s what I recorded.',
      'You said “I will call the Naivas Sarit buyer at 10am tomorrow”.',
      'Off on Tuesday 17.',
      'Is anything wrong? Tell me and I will put it right.',
    ].join('\n'));
  });
  it('every line keeps the item it came from, so a correction can name it', () => {
    expect(back.lines.map((l) => l.id)).toEqual(['c-rita#r1.promises.0', 'c-rita#r1.dates.0']);
    expect(theLinesReadBackIn(theReadBackKeptOn(ritas, back.lines))).toEqual(back.lines);
  });
  it('a piece read before the whole line it belongs to is not said again (Catherine, evaluation, 24 November 2026)', () => {
    const cath = new Map<number, string>([[1, 'The remaining six need county approval. Nakuru county has not signed, I sent it on 2 November.']]);
    const parts = thePartsFrom({
      summary: 'Catherine is waiting on county approvals.', nothingToRecord: [],
      dates: [{ words: 'I sent it on 2 November', from: [1], when: '2 November', what: 'sent' }],
      blockers: [{ words: 'The remaining six', from: [1], what: 'county approval' }, { words: 'The remaining six need county approval', from: [1], what: 'county approval' }, { words: 'Nakuru county has not signed, I sent it on 2 November', from: [1], what: 'Nakuru county' }],
    } as any, cath, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
    const text = theReadBackFrom({ ...ritas, ...parts, promises: parts.promises ?? [] })?.text ?? '';
    expect(text).not.toContain('“The remaining six”');
    expect(text).not.toContain('“I sent it on 2 November”');
    expect(text).toContain('Nakuru county has not signed');
  });

  it('nothing of theirs means no read-back', () => {
    expect(theReadBackFrom({ ...ritas, promises: [], dates: [] })).toBeNull();
    expect(theReadBackFrom(null)).toBeNull();
  });
  it('the read-back is the whole message, with no question of the model\'s beside it, and is never read back again', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toContain('const readBack = theReadBackFrom(assessed);');
    expect(src).toContain('data: { content: readBack.text }');
    expect(src).not.toMatch(/theReadBack\(notes\)/);
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/Never read the list back again\./);
  });
});

describe('"That\'s not right, it\'s two days" is answered on the line it names', () => {
  const back = theReadBackFrom(ritas)!;
  /* What the probe returns, made safe: only an id it was handed. */
  const checked = theVerdictMadeSafe(
    { verdict: 'backed', reply: 'You are right. I have changed it to Monday 16 and Tuesday 17.', lineId: 'c-rita#r1.dates.0', lineNowSays: 'off on Monday 16 and Tuesday 17' },
    { promises: [], lines: [], numbers: [], documents: [], firstName: 'Rita', facts: back.lines.map((l) => ({ id: l.id, says: l.says, who: 'You', on: 'this check-in' })) },
  )!;
  it('the probe ties it to the leave line, and says what it changed', () => {
    expect(checked.line).toEqual({ id: 'c-rita#r1.dates.0', nowSays: 'off on Monday 16 and Tuesday 17' });
    expect(checked.reply).toBe('You are right. I have changed it to Monday 16 and Tuesday 17.');
  });
  it('kept on the item, every page reads both days, and the reply is part of the assessment so the close keeps it', async () => {
    let column: any = theReadBackKeptOn(ritas, back.lines);
    const prisma: any = { checkIn: { findUnique: jest.fn(async () => ({ sessionReport: column })), update: jest.fn(async ({ data }: any) => { column = data.sessionReport; }) } };
    await keepTheCorrectionOnItsItem(prisma, { checkInId: 'c-rita', itemId: 'r1.dates.0', nowSays: checked.line!.nowSays, backed: true, by: null, where: 'check-in' });
    column = withTheReplyToTheReadBack(column, { turnId: 't3', words: "That's not right, it's two days", at: new Date('2026-11-12T10:05:00Z'), itemId: 'r1.dates.0', nowSays: checked.line!.nowSays, backed: true });
    const words = theFactsIn(column, { kind: 'the person', participantId: 'p-rita' }).map((f) => f.words);
    expect(words).toContain('off on Monday 16 and Tuesday 17');
    expect(words).not.toContain('off on Tuesday 17');
    expect(theRecordLinesIn(column, () => true).map((l) => l.text)).toContain('off on Monday 16 and Tuesday 17');
    expect(column.messages.map((m: any) => m.turnId)).toEqual(['t1', 't2', 't3']);
    expect(column.readBack).toEqual(back.lines);
  });
});

describe('every line of the read-back is a whole sentence the person can read as theirs (run 8: "You said “by 31 January 2027”.", "I want 9 a week.")', () => {
  const { aLineAsTheyReadIt } = require('./the-read-back');
  /* Changed 22 November 2026 (release test, bugs 9 and 10): the line was stitched from fragments ("You answered “on tues”, which I recorded
     as on tues, saw Naivas."). It is now the assessment's own whole sentence for the item. */
  it('says the item in the sentence the assessment wrote for it, never stitched from fragments', () => {
    expect(aLineAsTheyReadIt({ words: 'on tues', saidWordForWord: true, saidBack: 'You saw Naivas on Tuesday' })).toBe('You saw Naivas on Tuesday.');
    expect(aLineAsTheyReadIt({ words: 'One signed with order, one verbal commitment.', saidWordForWord: true, saidBack: 'You signed one shop with an order, and one more gave you a verbal agreement.' }))
      .toBe('You signed one shop with an order, and one more gave you a verbal agreement.');
  });
  it('keeps a whole statement as what they said', () => {
    expect(aLineAsTheyReadIt({ words: 'Nothing is blocking me', saidWordForWord: true })).toBe('You said “Nothing is blocking me”.');
  });
  it('never has Groundwork say "I want" for the person: words not typed word for word are read to them as "you"', () => {
    expect(aLineAsTheyReadIt({ words: 'I want 9 a week.', saidWordForWord: false })).toBe('You want 9 a week.');
    expect(aLineAsTheyReadIt({ words: "I'm aiming for 30", saidWordForWord: false })).toBe('You are aiming for 30.');
  });
});

describe('Amani\'s read-back is whole sentences from the assessment (release test, 21 November 2026, bugs 9 and 10)', () => {
  const hers = new Map<number, string>([
    [1, 'One signed with order, one verbal commitment. 20 cartons.'],
    [2, 'wait 5 days'],
  ]);
  const parts = thePartsFrom({
    summary: 'Amani signed one shop and has one verbal agreement.',
    nothingToRecord: [],
    workUpdates: [{ words: 'One signed with order, one verbal commitment.', from: [1], work: 'new shop sign-ups', stage: 'One signed with order, one verbal commitment.', value: '20 cartons' }],
    blockers: [{ words: 'wait 5 days', from: [2], what: 'the delivery schedule for Kilimani Fresh', onName: 'Baraka' }],
    saidBack: [
      { words: 'One signed with order, one verbal commitment.', says: 'You signed Mama Njeri Duka with an order for 20 cartons, and Kilimani Fresh gave you a verbal agreement.' },
      { words: 'wait 5 days', says: 'You have been waiting 5 days for Baraka to send the delivery schedule for Kilimani Fresh.' },
    ],
  }, hers, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
  const amanis: any = {
    kind: 'assessment', version: 1,
    about: { checkInId: 'c-amani', groundId: 'g', participantId: 'p-amani', who: 'Amani Wekesa', isTheLead: false, sessionNumber: 3, endedAt: '2026-11-21T10:00:00Z' },
    messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }],
    ...parts,
  };
  it('she reads what was recorded in plain sentences, with no fragment quoted and nothing joined with commas', () => {
    expect(theReadBackFrom(amanis)!.text).toBe([
      'Here’s what I recorded.',
      'You signed Mama Njeri Duka with an order for 20 cartons, and Kilimani Fresh gave you a verbal agreement.',
      'You have been waiting 5 days for Baraka to send the delivery schedule for Kilimani Fresh.',
      'Is anything wrong? Tell me and I will put it right.',
    ].join('\n'));
    expect(theReadBackFrom(amanis)!.text).not.toMatch(/which I recorded as|You said “wait 5 days”/);
  });
});

describe('pieces of one message are read back once, as the item that holds them (release test, 22 November 2026)', () => {
  const said2 = new Map<number, string>([[1, 'kilimani is waiting on baraka in operations for the delivery schedule. he said wait 5 days. i need an answer by next friday or we lose kilimani fresh']]);
  const parts2 = thePartsFrom({
    summary: 'Amani waits on Baraka.', nothingToRecord: [],
    numbers: [{ words: 'wait 5 days', from: [1], figure: '5', measures: 'days' }],
    dates: [{ words: 'by next friday', from: [1], when: 'next Friday' }],
    blockers: [{ words: 'kilimani is waiting on baraka in operations for the delivery schedule. he said wait 5 days. i need an answer by next friday or we lose kilimani fresh', from: [1], what: 'the delivery schedule for Kilimani Fresh', onName: 'Baraka' }],
    saidBack: [{ words: 'kilimani is waiting on baraka in operations for the delivery schedule. he said wait 5 days. i need an answer by next friday or we lose kilimani fresh', says: 'You are waiting on Baraka in operations for the delivery schedule for Kilimani Fresh, which you need by next Friday or you will lose the deal.' }],
  }, said2, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
  const a2: any = { kind: 'assessment', version: 1, about: { checkInId: 'c-a', groundId: 'g', participantId: 'p-a', who: 'Amani Wekesa', isTheLead: false, sessionNumber: 3, endedAt: '2026-11-22T05:00:00Z' }, messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }], ...parts2 };
  it('Amani reads the wait once, in its whole sentence, and no quoted piece of it', () => {
    expect(theReadBackFrom(a2)!.text).toBe([
      'Here’s what I recorded.',
      'You are waiting on Baraka in operations for the delivery schedule for Kilimani Fresh, which you need by next Friday or you will lose the deal.',
      'Is anything wrong? Tell me and I will put it right.',
    ].join('\n'));
  });
});

describe('where the assessment wrote sentences, a bare fragment is not read back (final run, 22 November 2026)', () => {
  const said3 = new Map<number, string>([[1, 'mercy in procurement says friday'], [2, 'I sent the margin sheet to Fatuma on Wednesday.']]);
  const parts3 = thePartsFrom({
    summary: 'Chidi waits on Fatuma.', nothingToRecord: [],
    dates: [{ words: 'mercy in procurement says friday', from: [1], when: 'Friday' }],
    blockers: [{ words: 'I sent the margin sheet to Fatuma on Wednesday.', from: [2], what: 'pricing approval for Naivas', onName: 'Fatuma' }],
    saidBack: [{ words: 'I sent the margin sheet to Fatuma on Wednesday.', says: 'You sent the margin sheet to Fatuma on Wednesday, and you are waiting on her pricing approval for Naivas.' }],
  }, said3, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
  const a3: any = { kind: 'assessment', version: 1, about: { checkInId: 'c-c', groundId: 'g', participantId: 'p-c', who: 'Chidi Okeke', isTheLead: false, sessionNumber: 3, endedAt: '2026-11-22T05:00:00Z' }, messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }], ...parts3 };
  it('Chidi reads the sentence, and not "You said “mercy in procurement says friday”."', () => {
    const text = theReadBackFrom(a3)!.text;
    expect(text).toContain('You sent the margin sheet to Fatuma on Wednesday, and you are waiting on her pricing approval for Naivas.');
    expect(text).not.toMatch(/You said “/);
  });
});
