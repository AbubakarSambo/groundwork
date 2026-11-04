import { readFileSync } from 'fs';
import { join } from 'path';
import { TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { almostNothingHereYet } from './how-short-a-check-in-may-be';

/**
 * THE ENGINE MUST NOT OFFER TO CLOSE SOMETHING THE SERVER WILL REFUSE.
 *
 * The deadlock this file was written for (live Ground 1 runs): the engine signalled a close after two rich answers, the composer went
 * off, and complete() refused the record for being one answer short, with no way left to answer. It was fixed by making the close
 * signal read the server's floor of answers.
 *
 * Since 3 November 2026 there is no floor (Hafsah: no question limits and no forced close). The only bar on a close is the empty
 * record, and the engine's close (mayClose) and the server's completion (complete) read the same one, almostNothingHereYet, so the two
 * can still never disagree.
 */
function serviceWith(personSaid: string[]) {
  const turns = personSaid.map((c) => ({ role: TurnRole.PERSON, content: c }));
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ sessionNumber: 2, participant: { partyType: 'PARTICIPANT' }, ground: { cadence: 'WEEKLY', scenario: 'NEW_HIRE' } })) },
    conversationTurn: { findMany: jest.fn(async () => turns) },
  };
  return new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any) as any;
}

describe('the close signal and completion read one gate', () => {
  it('two rich answers close: no count of answers holds them', async () => {
    const turns = [
      "Abubakar. He's joining as a delivery lead, starting Monday. Run it for 90 days with weekly check-ins.",
      'Success at 90 days is that I can hand him a messy client problem and not think about it again.',
    ];
    expect(almostNothingHereYet(turns, false)).toBe(false);
    expect(await serviceWith(turns).mayClose('c1', false)).toEqual({ ready: true });
  });

  it('an empty record is held by both: the engine does not close what the server would refuse', async () => {
    const turns = ['ok', 'fine'];
    expect(almostNothingHereYet(turns, false)).toBe(true);
    expect(await serviceWith(turns).mayClose('c1', false)).toEqual({ ready: false });
  });

  it('a correction, which is short by nature, closes on one plain sentence', async () => {
    expect(almostNothingHereYet(['The deadline was March, not May.'], true)).toBe(false);
    expect(await serviceWith(['The deadline was March, not May.']).mayClose('c1', true)).toEqual({ ready: true });
  });

  it('complete() reads the same gate, and nothing else counts answers', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const complete = src.slice(src.indexOf('  async complete('), src.indexOf('return this.finishTheSession(checkIn, \'the person\''));
    expect(complete).toMatch(/almostNothingHereYet\(/);
    expect(src).not.toMatch(/theFloorFor|tooFewAnswersToFinish|closeReadiness\(/);
  });
});

describe('what the gate must never override', () => {
  /* Changed 3 November 2026: a finish is honoured at any point once anything real was said; "I need to go" alone keeps nothing. */
  it('always honours somebody asking to stop once they have said anything, whatever the count', async () => {
    expect(await serviceWith(['Kilele paid KES 40,000 on Monday.', 'I need to go']).mayClose('c1', false)).toEqual({ ready: true });
    expect(await serviceWith(['I need to go']).mayClose('c1', false)).toEqual({ ready: false });
    expect(await serviceWith(['We sent the Kilele quote on Tuesday.', "that's it from me"]).mayClose('c1', false)).toEqual({ ready: true });
  });
});
