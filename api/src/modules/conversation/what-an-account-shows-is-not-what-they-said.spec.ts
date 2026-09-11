import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';
import { CheckInStatus, PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { theInstruction, withoutTheirWords, sourceHashOf, A_READ_IS_DERIVED } from './what-an-account-shows';

/**
 * WHAT AN ACCOUNT SHOWS IS NOT WHAT THEY SAID.
 *
 * The lead's route returned raw turns. It returns a read of each completed account against what the
 * check-in asks - and the structure, not the prompt, is what keeps their words out of it: screened
 * at every read, made once and kept, marked derived.
 */
const THEIRS = [
  'We agreed the March deadline with the supplier and then it moved to May without anybody telling me.',
  'I have chased the invoice three times and the finance team say it is with legal.',
];

describe('the screen at the read', () => {
  it('withholds a sentence that repeats a run of their words, and says how many', () => {
    const out = withoutTheirWords(
      'The account raises a moved deadline. They said it moved to May without anybody telling me, which is a fact. The invoice is stuck.',
      THEIRS,
    );
    expect(out.text).toBe('The account raises a moved deadline. The invoice is stuck.');
    expect(out.withheld).toBe(1);
  });

  it('withholds anything quoted', () => {
    const out = withoutTheirWords('Delivery slipped. They described it as "with legal". Nothing on the objective.', THEIRS);
    expect(out.text).toBe('Delivery slipped. Nothing on the objective.');
    expect(out.withheld).toBe(1);
  });

  it('leaves a read that is its own words alone', () => {
    const out = withoutTheirWords('The account shows the deadline moved once and the invoice is unpaid. It does not speak to onboarding.', THEIRS);
    expect(out.withheld).toBe(0);
  });
});

describe('the instruction', () => {
  const asks = { label: 'Q3 delivery', scenario: 'NEW_PROJECT', brief: 'Whether the supplier change is working.', objectives: [{ name: 'On-time delivery', target: 'Every milestone by its date' }] };

  it('is built from what the check-in is meant to find out, not from a request to paraphrase', () => {
    const text = theInstruction(asks, PartyType.PARTICIPANT, 'Ops lead');
    expect(text).toContain('Whether the supplier change is working.');
    expect(text).toContain('On-time delivery - Every milestone by its date');
    expect(text).toContain('Ops lead');
    expect(text).not.toMatch(/paraphrase/i);
  });

  it('forbids quoting, scoring and comparing, and asks for silence to be named', () => {
    const text = theInstruction(asks, PartyType.INITIATOR);
    expect(text).toMatch(/Never quote them/);
    expect(text).toMatch(/no score, no rating, no comparison/);
    expect(text).toMatch(/does not speak to a question, say so/);
  });

  it('a changed transcript is a new key; an unchanged one is the same key', () => {
    expect(sourceHashOf(THEIRS)).toBe(sourceHashOf([...THEIRS]));
    expect(sourceHashOf(THEIRS)).not.toBe(sourceHashOf([THEIRS[0]]));
  });
});

describe('the route', () => {
  const service = (o: { kept?: string | null } = {}) => {
    const respond = jest.fn(async () => 'The account shows the deadline moved once. It does not speak to onboarding.');
    const upserts: any[] = [];
    const prisma: any = {
      ground: {
        findFirst: jest.fn(async ({ where }: any) => (where.initiatorId !== 'lead' ? null : {
          id: 'g', label: 'Q3', scenario: null, brief: 'b', objectives: [],
          participants: [{
            id: 'p1', email: 'a@b.c', partyType: PartyType.PARTICIPANT, roleAsDescribed: null,
            checkIns: [{ id: 'ci-done', sessionNumber: 1, completedAt: new Date() }],
          }],
        })),
      },
      conversationTurn: { findMany: jest.fn(async () => THEIRS.map((content) => ({ content }))) },
      whatAnAccountShows: {
        findUnique: jest.fn(async () => (o.kept ? { text: o.kept } : null)),
        upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }),
      },
    };
    const svc = new ConversationService(prisma, {} as any, { respond } as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, { get: () => undefined } as any);
    return { svc, prisma, respond, upserts };
  };

  it('returns what each account shows and never a turn or its content', async () => {
    const { svc } = service();
    const res: any = await svc.whatTheAccountsShow('g', 'lead');
    expect(JSON.stringify(res)).not.toMatch(/"turns"|"content"/);
    expect(res.participants[0].sessions[0]).toMatchObject({ checkInId: 'ci-done', derived: true, withheld: 0 });
    expect(res.participants[0].sessions[0].shows).toMatch(/deadline moved once/);
    expect(res.meaning).toBe(A_READ_IS_DERIVED);
  });

  it('asks only for completed sessions', async () => {
    const { svc, prisma } = service();
    await svc.whatTheAccountsShow('g', 'lead');
    const select = prisma.ground.findFirst.mock.calls[0][0].select;
    expect(select.participants.select.checkIns.where).toEqual({ status: CheckInStatus.COMPLETED });
  });

  it('is made once and kept, and a kept read is screened again rather than trusted', async () => {
    const fresh = service();
    await fresh.svc.whatTheAccountsShow('g', 'lead');
    expect(fresh.respond).toHaveBeenCalledTimes(1);
    expect(fresh.upserts[0].create).toMatchObject({ checkInId: 'ci-done', sourceHash: sourceHashOf(THEIRS) });

    const kept = service({ kept: 'Kept read. They said it moved to May without anybody telling me here.' });
    const res: any = await kept.svc.whatTheAccountsShow('g', 'lead');
    expect(kept.respond).not.toHaveBeenCalled();
    expect(res.participants[0].sessions[0].shows).toBe('Kept read.');
    expect(res.participants[0].sessions[0].withheld).toBe(1);
  });

  it('is the lead’s alone', async () => {
    const { svc } = service();
    await expect(svc.whatTheAccountsShow('g', 'somebody')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and the raw route is gone from the grounds service', () => {
    /* Comments stripped first: this repository quotes code inside its own explanations. */
    const src = readFileSync(join(__dirname, '../grounds/grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/async getConversation\(/);
  });
});
