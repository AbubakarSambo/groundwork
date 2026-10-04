import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { targetsFor, UNLESS_SOMEBODY_SAYS } from './whose-number-is-whose-business';
import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';
import { prismaFor } from './__fixtures__/a-page-that-contradicts-itself';

/**
 * THE RULE WAS RIGHT, WRITTEN ONCE, AND USED ONCE.
 *
 * `targetsFor` has existed since targets gained owners, and it says the thing this product believes:
 * a person sees their own number and the total it belongs to, and nobody else's, unless the lead
 * chose otherwise. It had exactly one caller - the conversation.
 *
 * The board showed every owned target to everybody, and read `whoSeesTargets` only to nudge the lead
 * about targets that had no owner. The ground read - which the whole Context tab renders from - sent
 * `ownerParticipantId` for every row, filtered by nobody. So the rule held in the one place somebody
 * had remembered it and nowhere else, which is the same shape as `isCovered` being used in billing
 * and no gate.
 *
 * Asked of the real read on 23 September 2026, as a participant on a default THEIR_OWN ground: two
 * numbers that were not hers, one of them her colleague's and one the lead's. The same symptom the
 * expectations fix was written for, back through a second field.
 */
describe('a number with somebody\'s name on it', () => {
  const t = (name: string, target: number, owner: string | null) => ({ name, target, ownerParticipantId: owner });
  const all = [t('the whole team', 500, null), t('hers', 150, 'rita'), t('his', 150, 'kunle'), t('the lead\'s', 50, 'lead')];

  it('reaches its owner, the lead, and nobody else', () => {
    const hers = targetsFor(all, 'rita', 'their own');
    expect(hers.shown.map((x) => x.name)).toEqual(['the whole team', 'hers']);
    /* The whole it belongs to, because a number with no whole is a chore rather than a target. */
    expect(hers.alsoSay).toBeTruthy();
    expect(targetsFor(all, 'lead', 'their own', { isLead: true }).shown).toHaveLength(4);
    expect(targetsFor(all, 'rita', 'everybody').shown).toHaveLength(4);
  });

  it('and the default is the narrow one', () => {
    expect(UNLESS_SOMEBODY_SAYS).toBe('their own');
  });
});

/**
 * AND EVERY SURFACE THAT SHOWS A TARGET ASKS IT.
 *
 * Three surfaces render targets: the conversation, the board, and the ground read behind the Context
 * tab. Each one that hands out `ownerParticipantId` has to have gone through `targetsFor` first, and
 * this fails on a fourth that forgets - which is how the second one happened.
 */
