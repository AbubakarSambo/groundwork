import { everyLineIsReadBeforeItIsKept, AReader, AnAsk, theRewritesById, theLinesToRewrite } from './every-line-is-read-before-it-is-kept';
import { ReportsService } from './reports.service';
import { whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * THE CHECK BEFORE A REPORT IS KEPT, THROUGH THE PRODUCT'S OWN DOOR.
 *
 * Every case renders the report the way the lead and the participant are served it
 * (`theReportAsItWasShared`, then the participant's filter), so what is checked is what is read.
 * The model is a stand-in that records what it was asked.
 */

const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
const BISI = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'bisi@bank.test', createdAt: at(1), user: { firstName: 'Bisi', lastName: 'Adeyemi' } };
const NATHAN = { id: 'p-nathan', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'nathan@bank.test', createdAt: at(2), user: { firstName: 'Nathan', lastName: 'Owusu' } };
const READERS: AReader[] = [{ participantId: 'p-lead', isLead: true }, { participantId: 'p-nathan', isLead: false }];

const door = Object.create(ReportsService.prototype) as ReportsService;
const ground = (report: any): any => ({ scenario: GroundScenario.PIP, peersVisibleToEachOther: true, participants: [BISI, NATHAN], report });
const named = (report: any, r: AReader) => door.theReportAsItWasShared(ground(report), r.participantId, r.isLead) as any;
const served = (report: any, r: AReader) => (r.isLead ? named(report, r) : whatAParticipantMayRead(named(report, r), { isLead: false, participantId: r.participantId }));

const FIELDS = ['sharedPicture', 'theOpening', 'agreements', 'divergences', 'centralQuestion', 'findings', 'theJudgement', 'overTime'];

function run(report: any, answer: (s: string) => string | null) {
  const asked: AnAsk[] = [];
  let calls = 0;
  return everyLineIsReadBeforeItIsKept({
    report, readers: READERS, named, served, fields: FIELDS,
    rewriteAll: async (asks) => {
      calls += 1;
      asked.push(...asks);
      const out: Record<string, string> = {};
      for (const a of asks) { const r = answer(a.sentence); if (r !== null) out[a.id] = r; }
      return out;
    },
  }).then((out) => ({ ...out, asked, calls }));
}

describe('every line is read, as each person reads it, before the report is kept', () => {
  it('a line with nothing wrong costs no model call and is kept as it is', async () => {
    const report = { sharedPicture: 'Both people have checked in. The initiator says the target is eight renewals.' };
    const out = await run(report, () => 'never asked');
    expect(out.asked).toEqual([]);
    expect(out.report).toEqual(report);
  });

  it('a pronoun that disagrees with the reader is found in the render, and the rewrite is kept', async () => {
    /* Stored in labels, it looks fine; Nathan reads "You say their goal is ...". */
    const report = { findings: [{ text: 'Participant A says their goal is to exceed the targets they are given.', label: 'Participant A', hasGap: false, participantId: 'p-nathan' }] };
    const out = await run(report, () => "Participant A says Participant A's goal is to exceed the targets Participant A is given.");
    expect(out.asked).toHaveLength(1);
    expect(out.asked[0].problems).toEqual(['a pronoun that disagrees with the reader']);
    expect(out.asked[0].asRead).toBe('You say their goal is to exceed the targets they are given.');
    expect(out.done[0].outcome).toBe('rewritten');
    /* What Nathan now reads, and what his lead reads. */
    expect(served(out.report, READERS[1]).findings[0].text).toBe('You say your goal is to exceed the targets you are given.');
    /* Run-25: the second "Nathan's" in a sentence about Nathan is "their own". */
    expect(served(out.report, READERS[0]).findings[0].text).toBe('Nathan Owusu says their own goal is to exceed the targets Nathan is given.');
  });

  it('a pattern used as a label on the reader is rewritten to say what happened, not who they are (decision 11)', async () => {
    const report = { sharedPicture: 'Both people have answered. Participant A has a pattern of replacing a decision with a conversation about the decision.' };
    const out = await run(report, () => 'Three times, a decision has become a conversation about the decision.');
    expect(out.asked[0].sentence).toBe('Participant A has a pattern of replacing a decision with a conversation about the decision.');
    expect(out.asked[0].problems).toEqual(['a pattern used as a label on a person, rather than saying what happened']);
    expect(out.done[0].outcome).toBe('rewritten');
    expect(served(out.report, READERS[1]).sharedPicture).toBe('Both people have answered. Three times, a decision has become a conversation about the decision.');
    expect(served(out.report, READERS[1]).sharedPicture).not.toMatch(/\bpattern\b/);
  });

  it('a lower-case start is rewritten once, and the rewrite is kept only if it reads clean', async () => {
    /* A lower-case start is a stray full stop, so the sentence before it is part of what is rewritten. */
    const report = { sharedPicture: 'Both people have answered. The initiator counted 25 open applications. the officers\' own numbers add up to 64.' };
    const out = await run(report, () => "The initiator counted 25 open applications, and the officers' own numbers add up to 64.");
    expect(out.asked[0].sentence).toBe("The initiator counted 25 open applications. the officers' own numbers add up to 64.");
    expect(out.done.map((d) => d.outcome)).toEqual(['rewritten']);
    expect(named(out.report, READERS[0]).sharedPicture).toBe("Both people have answered. You counted 25 open applications, and the officers' own numbers add up to 64.");
  });

  it('a rewrite that still fails is not kept, and the sentence is dropped', async () => {
    const report = { sharedPicture: 'Both people have answered. 1 people said the date was Friday. The initiator agrees.' };
    const out = await run(report, () => '1 people said it again.');
    expect(out.done).toEqual([expect.objectContaining({ outcome: 'dropped', was: '1 people said the date was Friday.' })]);
    expect(out.report.sharedPicture).toBe('Both people have answered. The initiator agrees.');
  });

  it('a rewrite that changes a quotation is thrown away, and the quote itself is never rewritten', async () => {
    const report = { sharedPicture: 'Both people have answered. Participant A said "I sent it on Friday", 1 people agree.' };
    const out = await run(report, () => 'Participant A said "I sent it on Thursday", and one person agrees.');
    expect(out.done[0].outcome).toBe('dropped');
    expect(out.report.sharedPicture).toBe('Both people have answered.');
    /* Words inside marks are theirs: a fault there is not a fault to fix. */
    const theirs = { sharedPicture: 'Participant A wrote "the initiator. said this was for: nothing" in the notes.' };
    const left = await run(theirs, () => 'never asked');
    expect(left.asked).toEqual([]);
    expect(left.report).toEqual(theirs);
  });

  it('a dropped sentence that was the whole of a list item takes the item with it', async () => {
    const report = { agreements: ['1 people agree on the date.', 'Both of you agree the target is eight.'] };
    const out = await run(report, () => null);
    expect(out.report.agreements).toEqual(['Both of you agree the target is eight.']);
  });

  it('but a field on its own is never left blank', async () => {
    const report = { centralQuestion: '1 people answered, so what is the target?' };
    const out = await run(report, () => null);
    expect(out.report.centralQuestion).toBe('1 people answered, so what is the target?');
    expect(out.done[0].outcome).toBe('left, it could not be fixed and may not be dropped');
  });

  it('a doubtful catch is only ever rewritten, never dropped', async () => {
    const report = { sharedPicture: 'Participant A says they expect eight renewals from their clients.' };
    const out = await run(report, () => null);
    expect(out.report).toEqual(report);
    expect(out.done[0].outcome).toBe('left, it could not be fixed and may not be dropped');
  });

  it('asks about the same sentence once, wherever it appears', async () => {
    const line = 'Both people have answered. The initiator has checked in. the target is eight.';
    const report = { sharedPicture: line, theOpening: line };
    const out = await run(report, () => 'The initiator has checked in, and the target is eight.');
    expect(out.asked).toHaveLength(1);
    const now = 'Both people have answered. The initiator has checked in, and the target is eight.';
    expect(out.report).toEqual({ sharedPicture: now, theOpening: now });
  });

  it('reads only what each person is served: the lead\'s judgement is checked as the lead reads it', async () => {
    const report = { theJudgement: { theGap: 'The initiator counted the open applications. the officers counted 64.' } };
    const out = await run(report, () => 'The initiator counted the open applications, and the officers counted 64.');
    expect(out.asked).toHaveLength(1);
    expect(out.asked[0].asRead).toBe('You counted the open applications. the officers counted 64.');
    expect(named(out.report, READERS[0]).theJudgement.theGap).toBe('You counted the open applications, and the officers counted 64.');
    /* And the participant, who is never served the judgement, cost nothing and changed nothing. */
    expect(served(out.report, READERS[1]).theJudgement).toBeUndefined();
  });

  it('sends every failing line of the report in ONE model call, each by id, and drops a line that does not come back', async () => {
    const report = {
      sharedPicture: 'Both people have answered. 1 people said the date was Friday.',
      agreements: ['1 people agree on the target.', 'Both of you agree the target is eight.'],
      findings: [{ text: 'Participant A says their goal is to exceed the targets they are given.', label: 'Participant A', hasGap: false, participantId: 'p-nathan' }],
    };
    const out = await run(report, (s) => (s.startsWith('Participant A says') ? "Participant A says Participant A's goal is to exceed the targets Participant A is given." : null));
    expect(out.calls).toBe(1);
    expect(out.asked.map((a) => a.id)).toEqual(['l1', 'l2', 'l3']);
    expect(out.report.sharedPicture).toBe('Both people have answered.');
    expect(out.report.agreements).toEqual(['Both of you agree the target is eight.']);
    expect(served(out.report, READERS[1]).findings[0].text).toBe('You say your goal is to exceed the targets you are given.');
  });

  it('a report with nothing wrong makes no call at all', async () => {
    const out = await run({ sharedPicture: 'Both people have answered.' }, () => 'never');
    expect(out.calls).toBe(0);
  });

  it('reads the model\'s answer by id, whatever order it comes back in, and ignores what it cannot use', () => {
    expect(theRewritesById({ lines: [{ id: 'l2', sentence: 'B.' }, { id: 'l1', sentence: 'A.' }, { id: 3, sentence: 'x' }, null] })).toEqual({ l1: 'A.', l2: 'B.' });
    expect(theRewritesById('not json')).toEqual({});
    expect(theLinesToRewrite([{ id: 'l1', sentence: 'S.', problems: ['p'], asRead: 'R.' }])).toContain('id: l1');
  });
});
