import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  whatIsStillUncovered, theSubjectWorthRaising, breadthFirst, whatToCoverNext, theyHaveTalkedAbout,
} from './the-ground-the-brief-asks-us-to-cover';

/**
 * THE SAME QUESTION TWICE IS THE FAULT SHE HAS NAMED MOST OFTEN.
 *
 * Read live, 23 September 2026, driving her own update brief: turn one asked "Which specific states
 * or markets do you want to expand into?", she answered "Niger and Kogi", and turn five asked which
 * states she wanted to expand into. Coverage was decided by matching the brief's own words against
 * her answers, and an answer names the place rather than the category - "Niger and Kogi" contains
 * neither "states" nor "markets". So a subject the conversation put to them and got an answer to is
 * now remembered as covered, whatever vocabulary the answer used.
 */
const THE_BRIEF = [
  { id: 's1', subject: 'the states they want to expand into', ask: 'Which states?', words: ['states', 'markets', 'expand'] },
  { id: 's2', subject: 'the volumes they move', ask: 'What volumes?', words: ['volumes', 'tonnes', 'quantity'] },
  { id: 's3', subject: 'the actors they need to reach', ask: 'Who do you need?', words: ['actors', 'aggregators', 'buyers'] },
  { id: 's4', subject: 'the information they are missing', ask: 'What do you not know?', words: ['information', 'data', 'prices'] },
];

