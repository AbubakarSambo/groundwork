import { readFileSync } from 'fs';
import { join } from 'path';
import { whatToAskThemThisTime, whatToAskThisTimeBlockFor } from './what-keeps-happening-becomes-a-question';
import { theRecordAcrossTime, type AnAssessmentSeen } from '../patterns/patterns-across-the-assessments';

/**
 * WHAT THE NEXT CHECK-IN ASKS, FROM THE RECORD, AND NEVER A PATTERN NAMED (F2, Hafsah's decisions of 2 November 2026).
 *
 * This file pinned the stored-pattern probe: one question from a PatternDetection code seen in three periods. That probe is
 * replaced by layer 2's questions for the person (toAskNextTime), so the tests now pin what replaced it, as the person's next
 * check-in is given it: what the record cannot settle becomes a question, what they said last time is put back to confirm, and
 * the block still never names a pattern, a habit, or anything missing.
 */
const FIXTURE = JSON.parse(readFileSync(join(__dirname, '..', 'patterns', 'fixtures', 'round-23-assessments.json'), 'utf8')) as { people: Record<string, { participantId: string; seen: AnAssessmentSeen[] }> };
const theirs = (who: string) => { const p = FIXTURE.people[who]; return theRecordAcrossTime(p.participantId, p.seen).toAskNextTime; };

describe('the questions the next check-in carries', () => {
  it('adds nothing to a prompt when there is nothing to ask', () => {
    expect(whatToAskThisTimeBlockFor([])).toBe('');
  });

  it('Aisha, on the real rows: her wait on Wanjiru is put back to her to confirm, in her own words, and nothing is said against her', () => {
    const block = whatToAskThisTimeBlockFor(theirs('Aisha'));
    expect(block).toContain('- Last time you said "I am still waiting on Wanjiru\'s sign-off on the Riverside Bakery write-off of KES 45,000. I asked her on Thursday 5 November." Is that still where it stands?');
    expect(block).not.toMatch(/nothing on record|has stopped|raised higher|not backed/i);
  });

  it('Joseph, on the real rows: his wait on the district office is confirmed, never read as a fault', () => {
    expect(theirs('Joseph')).toContain('Last time you said "I am waiting on the Gulu district office for the Awach registration certificate." Is that still where it stands?');
  });

  it('David, on the real rows: his promises with nothing said about them become questions, never a slip', () => {
    expect(theirs('David')).toEqual(expect.arrayContaining([expect.stringContaining('finish the search on the Kilele land')]));
  });

  it('Brian, on the real rows: his own promise is put back to him by what he said he would do', () => {
    expect(theirs('Brian')).toContain("Last time you said you would call Tumaini Traders' lawyer this week. Did it happen?");
  });

  it('tells the model to ask naturally, take a correction like any claim, and never name a pattern or anything missing', () => {
    const block = whatToAskThisTimeBlockFor(['Last time you said you would call Westgate on Friday. Did it happen?']);
    expect(block).toContain('Ask each one in your own words, as an ordinary question about the work');
    expect(block).toContain('If they say something was recorded wrong, take their correction and ask what shows it');
    expect(block).toContain('never tell them they have a habit or a\npattern');
    expect(block).toContain('never say they forgot or did not mention it');
  });
});

describe('where the questions come from', () => {
  const row = (toAskNextTime: string[] | null) => ({
    sessionReport: toAskNextTime ? { kind: 'assessment', version: 1, acrossTime: { patterns: [], role: null, focus: null, toAskNextTime } } : null,
  });

  it('their newest assessment before this check-in, and only theirs', async () => {
    let asked: any = null;
    const prisma = { checkIn: { findMany: jest.fn(async (a: any) => { asked = a; return [row(['Newest?']), row(['Older?'])]; }) } };
    expect(await whatToAskThemThisTime(prisma, 'p-aisha', 5)).toEqual(['Newest?']);
    expect(asked.where).toEqual({ participantId: 'p-aisha', sessionNumber: { lt: 5 } });
  });

  it('skips a check-in with no assessment, and is empty when none has one', async () => {
    const prisma = { checkIn: { findMany: jest.fn(async () => [row(null), row(['Older?'])]) } };
    expect(await whatToAskThemThisTime(prisma, 'p', 3)).toEqual(['Older?']);
    expect(await whatToAskThemThisTime({ checkIn: { findMany: jest.fn(async () => [row(null)]) } }, 'p', 3)).toEqual([]);
  });

  it('a stored pattern is never read for it', async () => {
    const patternDetection = { findMany: jest.fn(async () => [{ code: 'B2', periodsObserved: 9 }]) };
    await whatToAskThemThisTime({ checkIn: { findMany: jest.fn(async () => []) }, patternDetection }, 'p', 3);
    expect(patternDetection.findMany).not.toHaveBeenCalled();
  });
});
