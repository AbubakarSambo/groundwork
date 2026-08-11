import { ConversationService } from './conversation.service';

/**
 * WHEN ASKING HAS STOPPED WORKING, SHOW.
 *
 * An eighteen-ground org run had someone reach eight check-ins with "nothing
 * specific named yet" against her name on the board. The read was accurate and
 * fairly worded. It was also no use to her: every one of those sessions had
 * asked her a different way, and re-angling a question only helps someone who
 * already has the answer and is not volunteering it. Someone who does not know
 * what a checkable answer looks like needs to be shown one.
 *
 * That person is usually the one with the least practice at being asked to
 * account for their work - so a product that notices and never helps lands
 * hardest exactly where it should land softest.
 *
 * What these tests hold is the difference between showing and grading. The
 * engine may demonstrate; it may never tell someone their answers have been
 * thin, and it may never compare them to anyone.
 */

function serviceWithHistory(levels: (string | null)[]) {
  // levels[0] is the most recent session - the query orders sessionNumber desc.
  const priorCheckIns = levels.map((level, i) => ({
    id: `ci${i}`,
    sessionNumber: levels.length - i,
    specificityLevel: level,
    specificityDimensions: null,
  }));
  const prisma: any = {
    checkIn: { findMany: jest.fn(async () => priorCheckIns) },
    recordEntry: {
      findMany: jest.fn(async () => [
        { type: 'TENSION', text: 'the handover with Priya is still unclear' },
      ]),
    },
  };
  return new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
}

const build = (svc: any) => svc['buildReturningUserContext']('p1', 5) as Promise<string>;

describe('showing an example, once asking has failed repeatedly', () => {
  it('does not fire after a single thin session - one quiet week is a week', async () => {
    const block = await build(serviceWithHistory(['vague', 'specific', 'specific']));
    expect(block).not.toMatch(/SHOW them instead/);
  });

  it('fires once the record has come back thin two sessions running', async () => {
    const block = await build(serviceWithHistory(['vague', 'vague', 'specific']));
    expect(block).toMatch(/SHOW them instead/);
  });

  it('carries a concrete, checkable example rather than an instruction to be specific', async () => {
    const block = await build(serviceWithHistory(['managed', 'vague', 'vague']));
    // A date, a name, and an outcome - the shape of something that can be
    // checked later, which is the whole point of the record.
    expect(block).toMatch(/something like:/i);
    expect(block).toMatch(/14th/);
  });

  it('never grades the person, and never compares them to anyone', async () => {
    const block = await build(serviceWithHistory(['vague', 'vague', 'vague', 'vague']));
    for (const forbidden of [
      /your answers have been (vague|thin|poor)/i,
      /compared to/i,
      /other participants?/i,
      /underperform/i,
      /not good enough/i,
    ]) {
      expect(block).not.toMatch(forbidden);
    }
    // And it says the quiet part to the model out loud, so the model does not
    // invent a judgement to fill the gap.
    expect(block).toMatch(/is not failing/i);
  });

  it('tells the engine to let it go rather than press twice', async () => {
    const block = await build(serviceWithHistory(['vague', 'vague']));
    expect(block).toMatch(/do not repeat the example/i);
    expect(block).toMatch(/take what they give you and move on/i);
  });

  it('counts only a RUN of thin sessions, not thin sessions scattered about', async () => {
    // Thin, then a good one, then thin: the person can clearly do it, so the
    // example is not what is missing.
    const block = await build(serviceWithHistory(['vague', 'specific', 'vague', 'vague']));
    expect(block).not.toMatch(/SHOW them instead/);
  });
});