describe('a subject answered in their own words', () => {
  const inHerWords = ['Niger and Kogi, mostly through the dry season.'];

  it('is not caught by matching the brief against the answer', () => {
    /* The old rule, on its own, and this is exactly why it was not enough. */
    expect(theyHaveTalkedAbout(THE_BRIEF[0], inHerWords)).toBe(false);
  });

  it('but is covered once the conversation has raised it and been answered', () => {
    expect(whatIsStillUncovered(THE_BRIEF, inHerWords).map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(whatIsStillUncovered(THE_BRIEF, inHerWords, ['s1']).map((s) => s.id)).toEqual(['s2', 's3', 's4']);
  });

  it('so the next question is never the one just answered', () => {
    expect(theSubjectWorthRaising(THE_BRIEF, inHerWords)!.id).toBe('s1');
    expect(theSubjectWorthRaising(THE_BRIEF, inHerWords, ['s1'])!.id).toBe('s2');
    expect(whatToCoverNext(THE_BRIEF, inHerWords, ['s1'])).toContain('volumes');
    expect(whatToCoverNext(THE_BRIEF, inHerWords, ['s1'])).not.toContain('states');
  });

  it('and the words check still carries the coverage it can see', () => {
    const said = ['We move about 400 tonnes a season.'];
    expect(whatIsStillUncovered(THE_BRIEF, said).map((s) => s.id)).toEqual(['s1', 's3', 's4']);
  });

  it('and breadth stops pulling once enough of the brief has been put to them', () => {
    expect(breadthFirst(THE_BRIEF, inHerWords, [])).toBe(true);
    expect(breadthFirst(THE_BRIEF, inHerWords, ['s1', 's2', 's3'])).toBe(false);
  });

  it('and nothing is raised once the brief is covered', () => {
    expect(theSubjectWorthRaising(THE_BRIEF, inHerWords, ['s1', 's2', 's3', 's4'])).toBeNull();
    expect(whatToCoverNext(THE_BRIEF, inHerWords, ['s1', 's2', 's3', 's4'])).toBe('');
  });
});

/**
 * AND THE RANK IS WRITTEN ONCE.
 *
 * Two places need it: the prompt, which needs the words, and the note written after the reply,
 * which needs to know which subject those words put to them. Written twice, the second copy being
 * subtly wrong is precisely how somebody gets asked at turn five what they answered at turn one.
 */
describe('the ranking the prompt uses and the note records', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('is one method, and both callers go through it', () => {
    expect(SRC.match(/private whichHoleToPush\(/g)).toHaveLength(1);
    expect(SRC.match(/this\.whichHoleToPush\(/g)!.length).toBeGreaterThanOrEqual(2);
    /* And the branches it owns exist nowhere else. */
    expect(SRC.match(/\bfollowTheirLead\(/g)).toHaveLength(1);
    expect(SRC.match(/\bsayThisChallenge\(/g)).toHaveLength(1);
    expect(SRC.match(/\bbreadthFirst\(/g)).toHaveLength(1);
  });
});

/**
 * AND ONE NOTE AT A TIME PER CHECK-IN.
 *
 * Six answers went in and the notes read `answers=3`, with a whole 30,000-smallholder target
 * missing and nothing having failed: the note is fire-and-forget and takes tens of seconds, so turn
 * five was still writing when turn six read the same row, and the last write won. A
 * read-modify-write on a row two requests are holding.
 */
describe('the note that merges onto what is already held', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('never runs twice over one check-in at once', () => {
    expect(SRC).toContain('private notesInFlight = new Map<string, Promise<void>>();');
    const queue = SRC.slice(SRC.indexOf('async noteWhatTheySaid('), SRC.indexOf('private async noteWhatTheySaidNow('));
    expect(queue).toMatch(/this\.notesInFlight\.get\(checkInId\)/);
    expect(queue).toMatch(/this\.notesInFlight\.set\(checkInId,/);
    /* And it lets go of the check-in afterwards, so the map is not the process's memory leak. */
    expect(queue).toMatch(/this\.notesInFlight\.delete\(checkInId\)/);
  });

  it('and the merge itself is only ever reached through the queue', () => {
    expect(SRC.match(/noteWhatTheySaidNow\(/g)).toHaveLength(2);
  });

  /*
   * AND IT LANDS BEFORE THE NEXT QUESTION IS COMPOSED.
   *
   * Read live: six answers, and a minute after the conversation closed the notes held every claim,
   * the 30,000 smallholders, the 30% target and the challenge about which half of that income she
   * meant - all of it too late to ask. Serialising the writes fixed the losses and left the whole
   * apparatus one turn behind a conversation that only had six turns.
   */
  it('and the turn waits for it, briefly, and then reads the row again', () => {
    const compose = SRC.slice(SRC.indexOf('private async composeSystemPrompt('), SRC.indexOf('private whichHoleToPush('));
    expect(compose).toMatch(/await this\.theNoteFromTheLastTurnLands\(checkIn\.id\)/);
    /* The copy fetched before the wait is stale by definition, so the row is read again. */
    expect(compose).toMatch(/const notes = await this\.prisma\.checkIn\s*\n\s*\.findUnique\(\{ where: \{ id: checkIn\.id \}, select: \{ whatWeHave: true \} \}\)/);
  });

  it('and a note that has gone wrong can never hold a conversation', () => {
    const wait = SRC.slice(SRC.indexOf('private static readonly A_NOTE_MAY_HOLD_A_TURN_FOR'), SRC.indexOf('async noteWhatTheySaid('));
    expect(wait).toMatch(/A_NOTE_MAY_HOLD_A_TURN_FOR = 12_000/);
    expect(wait).toMatch(/Promise\.race\(\[/);
    expect(wait).toMatch(/clearTimeout\(timer\)/);
  });

  /* Two or three seconds, not fifteen: it reads one answer and quotes it back into fields. */
  it('and the note runs on the fast model with nothing to deliberate about', () => {
    const notes = SRC.slice(SRC.indexOf('private async noteWhatTheySaidNow('), SRC.indexOf('async writeTheRecordFromTheAssessment('));
    expect(notes).toMatch(/\{ fast: true, thinkingBudget: 0 \}/);
  });
});

/**
 * AND THE THIRD WAY OF NOTICING, WHICH IS TO READ THE ANSWER.
 *
 * "About two thousand tonnes a quarter" covers the volumes they move and shares not one word with
 * the way the brief asks for it, and no turn had raised volumes, so it stayed owed. The words check
 * and the raised check are both mechanical; this one asks the model what the answer was about,
 * which is what it is for. All three stay: the cost of noticing is one question not asked, and the
 * cost of missing is asking somebody the same thing twice.
 */
describe('what the answer was about, read rather than matched', () => {
  const READ = readFileSync(join(__dirname, 'reading-what-they-just-said.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const { theSubjectsToJudgeAgainst } = require('./reading-what-they-just-said');

  it('is asked for by meaning, not by wording', () => {
    expect(READ).toMatch(/covered\s+the ids of any subjects/);
    expect(READ).toContain('Judge it by what the answer MEANS');
    /* And the schema is readable by the converter, which reads input_schema and nothing else. */
    expect(READ).toMatch(/covered: \{\s*\n\s*type: 'array'/);
  });

  it('and the subjects are put in front of it with their ids', () => {
    const shown = theSubjectsToJudgeAgainst([
      { id: 'volumes', subject: 'the volumes they move' },
      { id: 'states', subject: 'the states they want to expand into' },
    ]);
    expect(shown).toContain('- volumes: the volumes they move');
    expect(shown).toContain('- states: the states they want to expand into');
    expect(theSubjectsToJudgeAgainst([])).toBe('');
    expect(theSubjectsToJudgeAgainst(null)).toBe('');
  });

  /* An id nobody put in the brief would silently retire a subject that is still owed. */
  it('and only ids that are really in the brief are taken', () => {
    const notes = SRC.slice(SRC.indexOf('private async noteWhatTheySaidNow('), SRC.indexOf('async writeTheRecordFromTheAssessment('));
    expect(notes).toMatch(/const real = new Set\(subjects\.map\(\(s\) => s\.id\)\)/);
    expect(notes).toMatch(/\(read\.covered \?\? \[\]\)\.filter\(\(id\) => real\.has\(id\)\)/);
  });
});

/**
 * AND A TURN THAT PUT NOTHING TO ANYBODY MARKS NOTHING.
 *
 * Two ways this went wrong in one run. The challenge about which half of that income she meant was
 * marked as put by the turn that said goodbye, so it was spent without ever being said. And a
 * subject put to somebody who answered "you already asked me that" would have been marked covered
 * on the strength of a complaint.
 */
describe('the bookkeeping for what was put to them', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const notes = SRC.slice(SRC.indexOf('private async noteWhatTheySaidNow('), SRC.indexOf('async writeTheRecordFromTheAssessment('));

  it('nothing is marked once the conversation has closed', () => {
    expect(notes).toMatch(/const putLastTurn = row\.completedAt \? null : theChallengeWorthPutting\(/);
    expect(notes).toMatch(/const stillTalking = !row\.completedAt;/);
    /* Now also the field it asked for - see the-field-this-answer-is-missing. */
    expect(notes).toMatch(/\(subjects\.length \|\| frame\.length\) && stillTalking/);
  });

  it('and a remark is not an answer, so it covers nothing', () => {
    /* The coverage marking sits AFTER the remark check, which returns early. */
    expect(notes.indexOf('if (aboutTheToolNotTheWork(theirTurn))')).toBeLessThan(notes.indexOf('const putToThem ='));
  });
});
