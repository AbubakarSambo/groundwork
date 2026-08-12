/**
 * A GROUND MADE IN THE ENTRY CHAT MUST GET A SECOND SESSION.
 *
 * Sessions after the first are created by `ConversationService.ensureNextSession`,
 * which runs when a check-in COMPLETES through the conversation service. The
 * anonymous entry flow never completes one: at commit it writes session 1 straight
 * to `COMPLETED` with a `completedAt`, because the conversation already happened
 * before the account existed.
 *
 * So every ground created the way most people first meet the product had exactly
 * one check-in, and nothing ever scheduled a second.
 *
 * WHAT THAT LOOKED LIKE, and why it was misdiagnosed twice. The ground page offers
 * "Session N is ready for you" only when an open check-in row exists. For these
 * grounds none ever did, so the offer never rendered, the Check-ins tab showed one
 * completed row, and there was no way to check in again. It was reported as a
 * missing button, and I recorded it as one. The button was fine. There was no
 * session for it to open.
 *
 * Held on the CALL rather than on the database, because the bug was that the call
 * did not happen. What `ensureNextSession` then decides - cadence, end date, the
 * planned-session cap - is its own logic and is tested with it.
 */

import { CheckInStatus } from '@prisma/client';

describe('committing a ground from the entry chat', () => {
  /** The commit path's two writes, in order, with the scheduling call captured. */
  function runCommit(opts: { throwOnSchedule?: boolean } = {}) {
    const calls: Array<{ groundId: string; participantId: string; sessionNumber: number }> = [];
    const created: any[] = [];
    const logged: string[] = [];

    const prisma = {
      checkIn: {
        create: async (args: any) => {
          created.push(args.data);
          return { id: 'ci1', ...args.data };
        },
      },
    };
    const conversation = {
      ensureNextSession: async (groundId: string, participantId: string, sessionNumber: number) => {
        calls.push({ groundId, participantId, sessionNumber });
        if (opts.throwOnSchedule) throw new Error('cadence lookup failed');
      },
    };
    const logger = { error: (m: string) => logged.push(m) };

    // The shape of the commit, as entry.service.ts performs it.
    const commit = async () => {
      await prisma.checkIn.create({
        data: {
          groundId: 'g1',
          participantId: 'p1',
          sessionNumber: 1,
          status: CheckInStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      await conversation
        .ensureNextSession('g1', 'p1', 1)
        .catch((e: any) => logger.error(`entry commit: could not schedule session 2 for ground g1: ${e?.message ?? e}`));
    };

    return commit().then(() => ({ calls, created, logged }));
  }

  it('writes session 1 as already complete, because the conversation already happened', async () => {
    const { created } = await runCommit();
    expect(created).toHaveLength(1);
    expect(created[0].sessionNumber).toBe(1);
    expect(created[0].status).toBe(CheckInStatus.COMPLETED);
    expect(created[0].completedAt).toBeInstanceOf(Date);
  });

  it('and then asks for the next one, which is what was missing', async () => {
    // THE ASSERTION THIS FILE EXISTS FOR.
    const { calls } = await runCommit();
    expect(calls).toEqual([{ groundId: 'g1', participantId: 'p1', sessionNumber: 1 }]);
  });

  it('passes session 1, not session 2, since ensureNextSession adds the one', async () => {
    // Off-by-one here would skip straight to session 3 and quietly lose a check-in
    // from everybody's plan.
    const { calls } = await runCommit();
    expect(calls[0].sessionNumber).toBe(1);
  });

  it('and a scheduling failure does not lose the ground', async () => {
    // Deliberate. A ground that exists with a saved record is worth more than one
    // that fails to commit because the follow-up could not be scheduled - the
    // record is the thing the person came for. It is logged, not swallowed.
    const { created, logged } = await runCommit({ throwOnSchedule: true });
    expect(created).toHaveLength(1);
    expect(logged.join(' ')).toMatch(/could not schedule session 2/);
  });
});

describe('the wiring itself', () => {
  it('ensureNextSession is callable from outside the conversation service', () => {
    // It was private. This is the seam the fix depends on, so it is asserted
    // rather than assumed: making it private again would break the entry flow in
    // exactly the way that is hard to notice.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../conversation/conversation.service.ts'),
      'utf8',
    );
    expect(src).toMatch(/\n  async ensureNextSession\(/);
    expect(src).not.toMatch(/private async ensureNextSession\(/);
  });

  it('and the entry commit actually calls it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'entry.service.ts'), 'utf8');
    expect(src).toMatch(/this\.conversation[\s\S]{0,40}\.ensureNextSession\(/);
  });

  it('IN commitInner, not merely somewhere in the file', () => {
    /**
     * THE ASSERTION THAT WOULD HAVE CAUGHT MY OWN MISTAKE.
     *
     * The first version of this fix went into `joinCommit` - the path for
     * somebody joining by broadcast link - and this spec passed, because it only
     * asked whether the call appeared anywhere in the file. The initiator's own
     * commit, which is the one that creates the ground from the entry chat, still
     * scheduled nothing. Green test, unfixed bug, and the exact shape of error
     * this codebase has hit repeatedly: a fix proved against its builder rather
     * than against the path it was meant to repair.
     *
     * So the call has to be inside commitInner, checked by slicing that method
     * out of the file rather than by trusting the whole-file match above.
     */
    const src: string = require('fs').readFileSync(require('path').join(__dirname, 'entry.service.ts'), 'utf8');
    const start = src.indexOf('private async commitInner(');
    expect(start).toBeGreaterThan(-1);
    // The next method declaration at class-member indent ends this one.
    const rest = src.slice(start + 10);
    const nextDecl = rest.search(/\n  (?:private )?async [a-zA-Z]/);
    const body = nextDecl === -1 ? rest : rest.slice(0, nextDecl);

    expect(body).toMatch(/ensureNextSession\(ground\.id, participant\.id, 1\)/);
    // And the documents from the entry chat are kept in the same method.
    expect(body).toMatch(/groundDocument[\s\S]{0,80}create\(/);
  });
});
