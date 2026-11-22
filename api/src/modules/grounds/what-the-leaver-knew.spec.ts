import { readFileSync } from 'fs';
import { join } from 'path';
import { CommitmentState, DependencyStatus } from '@prisma/client';
import { buildHandoverBrief, isEmpty, WHAT_IS_NOT_HERE, BriefInput } from './what-the-leaver-knew';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const input = (o: Partial<BriefInput> = {}): BriefInput => ({
  roleName: 'Head of Partnerships',
  commitments: [],
  waitingOnOthers: [],
  owedToOthers: [],
  liveSubjects: [],
  ...o,
});

describe('the brief carries what is outstanding, never what anybody said', () => {
  it('has no field for a quote, a note, or an account', () => {
    /*
     * The spec line that decides this whole shape: "threads left mid-conversation, by subject,
     * WITHOUT PREDECESSOR TESTIMONY ATTRIBUTED". Their check-ins are their own account of their own
     * work, given on the understanding it stays theirs. Handing that to their replacement because
     * they left would make every honest answer in this product a hostage to somebody resigning.
     */
    const b = buildHandoverBrief(input({
      liveSubjects: [{ title: 'paying user pricing', lastMentionedAt: daysAgo(2) }],
    }), NOW);
    const keys = JSON.stringify(b).toLowerCase();
    for (const forbidden of ['quote', 'testimony', 'said', 'note', 'account of', 'transcript', 'turn']) {
      expect(Object.keys(b).join(' ').toLowerCase()).not.toContain(forbidden);
    }
    /* A subject travels as a title and a date. Nothing about it travels as content. */
    expect(b.liveSubjects).toEqual([{ title: 'paying user pricing', lastMentioned: '2026-02-27' }]);
    expect(keys).not.toContain('content');
  });

  it('and the source file never reads a turn', () => {
    const SRC = readFileSync(join(__dirname, 'what-the-leaver-knew.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const word of ['conversationTurn', 'assistantTurn', 'recordEntry', 'observationText']) {
      expect(SRC).not.toContain(word);
    }
  });

  it('says in the brief what is missing from it', () => {
    /*
     * A successor handed four lists reads them as the handover. They are the part a machine can
     * honestly produce, and saying so is what turns the brief from a substitute for a conversation
     * into a reason to have one.
     */
    const b = buildHandoverBrief(input(), NOW);
    expect(b.whatIsNotHere).toBe(WHAT_IS_NOT_HERE);
    /* Removed 22 November 2026: the assertion that the sentence says their words "stay theirs" (a privacy note on screen, which Hafsah's
       standards rule out). That nothing they said reaches the brief is still held by the shape tests above, unchanged. */
    expect(WHAT_IS_NOT_HERE).toMatch(/ask the people/);
  });
});

describe('what it puts first', () => {
  it('the commitments nobody has raised for longest', () => {
    const b = buildHandoverBrief(input({
      commitments: [
        { text: 'recent', state: CommitmentState.OPEN, dueAt: null, statedAt: daysAgo(2) },
        { text: 'ancient', state: CommitmentState.OPEN, dueAt: null, statedAt: daysAgo(90) },
      ],
    }), NOW);
    expect(b.openCommitments.map((c) => c.text)).toEqual(['ancient', 'recent']);
  });

  it('and drops the ones already settled', () => {
    const b = buildHandoverBrief(input({
      commitments: [
        { text: 'done', state: CommitmentState.KEPT, dueAt: null, statedAt: daysAgo(2) },
        { text: 'dropped', state: CommitmentState.DROPPED, dueAt: null, statedAt: daysAgo(2) },
        { text: 'slipped', state: CommitmentState.SLIPPED, dueAt: null, statedAt: daysAgo(2) },
      ],
    }), NOW);
    /* SLIPPED stays: it is outstanding, and it is the one most likely to be forgotten. */
    expect(b.openCommitments.map((c) => c.text)).toEqual(['slipped']);
  });

  it('and carries both directions of a handoff, because both are the successor\'s now', () => {
    const b = buildHandoverBrief(input({
      waitingOnOthers: [{ what: 'the pricing decision', status: DependencyStatus.WAITING, waitingDays: 30 }],
      owedToOthers: [{ what: 'the launch copy', status: DependencyStatus.BLOCKING, waitingDays: 5 }],
    }), NOW);
    expect(b.waitingOnOthers).toEqual([{ what: 'the pricing decision', days: 30 }]);
    expect(b.owedToOthers).toEqual([{ what: 'the launch copy', days: 5 }]);
  });

  it('and drops a handoff that is already cleared', () => {
    const b = buildHandoverBrief(input({
      owedToOthers: [{ what: 'done', status: DependencyStatus.CLEARED, waitingDays: 1 }],
    }), NOW);
    expect(b.owedToOthers).toEqual([]);
  });

  it('and the subjects that were live when they left', () => {
    const b = buildHandoverBrief(input({
      liveSubjects: [
        { title: 'old thing', lastMentionedAt: daysAgo(60) },
        { title: 'live thing', lastMentionedAt: daysAgo(1) },
      ],
    }), NOW);
    expect(b.liveSubjects.map((s) => s.title)).toEqual(['live thing', 'old thing']);
  });
});

describe('an empty brief', () => {
  it('is distinguishable from a brief that could not be built', () => {
    /* A successor told nothing will assume the second, and start their job believing the record
       of what they inherited was lost. */
    expect(isEmpty(buildHandoverBrief(input(), NOW))).toBe(true);
    expect(isEmpty(buildHandoverBrief(input({
      liveSubjects: [{ title: 'x', lastMentionedAt: NOW }],
    }), NOW))).toBe(false);
  });
});
