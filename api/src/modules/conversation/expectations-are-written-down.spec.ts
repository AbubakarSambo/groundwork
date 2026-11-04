import { ConversationService } from './conversation.service';
import { PartyType, TurnRole } from '@prisma/client';

/**
 * THE INTERVIEW'S ANSWERS GET KEPT. GW-EXP-1b.
 *
 * Slice 1a gave the lead's session the per-person questions and proved in a live run that it asks them
 * and then asks whether the person knows. This is the half that writes the answers down. Without it the
 * conversation is good and `personObjective` stays at the zero rows it has held for the product's whole
 * life, which is the state that started this whole piece of work.
 *
 * FOUR THINGS ARE LOAD-BEARING:
 *  1. Initiator only. Expectations have one author.
 *  2. A name that matches nobody is DROPPED. Lifted from `extractWorkMentions`, whose comment says
 *     "unresolved name: dropped, never guessed" - an expectation on the wrong person is worse than a
 *     missing one, because somebody gets measured against a thing that was never about them.
 *  3. `awareness` is stored. A live session volunteers "your record now shows that gap clearly" to a
 *     lead who has told nobody, and that sentence is a lie unless the gap is on the row.
 *  4. `seenBySubject` is false on creation. It is the only thing stopping somebody being read against
 *     an expectation they have never laid eyes on.
 */
function makeService(over: {
  partyType?: PartyType;
  extraction?: any;
  participants?: any[];
  prior?: { text: string } | null;
} = {}) {
  const upsert = jest.fn(async (a: any) => a);
  const createMany: jest.Mock = jest.fn(async () => ({ count: 1 }));
  const participants = over.participants ?? [
    { id: 'lead', partyType: PartyType.INITIATOR, managingOnly: false, email: 'sahar@x.test', roleAsDescribed: null, user: { firstName: 'Sahar', lastName: 'Jamal' } },
    { id: 'abu', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'abubakar@x.test', roleAsDescribed: 'New delivery lead', user: { firstName: 'Abubakar', lastName: null } },
  ];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ participants })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: 'I expect Abubakar to own the weekly call, and delivery end to end in 90 days.' }]) },
    /**
     * `findUnique` reads the PRIOR text, so a changed expectation can reset `seenBySubject`. Returning
     * `over.prior ?? null` lets a test say "there was already something there" and check the reset.
     */
    /**
     * THE WRITE IS NO LONGER AN UPSERT ON ONE ROW PER PERSON.
     *
     * `person_objectives` was unique per person, so a lead stating a commitment AND a standing role
     * expectation about the same person stored one and silently dropped the other. The service now
     * looks for a row with the SAME PERSON AND SAME KIND - a revision - and creates a new row for a
     * different kind, so both `create` and `update` are mocked here.
     */
    personObjective: {
      findFirst: jest.fn(async () => over.prior ?? null),
      create: upsert,
      update: upsert,
      findUnique: jest.fn(async () => over.prior ?? null),
    },
    groundObjective: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [] as any[]), createMany },
  };
  const anthropic: any = {
    extract: jest.fn(async () => over.extraction ?? {
      expectations: [{ personName: 'Abubakar', expectation: 'Own the weekly delivery call by week four', awareness: 'NOT_TOLD', awarenessDetail: 'I assumed Hafsah covered it' }],
    }),
  };
  const svc = new ConversationService(
    prisma, {} as any, anthropic, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { svc, prisma, upsert, createMany, anthropic };
}

/* The aims are read by the lead's assessment now (one source, 2 November 2026) and kept by the one writer of the team's aims. */
const herAimKept = (svc: any) => svc.keepTheTeamsAims('g1', 'lead', [{ name: 'He owns delivery end to end in 90 days', target: 90 }], ['I expect Abubakar to own the weekly call, and delivery end to end in 90 days.']);

