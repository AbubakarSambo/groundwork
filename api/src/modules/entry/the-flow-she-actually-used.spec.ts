import { EntryService } from './entry.service';

/**
 * THE FLOW SHE ACTUALLY USED. (W2, the half the first fix missed)
 *
 * The name restore was built, tested, bite-checked and wired into
 * conversation.service, which serves logged-in check-ins. Her walkthrough was
 * /entry, which is a different path that calls the model directly - so the fix
 * reached everything except the flow she found it in, and the next stranger to
 * type "microchipshit" would have read "Microchip Solutions" back exactly as she
 * did.
 *
 * A fix on the wrong path is worse than no fix, because the tests say it is done.
 *
 * So this asserts the two places she read the invented name: the reply on screen,
 * and the private report she was told to save.
 */

const HERS = [
  { role: 'user' as const, content: 'i hate my colleagues' },
  { role: 'assistant' as const, content: 'Tell me more.' },
  { role: 'user' as const, content: 'microchipshit and they were not happy so i had to step in' },
];

function makeService(reply: string, report?: any) {
  const anthropic: any = {
    respond: jest.fn(async () => reply),
    extract: jest.fn(async () => report ?? null),
  };
  const prisma: any = { ground: { findUnique: jest.fn(async () => null) } };
  // anthropic FIRST, then prisma. Getting this the wrong way round would have
  // produced a service whose model call is a Prisma client, which fails loudly -
  // unlike the positional mistake in the coaching spec earlier, which failed
  // quietly and in the safe direction.
  const service = new EntryService(
    anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { service, anthropic };
}

describe('the reply on screen', () => {
  it('gives her word back', async () => {
    // THE LIVE CASE, on the path she was on.
    const { service } = makeService('I have the client name: Microchip Solutions.');
    const out = await service.chat(HERS as any, 'PIP', 'A ground');
    expect(out).toMatch(/microchipshit/);
    expect(out).not.toMatch(/Microchip Solutions/);
  });

  it('leaves an ordinary reply exactly alone', async () => {
    const reply = 'What was the outcome of that call?';
    const { service } = makeService(reply);
    expect(await service.chat(HERS as any, 'PIP', 'A ground')).toBe(reply);
  });

  it('guards the FAQ branch as well, which is a different exit', async () => {
    // chat() has three exits and the next branch somebody adds would not have had
    // the restore on it - which is exactly how this got missed the first time. All
    // of them go through one helper now.
    const { service } = makeService('That would be Microchip Solutions.');
    const out = await service.chat(
      [{ role: 'user', content: 'what is microchipshit doing here?' }] as any,
      'PIP', 'A ground',
    );
    expect(out).toMatch(/microchipshit/);
  });
});

describe('the private report, which is the one she keeps', () => {
  const REPORT = {
    whatGroundworkSaw: 'You provided two specific examples (Microchip Solutions and Mass General) where you personally delivered a demo.',
    alignmentStatus: 'Clear',
    alignmentBasis: 'Microchip Solutions signed up afterwards.',
    areasRequiringAlignment: [
      { title: 'The team\'s role', observation: 'Microchip Solutions was rescued by you.', whyItMatters: 'x', recommendedMove: 'y' },
    ],
    alignmentReached: [{ title: 'Direct contribution', note: 'You delivered the Microchip Solutions demo.' }],
    honestClose: { aligned: 'a', open: 'b', revisit: 'c', risk: 'd' },
    mentionedPeople: [{ name: 'Microchip Solutions', context: 'A client whose business was secured.' }],
    suggestedParties: [],
  };

  it('restores the name everywhere in it, not just the summary', async () => {
    // She read it five times on one page: the summary, the basis, both findings,
    // and the people list. A named-fields fix would have left most of them.
    const { service } = makeService('x', REPORT);
    const out: any = await service.report(HERS as any, 'PIP', 'A ground');
    expect(JSON.stringify(out)).not.toMatch(/Microchip Solutions/);
    expect(out.whatGroundworkSaw).toMatch(/microchipshit/);
    expect(out.areasRequiringAlignment[0].observation).toMatch(/microchipshit/);
    expect(out.alignmentReached[0].note).toMatch(/microchipshit/);
  });

  it('and the client is still not offered as somebody to add', async () => {
    // W3 still holds after the restore walks the payload, which is the kind of
    // thing that breaks quietly when two fixes touch the same object.
    const { service } = makeService('x', REPORT);
    const out: any = await service.report(HERS as any, 'PIP', 'A ground');
    expect(out.mentionedPeople).toEqual([]);
    expect(out.alsoCameUp).toHaveLength(1);
    expect(out.alsoCameUp[0].name).toMatch(/microchipshit/);
  });

  it('leaves a report with nothing invented in it untouched', async () => {
    const clean = { ...REPORT, whatGroundworkSaw: 'You stepped in on a client call.', mentionedPeople: [], areasRequiringAlignment: [], alignmentReached: [] };
    const { service } = makeService('x', clean);
    const out: any = await service.report(HERS as any, 'PIP', 'A ground');
    expect(out.whatGroundworkSaw).toBe(clean.whatGroundworkSaw);
  });
});
