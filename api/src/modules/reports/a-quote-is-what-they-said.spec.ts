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

  it('a quote that is not theirs, and reads correctly as a plain statement, loses its marks and the sentence stays', () => {
    const r = whatTheySaidInQuotes('The lead called it "a short delay in the rollout" last week.', RECORD);
    expect(r.text).toBe('The lead called it a short delay in the rollout last week.');
    expect(r.unquoted).toEqual(['a short delay in the rollout']);
    expect(r.dropped).toEqual([]);
  });

  it('a quote that is not theirs and is in the speaker\'s mouth takes its whole sentence with it', () => {
    /* Unquoted, this read "Zainab says I have mostly been doing sales support at your request": the
       report saying "I", and Zainab saying "your". */
    const r = whatTheySaidInQuotes('Zainab has moved to sales. She says "I have mostly been doing sales support at the initiator\'s request". The partnerships have not moved.', RECORD);
    expect(r.text).toBe('Zainab has moved to sales. The partnerships have not moved.');
    expect(r.dropped).toEqual(['She says "I have mostly been doing sales support at the initiator\'s request".']);
    expect(r.unquoted).toEqual([]);
    for (const mouth of ['we will ship it', 'my manager asked', 'you asked for it', 'nobody told us']) {
      expect(whatTheySaidInQuotes(`First. He said "${mouth} on Friday". Last.`, RECORD).text).toBe('First. Last.');
    }
  });

  it('a sentence that announces their words is taken out when the words are not theirs', () => {
    expect(whatTheySaidInQuotes('It stalled. In Zainab\'s words, "the partnerships are fully paused". Nothing else.', RECORD).text).toBe('It stalled. Nothing else.');
    expect(whatTheySaidInQuotes('It stalled. She put it plainly: "the partnerships are fully paused".', RECORD).text).toBe('It stalled.');
  });

  it('a list line whose only sentence goes is taken out of the list, not left empty', () => {
    const r = everyQuoteFromTheRecord({ evidence: ['"I never said this"', 'The handover was late.'] }, RECORD);
    expect(r.value).toEqual({ evidence: ['The handover was late.'] });
  });

  it('suggested wording is nobody\'s quote: it keeps its words, as the writer\'s own, without the marks', () => {
    expect(whatTheySaidInQuotes('Change the regular check-in to ask "What are you waiting for?"', RECORD).text)
      .toBe('Change the regular check-in to ask: What are you waiting for?');
    expect(whatTheySaidInQuotes('Try saying "we can pick this up on Monday" when it comes up.', RECORD).text)
      .toBe('Try saying we can pick this up on Monday when it comes up.');
    /* "asked" puts the words in somebody's mouth, so it is not a suggestion and the rule for a quote holds. */
    expect(whatTheySaidInQuotes('First. Zainab asked "What are you waiting for?" Last.', RECORD).text).toBe('First. Last.');
  });

  it('a field whose only sentence is dropped takes its item out of the list, never leaving it blank', () => {
    const r = everyQuoteFromTheRecord({
      whatToDo: [
        { move: 'Speak to her.', because: 'She said "I will do it by Friday" and has not.' },
        { move: 'Keep the partnerships on the agenda.', because: 'The handover was late.' },
      ],
    }, RECORD);
    expect(r.value).toEqual({ whatToDo: [{ move: 'Keep the partnerships on the agenda.', because: 'The handover was late.' }] });
  });

  it('and where there is no list to take it out of, the sentence stays, unquoted, rather than blank', () => {
    const r = everyQuoteFromTheRecord({ theGap: 'She said "I will do it by Friday".', sharedPicture: 'She said "I will do it by Friday".' }, RECORD);
    expect(r.value).toEqual({ theGap: 'She said I will do it by Friday.', sharedPicture: 'She said I will do it by Friday.' });
    expect(everyQuoteFromTheRecord('She said "I will do it by Friday".', RECORD).value).toBe('She said I will do it by Friday.');
  });

  it('no string that had words in it before the pass is blank after it, anywhere in a report', () => {
    const report = {
      sharedPicture: 'She said "I will do it by Friday". The handover was late.',
      divergences: [{ topic: 'Friday', positions: [{ participantLabel: 'the initiator', view: '"We never agreed Friday"' }, { participantLabel: 'Participant A', view: 'Friday was agreed.' }], evidence: ['"my notes say Friday"'] }],
      theJudgement: { theGap: 'In her words, "I was never told".', whatToDo: [{ move: 'Ask "Who told you Friday?"', because: 'She said "I was never told".' }] },
    };
    const blanks: string[] = [];
    const look = (v: any) => {
      if (typeof v === 'string') { if (!v.trim()) blanks.push(v); return; }
      if (Array.isArray(v)) v.forEach(look);
      else if (v && typeof v === 'object') Object.values(v).forEach(look);
    };
    const r = everyQuoteFromTheRecord(report, RECORD);
    look(r.value);
    expect(blanks).toEqual([]);
    expect((r.value as any).theJudgement.theGap).toBe('In her words, I was never told.');
    expect((r.value as any).theJudgement.whatToDo).toEqual([]);
    expect((r.value as any).divergences[0].positions.map((p: any) => p.participantLabel)).toEqual(['Participant A']);
    expect((r.value as any).divergences[0].evidence).toEqual([]);
  });

  it('a "US" in capitals is the country, not the speaker', () => {
    expect(whatTheySaidInQuotes('They sell to "the US market" now.', RECORD).text).toBe('They sell to the US market now.');
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
      { a: 'She said "as requested by the initiator". She added "we are nearly there".', b: ['“The handover — it was late”'] },
      RECORD,
      PEOPLE,
    );
    const all = [r.value.a, ...r.value.b];
    expect(all.flatMap((t) => quotesNotWordForWord(t, RECORD))).toEqual([]);
    expect(r.value.a).toBe('She said "as requested by Nadia".');
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
    /* Changed 1 October: Zainab is the reader, so her own name outside the quote is "you" (the review,
       section 2). The inside of the quote is still exactly as she wrote it, which is what this checks. */
    expect(withNames('Zainab wrote “the initiator asked me to”.', visible, labels, { viewerLabel: 'Participant A' })).toBe(
      'You wrote “the initiator asked me to”.',
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
    const out = withoutWhoSaidIt('Zainab Suleiman was moved "at the request of Nadia" and said "we are nearly there".', [
      { name: 'Nadia Haddad' },
      { name: 'Zainab Suleiman' },
    ]);
    expect(out).toBe('Somebody in this check-in was moved at the request of somebody in this check-in and said "we are nearly there".');
    expect(out).not.toContain('Nadia');
  });

  it('and where the words it had to change are in the speaker\'s mouth, or were announced as theirs, the sentence goes', () => {
    const who = [{ name: 'Nadia Haddad' }, { name: 'Zainab Suleiman' }];
    expect(withoutWhoSaidIt('You moved to sales. In your words, "I did it because Nadia asked". It stalled.', who)).toBe('You moved to sales. It stalled.');
    expect(withoutWhoSaidIt('You moved to sales. In your words, "as requested by Nadia". It stalled.', who)).toBe('You moved to sales. It stalled.');
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
    expect(src).toMatch(/theLinesAQuoteMayComeFrom\(\s*\[\s*\.\.\.\(theRecordAsItIs as any\[\]\)/);
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
    /* Changed 3 November: since 39c34f42e the record's lines are written from the conversation's assessment
       (theRecordLinesFromTheAssessment), not from a separate record read. What is pinned is the same: the stamp is
       made on the line as it is stored, against what the person typed in this check-in, with their own quotation
       marks put back (see conversation/their-quotation-marks-are-theirs). */
    expect(src).toMatch(/const whatTheyTyped = theWorkTheySaid\(turns\)\.map\(/);
    expect(src).toMatch(/const text = theirQuotationMarksBack\(theLineWithoutItsDanglingJoin\(l\.text\), whatTheyTyped\);/);
    expect(src).toMatch(/text, saidWordForWord: saidWordForWord\(text, whatTheyTyped\)/);
  });
});

describe('what they said they would do is quoted only where it is their words too', () => {
  const strip = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const conversation = strip(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'));
  const grounds = strip(path.join(__dirname, '..', 'grounds', 'grounds.service.ts'));
  const reports = strip(path.join(__dirname, 'reports.service.ts'));

  it('a commitment from a check-in is stamped against what the person typed in that session', () => {
    expect(conversation).toMatch(/saidWordForWord: saidWordForWord\(c\.action\.slice\(0, 400\), said\)/);
    expect(conversation).toMatch(/whenSaidWordForWord: c\.when \? saidWordForWord\(c\.when, said\) : false/);
  });

  it('a lead editing its words makes it no longer theirs', () => {
    expect(grounds).toMatch(/groundCommitment\.update\(\{ where: \{ id: thing\.id \}, data: \{ text: change\.newText\.trim\(\)\.slice\(0, 400\), saidWordForWord: false \} \}\)/);
  });

  it('and the report may quote a commitment, or its "when", only where it is stamped', () => {
    expect(reports).toMatch(/\(theirPromises as any\[\]\)\.map\(\(c\) => \(\{ text: c\.text, saidWordForWord: c\.saidWordForWord === true \}\)\)/);
    expect(reports).toMatch(/\(theirPromises as any\[\]\)\.map\(\(c\) => \(\{ text: c\.whenSaid, saidWordForWord: c\.whenSaidWordForWord === true \}\)\)/);
  });

  it('so a commitment line keeps its quote where the words were theirs, and loses the line where they were not', () => {
    const lines = theLinesAQuoteMayComeFrom([
      { text: 'I will keep calling them', saidWordForWord: true },
      { text: 'this week', saidWordForWord: true },
      { text: 'I will escalate to the head of credit', saidWordForWord: false },
    ]);
    expect(whatTheySaidInQuotes('Participant A: "I will keep calling them" - said in session 3; by their own timing, "this week"; nobody has said whether it happened.', lines).text)
      .toBe('Participant A: "I will keep calling them" - said in session 3; by their own timing, "this week"; nobody has said whether it happened.');
    expect(whatTheySaidInQuotes('Participant A: "I will escalate to the head of credit" - said in session 3.', lines).text).toBe('');
  });
});