describe('GW-EXP-1b: the lead sets expectations OF people; a person records their own', () => {
  /*
   * THIS USED TO ASSERT THAT A PARTICIPANT'S SESSION WROTE NOTHING AT ALL.
   *
   * That was right while there was one prompt. Its rules forbid the speaker recording anything
   * about themselves - correct for a lead's session, and the reason a new hire's own promises
   * ("three proposals by the thirtieth") were never written down as anything a later check-in
   * could return to. They lived as loose text in a transcript.
   *
   * The rule that actually matters is unchanged and is what this now checks: the LEAD's prompt,
   * which writes expectations ABOUT other people, is never pointed at anybody else. A person's own
   * promises go down their own prompt and land on themselves, authored by them.
   */
  it('never runs the lead’s prompt for anybody but the lead', async () => {
    const { svc, anthropic } = makeService({
      participants: [{ id: 'abu', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'a@x.test', roleAsDescribed: null, user: null }],
    });
    await svc.extractExpectations('c1', 'abu', 'g1');
    const prompts = (anthropic.extract as jest.Mock).mock.calls.map((c: any[]) => String(c[0]));
    expect(prompts.some((p) => p.includes('From the transcript of the person RUNNING this check-in'))).toBe(false);
  });

  it('and writes nothing about anybody else from a participant’s session', async () => {
    /* An expectation set on somebody else is the lead's to set. A participant recording one about
       a colleague is the failure this whole guard exists to prevent. */
    const { svc, upsert } = makeService({
      participants: [{ id: 'abu', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'a@x.test', roleAsDescribed: null, user: null }],
    });
    await svc.extractExpectations('c1', 'abu', 'g1');
    for (const call of (upsert as jest.Mock).mock.calls) {
      const data = call[0]?.data ?? call[0]?.create ?? {};
      if (data.participantId) expect(data.participantId).toBe('abu');
    }
  });
});

