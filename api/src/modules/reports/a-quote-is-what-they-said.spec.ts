import * as fs from 'fs';
import * as path from 'path';
import {
  saidWordForWord,
  everyQuoteFromTheRecord,
  quotationsIn,
  quotesNotWordForWord,
  theLinesAQuoteMayComeFrom,
  theQuotesKept,
  whatTheySaidInQuotes,
} from './a-quote-is-what-they-said';
import { withNames } from './party-labels';
import { withoutDashes } from './forensic-voice';
import { notTheWordParty } from './not-the-word-party';
import { withoutWhoSaidIt } from './what-the-respondents-get';

/**
 * A QUOTE IN A REPORT IS WHAT THE PERSON SAID, TAKEN FROM THE RECORD. See a-quote-is-what-they-said.
 *
 * Every assertion here is on the whole sentence a person reads, not on a flag, so a pass that quietly
 * changed the words around a quote would fail too.
 */

const RECORD = theLinesAQuoteMayComeFrom([
  { text: "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia, which has meant no progress on the three partnerships.", saidWordForWord: true },
  { text: "I asked her on the 8th and chased on the 15th. [INFERRED: 'her' refers to Priti]", saidWordForWord: true },
  { text: 'The handover — it was late, and the other party never signed.', saidWordForWord: true },
  /* The record reader's tidied version of something said: right about it, and not their words. */
  { text: '[Tobi] has followed up on specific action items with each client.', saidWordForWord: false },
], ['Partnerships lead. Three named partnerships to close this year.']);

const PEOPLE = [
  { label: 'the initiator', name: 'Nadia Haddad' },
  { label: 'Participant A', name: 'Zainab Suleiman' },
];

describe('a quote is what they said, restored before the report is stored', () => {
  it('a quote the record holds comes back in the record\'s own words: its capitals, its apostrophe, its spacing', () => {
    const r = whatTheySaidInQuotes('Zainab said “since march 11th,  I’ve been almost entirely focused on inbound sales support” and nothing else.', RECORD);
    expect(r.text).toBe("Zainab said “Since March 11th, I've been almost entirely focused on inbound sales support” and nothing else.");
    expect(r.restored).toBe(1);
    expect(r.unquoted).toEqual([]);
  });

  it('a label inside a quote is found as the name the person said, and the name is what goes back', () => {
    /* What a model writes once it reads labels: the lead's name in Zainab's words became "the initiator". */
    const r = whatTheySaidInQuotes('Participant A says she has been "focused on inbound sales support as requested by the initiator".', RECORD, PEOPLE);
    expect(r.text).toBe('Participant A says she has been "focused on inbound sales support as requested by Nadia".');
  });

  it('a quote with a word changed is not a quote any more, and the sentence around it stays', () => {
    const r = whatTheySaidInQuotes('She said "I have been mostly focused on inbound sales" and the lead agreed.', RECORD);
    expect(r.text).toBe('She said I have been mostly focused on inbound sales and the lead agreed.');
    expect(r.unquoted).toEqual(['I have been mostly focused on inbound sales']);
  });

  it('a quote joined with an ellipsis is two passages, not one, and is not a quote', () => {
    const r = whatTheySaidInQuotes('“Since March 11th ... no progress on the three partnerships.”', RECORD);
    expect(r.text).toBe('Since March 11th ... no progress on the three partnerships.');
  });

  it('the record\'s own full stop comes with it when the quote ended on one', () => {
    const r = whatTheySaidInQuotes('The role was given as "partnerships lead." at the start.', RECORD);
    expect(r.text).toBe('The role was given as "Partnerships lead." at the start.');
  });

  it('the reader\'s bracket is nobody\'s words, so a quote of it is not found', () => {
    expect(RECORD).toContain('I asked her on the 8th and chased on the 15th.');
    expect(whatTheySaidInQuotes('"her refers to Priti"', RECORD).text).toBe('her refers to Priti');
    expect(whatTheySaidInQuotes('"I asked her on the 8th"', RECORD).text).toBe('"I asked her on the 8th"');
  });

  it('a tidied record line is never an original, so a quote of it is not a quote', () => {
    expect(RECORD.join('\n')).not.toContain('Tobi');
    expect(whatTheySaidInQuotes('She said "[Tobi] has followed up on specific action items with each client."', RECORD).text).not.toContain('"');
  });

  it('a whole word only: "minor noise" is not found inside "minor noises"', () => {
    const r = whatTheySaidInQuotes('"minor noise"', ['There were a few minor noises from the branch.']);
    expect(r.text).toBe('minor noise');
  });

  it('an apostrophe inside a word is never taken for a quotation mark', () => {
    expect(quotationsIn("don't and 5'11 and it's")).toEqual([]);
  });

  it('over a whole report: prose is restored, and labels and identifiers are never touched', () => {
    const report = {
      label: 'the initiator',
      participantId: 'p-1',
      who: 'Participant A',
      text: 'Participant A said "as requested by the initiator".',
      nested: [{ says: 'She is "almost entirely focused on inbound sales support"', fieldId: '"x"' }],
    };
    const r = everyQuoteFromTheRecord(report, RECORD, PEOPLE);
    expect(r.value).toEqual({
      label: 'the initiator',
      participantId: 'p-1',
      who: 'Participant A',
      text: 'Participant A said "as requested by Nadia".',
      nested: [{ says: 'She is "almost entirely focused on inbound sales support"', fieldId: '"x"' }],
    });
    expect(r.restored).toBe(2);
  });

  it('after the pass, every quote in it is word for word in the record', () => {
    const r = everyQuoteFromTheRecord(
      { a: 'She said "as requested by the initiator" and "we are nearly there".', b: ['“The handover — it was late”'] },
      RECORD,
      PEOPLE,
    );
    const all = [r.value.a, ...r.value.b];
    expect(all.flatMap((t) => quotesNotWordForWord(t, RECORD))).toEqual([]);
    expect(r.value.a).toBe('She said "as requested by Nadia" and we are nearly there.');
  });
});

