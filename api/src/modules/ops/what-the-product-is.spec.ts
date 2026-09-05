/**
 * THE STATEMENT LIVED INSIDE ONE OF THE DOCUMENTS IT GOVERNS.
 *
 * Slide three of the sales deck says what this product is and what it is not,
 * and every marketing check in the plan holds a resource up against it. A deck
 * is a file somebody edits and re-sends; nothing in the system could read it,
 * and nothing could tell you which version a piece of marketing had been
 * checked against.
 */
import { BadRequestException } from '@nestjs/common';
import { OpsProductStatementService } from './ops-product-statement.service';
import { WHAT_WE_SAY_WE_ARE, whatItMustNotBecome, whyThisStatementIsNotUsable } from './what-the-product-is';

describe('the words we carried across', () => {
  it('are the deck’s, not a paraphrase', () => {
    /* A statement rewritten to sound better than the one the company actually
       uses is a second positioning, and then there are two. */
    expect(WHAT_WE_SAY_WE_ARE.headline).toBe('Groundwork is about the groundwork, not all the work.');
    expect(WHAT_WE_SAY_WE_ARE.isNotIt).toContain('A permanent evaluation layer');
    expect(WHAT_WE_SAY_WE_ARE.isNotIt).toContain('A file anybody is building on anybody');
  });

  it('carry the refusals, which are the half that does the work', () => {
    expect(whatItMustNotBecome()).toHaveLength(4);
  });
});

describe('a statement that cannot be checked against', () => {
  it('is refused when it says nothing about what this is', () => {
    expect(whyThisStatementIsNotUsable({ isIt: ['a'], isNotIt: ['b'] })).toMatch(/says what this is/);
  });

  it('is refused when it refuses nothing', () => {
    /* "What it is" reads much the same for every product. Without the second
       half there is nothing for a deck to violate. */
    expect(whyThisStatementIsNotUsable({ headline: 'x', isIt: ['a'], isNotIt: [] })).toMatch(
      /marketing actually violates/,
    );
  });

  it('is accepted with both halves', () => {
    expect(whyThisStatementIsNotUsable(WHAT_WE_SAY_WE_ARE)).toBeNull();
  });
});

const serviceOver = (versions: Array<Record<string, unknown>>) => {
  const written: Record<string, unknown>[] = [];
  const service = new OpsProductStatementService({
    opsProductStatement: {
      findFirst: async () => versions[0] ?? null,
      findMany: async () => versions,
      create: async ({ data }: never) => {
        written.push(data as Record<string, unknown>);
        return data;
      },
    },
  } as never);
  return { service, written };
};

const usable = {
  headline: 'Groundwork is about the groundwork.',
  saidOutLoud: 'If nothing needs deciding, there is nothing to open.',
  isIt: ['Opened at a specific moment'],
  isNotIt: ['Another dashboard to maintain'],
};

describe('what we currently say', () => {
  it('falls back to the deck rather than to nothing', async () => {
    /* An empty statement would make every marketing check pass, which is the
       worst possible default for a gate. */
    const { service } = serviceOver([]);
    const now = await service.current();
    expect(now.headline).toBe(WHAT_WE_SAY_WE_ARE.headline);
    expect(now.version).toBe(0);
  });

  it('says when it is the deck’s words and not a decision made here', async () => {
    const { service } = serviceOver([]);
    expect((await service.current()).seeded).toBe(true);
  });

  it('and stops saying it once somebody has set one', async () => {
    const { service } = serviceOver([{ version: 3, ...usable }]);
    const now = await service.current();
    expect(now.seeded).toBe(false);
    expect(now.version).toBe(3);
  });
});

describe('saying it differently', () => {
  it('writes a new version rather than editing', async () => {
    /* A sign-off records which version it was checked against. Editing in place
       makes every past sign-off a claim about a document nobody can read. */
    const { service, written } = serviceOver([{ version: 4, ...usable }]);
    await service.say({ ...usable, because: 'We stopped selling the coaching hours' }, 'hafsah');
    expect(written[0]).toMatchObject({ version: 5, writtenBy: 'hafsah' });
  });

  it('starts at one on an empty system, and needs no reason for the first', async () => {
    const { service, written } = serviceOver([]);
    await service.say(usable, 'hafsah');
    expect(written[0]).toMatchObject({ version: 1 });
  });

  it('refuses a later version that does not say why it changed', async () => {
    const { service } = serviceOver([{ version: 1, ...usable }]);
    await expect(service.say(usable, 'hafsah')).rejects.toThrow(/Say why it changed/);
  });

  it('refuses one that refuses nothing', async () => {
    const { service } = serviceOver([]);
    await expect(service.say({ ...usable, isNotIt: [] }, 'hafsah')).rejects.toThrow(BadRequestException);
  });

  it('drops blank lines rather than storing an empty refusal', async () => {
    const { service, written } = serviceOver([]);
    await service.say({ ...usable, isNotIt: ['Another dashboard', '', '  '] }, 'hafsah');
    expect(written[0].isNotIt).toEqual(['Another dashboard']);
  });
});