describe('GW-EXP-1b: what gets written', () => {
  it('the expectation lands on the right person, in the lead’s words', async () => {
    const { svc, upsert } = makeService();
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0] as any;
    /** A create now carries the ids in `data`; there is no where/create pair any more. */
    expect(arg.data.participantId).toBe('abu');
    expect(arg.data.text).toBe('Own the weekly delivery call by week four');
    expect(arg.data.authoredBy).toBe('lead');
  });

  it('awareness is stored, which is the point of the whole thing', async () => {
    const { svc, upsert } = makeService();
    await svc.extractExpectations('c1', 'lead', 'g1');
    const arg = upsert.mock.calls[0][0] as any;
    expect(arg.data.awareness).toBe('NOT_TOLD');
    expect(arg.data.awarenessDetail).toBe('I assumed Hafsah covered it');
  });

  it('and the person has not seen it, so nothing may be read against it yet', async () => {
    const { svc, upsert } = makeService();
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect((upsert.mock.calls[0][0] as any).data.seenBySubject).toBe(false);
  });

  it('a junk awareness value falls back to NOT_ASKED rather than being stored raw', async () => {
    const { svc, upsert } = makeService({
      extraction: { groundAims: [], expectations: [{ personName: 'Abubakar', expectation: 'x', awareness: 'PROBABLY' }] },
    });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect((upsert.mock.calls[0][0] as any).data.awareness).toBe('NOT_ASKED');
  });

  it('the check-in’s own aims fill the other empty table', async () => {
    const { svc, createMany } = makeService();
    await herAimKept(svc);
    expect(createMany).toHaveBeenCalled();
    expect((createMany.mock.calls[0][0] as any).data[0].name).toBe('He owns delivery end to end in 90 days');
  });

  it('with the number they said, which used to be thrown away', async () => {
    const { svc, createMany } = makeService();
    await herAimKept(svc);
    expect((createMany.mock.calls[0][0] as any).data[0].target).toBe(90);
  });

  it('does not duplicate an aim they restate', async () => {
    /*
     * This used to refuse everything once ANY objective existed, so a lead naming a second aim in
     * session four was dropped in silence. Matched by name now: the one they restated is skipped and
     * nothing else is refused.
     */
    const { svc, prisma, createMany } = makeService();
    prisma.groundObjective.findMany = jest.fn(async () => [{ name: 'He owns delivery end to end in 90 days' }] as any[]);
    await herAimKept(svc);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('but does write a new one alongside aims that already exist', async () => {
    const { svc, prisma, createMany } = makeService();
    prisma.groundObjective.findMany = jest.fn(async () => [{ name: 'Something else entirely' }] as any[]);
    await herAimKept(svc);
    expect(createMany).toHaveBeenCalled();
    expect((createMany.mock.calls[0][0] as any).data[0].name).toBe('He owns delivery end to end in 90 days');
  });
});

describe('GW-EXP-1b: a name that matches nobody is dropped, never guessed', () => {
  it.each(['Dana', 'the delivery team', 'nobody'])('drops %p', async (name) => {
    const { svc, upsert } = makeService({
      extraction: { groundAims: [], expectations: [{ personName: name, expectation: 'something', awareness: 'TOLD' }] },
    });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('and matches on the role when somebody has no account yet', async () => {
    /** An invited person with no name still has a role, and that is how the lead referred to them. */
    const { svc, upsert } = makeService({
      extraction: { groundAims: [], expectations: [{ personName: 'New delivery lead', expectation: 'own the call', awareness: 'TOLD' }] },
    });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('and never writes an expectation about the lead themselves', async () => {
    const { svc, upsert } = makeService({
      extraction: { groundAims: [], expectations: [{ personName: 'Sahar Jamal', expectation: 'run it well', awareness: 'TOLD' }] },
    });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(upsert).not.toHaveBeenCalled();
  });
});


/**
 * A CHANGED EXPECTATION IS AN UNSEEN EXPECTATION. GW-EXP-4.
 *
 * A defect I shipped in the extraction and caught by reading `proposeObjective`, which has always
 * reset the flag on a rewrite with the reasoning attached: "carrying the old seenBySubject: true
 * forward would let a changed target be read against somebody who never saw the change."
 *
 * My upsert carried it forward. The consequence was quiet and live: a lead restating an expectation
 * differently in a later session left the person marked as having seen words they never saw, and the
 * gap probe then pressed them on it in their very next session. The single protection this design
 * keeps from the old model, defeated by an update clause.
 */
describe('GW-EXP-4: changed words are unseen words', () => {
  it('a different expectation resets seenBySubject', async () => {
    const { svc, upsert } = makeService({ prior: { text: 'Something else entirely' } });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect((upsert.mock.calls[0][0] as any).data.seenBySubject).toBe(false);
  });

  it('but repeating the same expectation does not', async () => {
    /**
     * The other half, and it matters as much: resetting on every session would make an unchanged
     * expectation permanently unseen, so nothing could ever be read against it and the gap probe
     * would never fire.
     */
    const { svc, upsert } = makeService({ prior: { text: 'Own the weekly delivery call by week four' } });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect((upsert.mock.calls[0][0] as any).data.seenBySubject).toBeUndefined();
  });

  it('and a brand new expectation starts unseen anyway', async () => {
    const { svc, upsert } = makeService({ prior: null });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect((upsert.mock.calls[0][0] as any).data.seenBySubject).toBe(false);
  });
});

describe('a target the person never said is not written', () => {
  it('keeps the aim and drops the number', async () => {
    /* Run 4, 20 Sep 2026: "50kg bags" became a N50m target. */
    const { svc, createMany } = makeService();
    await svc.keepTheTeamsAims('g1', 'lead', [{ name: 'N50m in sales to the northern dealers', target: 50_000_000 }], ['We moved about 50kg bags to the northern dealers.']);
    const written = (createMany.mock.calls[0]?.[0] as any)?.data?.[0];
    expect(written?.name).toBe('N50m in sales to the northern dealers');
    expect(written?.target).toBeNull();
  });
});