describe('and nothing touches the inside of a quote on the way out', () => {
  const visible = new Map([['the initiator', 'Nadia Haddad'], ['Participant A', 'Zainab Suleiman']]);
  const labels = ['the initiator', 'Participant A'];

  it('withNames names the sentence and leaves the quote as the person said it', () => {
    const stored = 'Participant A has moved to sales at the initiator\'s request: "as requested by Nadia".';
    expect(withNames(stored, visible, labels, { viewerLabel: 'the initiator' })).toBe(
      'Zainab Suleiman has moved to sales at your request: "as requested by Nadia".',
    );
  });

  it('a label somebody said inside their own words stays as they said it', () => {
    /* Before, a role label inside a quote was swapped for the person's name, inside their own words. */
    expect(withNames('Zainab wrote “the initiator asked me to”.', visible, labels, { viewerLabel: 'Participant A' })).toBe(
      'Zainab wrote “the initiator asked me to”.',
    );
  });

  it('withoutDashes and notTheWordParty leave a quote alone and still tidy the sentence', () => {
    expect(withoutDashes('The handover — late. She said "The handover — it was late".')).toBe(
      'The handover, late. She said "The handover — it was late".',
    );
    expect(notTheWordParty('Neither party signed. She said "the other party never signed".')).toBe(
      'Neither of them signed. She said "the other party never signed".',
    );
  });

  it('an anonymous copy takes the name out of a quote and takes the quotation marks off with it', () => {
    const out = withoutWhoSaidIt('Zainab Suleiman said "as requested by Nadia" and "we are nearly there".', [
      { name: 'Nadia Haddad' },
      { name: 'Zainab Suleiman' },
    ]);
    expect(out).toBe('somebody in this check-in said as requested by somebody in this check-in and "we are nearly there".');
    expect(out).not.toContain('Nadia');
  });

  it('theQuotesKept puts back exactly what it held', () => {
    expect(theQuotesKept('a "b c" d “e”', (s) => s.toUpperCase())).toBe('A "b c" D “e”');
  });
});

describe('the report pass runs once, on everything stored', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('before the report is written, over every field the write stores', () => {
    const pass = src.slice(src.indexOf('const fromTheRecord'), src.indexOf('const report = await this.prisma.report.upsert'));
    expect(pass.length).toBeGreaterThan(0);
    for (const field of [
      'sharedPicture', 'theOpening', 'agreements', 'divergences', 'centralQuestion', 'leadershipGaps',
      'findings', 'inferences', 'enrichedEngagement', 'networkPicture', 'theJudgement.judgement', 'overTime',
    ]) {
      expect(pass).toContain(field);
    }
  });

  it('from the same record read the report is written from, and never from a transcript', () => {
    expect(src).toMatch(/const records = theRecordAsItIs\.map\(withTheDisputeAttached\)/);
    expect(src).toMatch(/theLinesAQuoteMayComeFrom\(\s*theRecordAsItIs/);
    expect(src).not.toMatch(/conversationTurn\./);
  });

  it('and the discovery read too', () => {
    const d = src.slice(src.indexOf('async readAndKeepTheDirection'), src.indexOf('private async readTheDirectionInChunks'));
    expect(d).toContain('everyQuoteFromTheRecord(');
  });
});

describe('whether a record line is their own words, stamped when it is written', () => {
  const TYPED = ["Honestly? Since March 11th I've been almost entirely focused on inbound sales support, as requested by Nadia. It's been a lot."];

  it('a line that is a passage of what they typed is theirs, forgiving capitals, spacing and end punctuation', () => {
    expect(saidWordForWord("since March 11th I've been almost entirely focused on inbound sales support.", TYPED)).toBe(true);
    expect(saidWordForWord("It’s been a lot", TYPED)).toBe(true);
  });

  it('a line the reader joined, reworded or bracketed is not', () => {
    expect(saidWordForWord("Since March 11th I've been focused on inbound sales support.", TYPED)).toBe(false);
    expect(saidWordForWord('as requested by Nadia. It has been a lot.', TYPED)).toBe(false);
    expect(saidWordForWord('[Nadia] asked for sales support.', TYPED)).toBe(false);
  });

  it("the reader's note is not counted against it", () => {
    expect(saidWordForWord("It's been a lot. [INFERRED: 'it' refers to the sales work]", TYPED)).toBe(true);
  });

  it('and the record writer stamps every line it writes, from what the person typed in that check-in', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toMatch(/const whatTheyTyped = theirs\.map\(/);
    expect(src).toMatch(/saidWordForWord: saidWordForWord\(theLineWithoutItsDanglingJoin\(e\.text\), whatTheyTyped\)/);
  });
});