describe('every surface that hands out whose number it is', () => {
  const API = join(__dirname, '../..');
  const walk = (at: string, out: string[] = []): string[] => {
    for (const name of readdirSync(at)) {
      const p = join(at, name);
      if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== 'dist') walk(p, out); }
      else if (/\.ts$/.test(p) && !/\.spec\.ts$/.test(p)) out.push(p);
    }
    return out;
  };

  /**
   * EVERY FILE THAT TOUCHES THE COLUMN IS EITHER A READER THAT ASKS THE RULE, OR ON THIS LIST.
   *
   * Classified rather than pattern-matched, because the pattern cannot tell a surface handing a
   * number to a person from code that writes an owner or adds figures up. A new file touching the
   * column fails here and somebody has to say which of the two it is - the same shape as the mail
   * classification that caught two unclassified senders earlier today.
   */
  const NOT_HANDING_IT_TO_A_READER: Record<string, string> = {
    'modules/board/board.listener.ts': 'writes owners onto targets read out of a sheet',
    /* Request 76: the owner of a deal, a release or a deadline (WorkItem), never of a target. The board serves those rows behind its own walls. */
    'modules/board/the-kind-of-work.ts': 'the owner of a record of the kind of work, such as a deal or a deadline, not of a target',
    'modules/documents/documents.service.ts': 'writes owners when a document of targets is read',
    'modules/documents/what-a-document-holds.ts': 'the shape a document is read into, before anybody reads it',
    /* 30 September (58960b6d): the one write, on a yes, of the owners a document's read already resolved. */
    'modules/documents/write-a-documents-numbers.ts': 'writes the owners a document read resolved, once somebody says yes',
    /* Week 13: the one place it names an owner is the goal it writes when the lead confirms a
       proposal from their own plan. Every proposal route is the lead's alone (403 for everyone else). */
    /* Ask Groundwork's recall (f25e97d9) selects each target's owner only to hand it to
       targetsHiddenFrom, which asks targetsFor itself; it never serves an owner or a number. */
    'modules/assistant/assistant.service.ts': 'reads owners only to hand them to targetsHiddenFrom, which asks the one rule; serves neither',
    'modules/grounds/a-plan-is-many-proposals.service.ts': 'writes an owner onto a goal the lead confirmed from their own plan; only the lead reads proposals',
    /*
     * Arithmetic, not a field: the report selects the column to add per-person figures up for the
     * synthesis. What the report RENDERS goes through its own reader wall - own-reads-only and
     * a-manager-sees-the-report-not-the-words - which is a different rule with different questions
     * about departments and exact words. Whether that wall says the same thing as this one about a
     * peer's target is a question of its own and is not answered here.
     */
    'modules/reports/reports.service.ts': 'adds per-person figures up for the synthesis; its own reader wall decides what renders',
    /* Week 16: rows a test hands the report and the board, which then go through targetsFor there. */
    'modules/reports/__fixtures__/today-sales-team.ts': 'test rows for the week 16 specs; what-today-reads-from-the-record asks targetsFor',
    /* 1 October (ece6f8cd): joins rows that are one thing. It reads the owner only to keep two people's
       numbers apart, and it is handed `out.objectives` after the board has asked targetsFor, so it
       only ever sees what this reader may read. Proved below on the real board, as each reader. */
    'modules/board/one-count-per-thing.ts': 'joins rows the board already passed through targetsFor; it reads the owner only to keep two people apart',
    /* Week 12b (d45afaca): the shape of one target in a week, and the sentence for it. It is handed only
       the rows the-weekly-report.service.ts has already passed through targetsFor for this reader. */
    'modules/reports/the-weekly-report.ts': 'the shape and sentence of a target in a week; its service asks targetsFor before handing rows in',
    /* Hafsah, 4 October (decision 89): the four suites files are excused. None shows anybody a number
       they could not already read. */
    'modules/suites/__fixtures__/aisha-review.ts': 'test rows a review spec hands in, like the other fixtures here',
    'modules/suites/a-week-drafted-from-the-record.ts': "reads only the person's own work records to draft their own week; never a target",
    'modules/suites/what-they-own-while-away.ts': "reads only a target's name and due date, never its number, for a reader who may read that board",
    'modules/suites/the-record-read-for-a-review.ts': "the person's own goals, served only to them and whoever runs that check-in, no wider than targetsFor",
    /* Request 70: the forecast reads the owner only to leave out a target that is one person's. It is handed
       `out.objectives` after the board has asked targetsFor, so it only ever sees what this reader may read. */
    'modules/board/the-switchboards-own-sections.ts': 'the forecast reads the owner only to leave one person\'s number out; it is handed rows the board passed through targetsFor',
    /* Request 110: a person's own aim kept only as their promise is put among the rows the board then passes through targetsFor, before any reader is served. */
    'modules/board/an-aim-kept-only-as-their-promise.ts': 'builds rows the board adds to ground.objectives before it asks targetsFor; serves nobody itself',
    'modules/board/__fixtures__/a-page-that-contradicts-itself.ts': 'test rows for a-board-that-does-not-contradict-itself; the board asks targetsFor',
    /* Anchor piece 24: it reads the owner of an aim only to see whether an aim has no owner. It reads no
       number and no target, and what it writes is offered to the lead alone (the 'recommended check-ins'). */
    'modules/detectors/the-anchor-recommendations.ts': 'reads only whether an aim has an owner, never a number; the offer it writes is the lead\'s alone',
    /* Request 117: the sales board as the fifth review read it; the board asks targetsFor over these rows. */
    'modules/board/__fixtures__/sales-board-review-5.ts': 'test rows for the request 117 specs; the board asks targetsFor',
  };

  it('goes through the one rule, or says why it is not a reader', () => {
    const offenders: string[] = [];
    for (const file of walk(API)) {
      const rel = file.slice(API.length + 1);
      if (rel.endsWith('whose-number-is-whose-business.ts')) continue;
      if (rel in NOT_HANDING_IT_TO_A_READER) continue;
      const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (!/ownerParticipantId:/.test(src)) continue;
      if (!/targetsFor\(/.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  /* And nothing on that list has quietly become a reader since. */
  it('and the ones excused are still not readers', () => {
    for (const rel of Object.keys(NOT_HANDING_IT_TO_A_READER)) {
      const src = readFileSync(join(API, rel), 'utf8');
      expect(src).not.toMatch(/out\.objectives\s*=|objectives: targetsFor|objectives: \(\(ground/);
    }
  });

  /* And the three that do, so a caller cannot be quietly removed either. */
  it('and all three of them still call it', () => {
    for (const rel of [
      'modules/conversation/conversation.service.ts',
      'modules/board/board.service.ts',
      'modules/grounds/grounds.service.ts',
    ]) {
      expect(readFileSync(join(API, rel), 'utf8')).toMatch(/targetsFor\(/);
    }
  });

  /*
   * AND THE TWO FIELDS ON ONE RESPONSE AGREE ABOUT ONE READER.
   *
   * The expectations path narrows on `!viewerIsInitiator`; the targets path is handed the same
   * `viewerIsInitiator`. Two rules for one reader on one payload is how the Context tab came to
   * withhold somebody's expectations and publish their number in the same breath.
   */
  it('and the ground read asks one question about who is reading', () => {
    const src = readFileSync(join(API, 'modules/grounds/grounds.service.ts'), 'utf8');
    expect(src).toMatch(/const peersKeepTheirNumbers =\s*\n?\s*!viewerIsInitiator/);
    const at = src.indexOf('objectives: targetsFor(');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 420)).toMatch(/\{ isLead: viewerIsInitiator \}/);
  });
});

/*
 * AND THE STEP THAT JOINS ONE THING'S ROWS ONLY EVER SEES WHAT THE READER MAY READ (1 October 2026).
 * `oneCountPerThing` runs after `targetsFor` on the board, so nobody reads a colleague's number
 * through a row it joined. Read on the sales board of api/journey/all-24/re-a, where Ngozi and Kwame
 * each hold 14 approved facilities and the lead holds the team's 40.
 */
describe('one count per thing, as each reader reads it', () => {
  async function boardFor(userId: string, role = 'MEMBER') {
    const { prisma } = prismaFor('sales', role);
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    return (await svc.get('g-credit', userId)) as any;
  }
  const owners = (b: any) => (b.objectives as any[]).filter((o) => o.target === 14).map((o) => o.ownerParticipantId).sort();

  it('the lead, Bisi, reads both people\'s 14', async () => {
    expect(owners(await boardFor('u-bisi'))).toEqual(['p-kwame', 'p-ngozi']);
  });
  it('Kwame reads his own 14 and not Ngozi\'s', async () => {
    expect(owners(await boardFor('u-kwame'))).toEqual(['p-kwame']);
  });
  it('Femi, who holds no 14, reads neither', async () => {
    expect(owners(await boardFor('u-femi'))).toEqual([]);
  });
  /* Decision 86 reverses decision 73 for admins: this used to pin that an admin read neither. */
  it('an admin not in the check-in reads both, as the lead does', async () => {
    expect(owners(await boardFor('u-admin', 'ADMIN'))).toEqual(['p-kwame', 'p-ngozi']);
  });
});
