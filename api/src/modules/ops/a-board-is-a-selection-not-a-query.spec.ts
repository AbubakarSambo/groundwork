/**
 * Every number on every board comes from the registry.
 *
 * The rule this protects is the one that makes the whole detection layer worth
 * having: a number can always be opened onto its rows. It breaks one board at a
 * time — somebody needs a figure the registry does not have, writes the query
 * next to the template because that is quicker, and now there is one number on
 * one page that nobody can check. It looks exactly like the others.
 *
 * So a board is a LIST OF KEYS. There is no place to put a query.
 */
import { BOARDS, BOARDS_BY_KEY } from './what-each-person-opens-to';
import { METRICS_BY_KEY } from './a-number-you-can-open';
import { OPS_CAPABILITIES, DEFAULT_GRANTS } from './what-somebody-may-do';
import { OpsMetricsService } from './ops-metrics.service';

describe('the boards', () => {
  it('exist, so nothing below passes on an empty list', () => {
    expect(BOARDS.length).toBeGreaterThan(0);
    expect(BOARDS_BY_KEY.size).toBe(BOARDS.length);
  });

  it('name only metrics the registry actually has', () => {
    const missing: string[] = [];
    for (const board of BOARDS) {
      for (const key of board.metrics) {
        if (!METRICS_BY_KEY.has(key)) missing.push(`${board.key} -> ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('and land on capabilities that exist', () => {
    const unknown = BOARDS.flatMap((b) =>
      b.landsFor.filter((c) => !(OPS_CAPABILITIES as readonly string[]).includes(c)).map((c) => `${b.key} -> ${c}`),
    );
    expect(unknown).toEqual([]);
  });

  it('and say what question each one answers', () => {
    const silent = BOARDS.filter((b) => !b.answers.includes('?')).map((b) => b.key);
    expect(silent).toEqual([]);
  });

  it('and every role in the company lands somewhere', () => {
    const homeless = Object.entries(DEFAULT_GRANTS)
      .filter(([, granted]) => !BOARDS.some((b) => b.landsFor.some((c) => granted.includes(c))))
      .map(([role]) => role);
    expect(homeless).toEqual([]);
  });
});

describe('a board computed for one person', () => {
  const prisma = new Proxy({}, { get: () => ({ findMany: async () => [] }) }) as never;
  const service = new OpsMetricsService(prisma);
  const person = (capabilities: string[]) => ({
    personId: 'p',
    key: 'k',
    displayName: 'K',
    functionalRole: 'CEO' as const,
    capabilities,
  });

  it('returns every number the caller may hold', async () => {
    const board = await service.board(person([...OPS_CAPABILITIES]), 'ceo', {
      from: new Date('2026-09-01'),
      to: new Date('2026-09-30'),
    });
    expect(board.numbers.length).toBe(BOARDS_BY_KEY.get('ceo')!.metrics.length);
    expect(board.hiddenFromYou).toEqual([]);
  });

  it('and drops the ones they may not, rather than showing them empty', async () => {
    /**
     * Asserted against the CAPABILITY each metric declares, not against its
     * name. The first version checked that every visible key started with
     * `sales.` - which was true, and was a proxy: the moment commercial and
     * positioning metrics joined that board, all of them readable with
     * sales:read, a correct board failed a test that had nothing to say about
     * it. A rule about permissions has to read permissions.
     */
    const board = await service.board(person(['sales:read']), 'sales', {
      from: new Date('2026-09-01'),
      to: new Date('2026-09-30'),
    });

    const shown = board.numbers.map((n) => METRICS_BY_KEY.get(n.key)!);
    expect(shown.every((m) => m.capability === 'sales:read')).toBe(true);
    expect(board.hiddenFromYou.length).toBeGreaterThan(0);
  });

  it('but names what it dropped, so the board is honest about itself', async () => {
    const board = await service.board(person(['sales:read']), 'sales', {
      from: new Date('2026-09-01'),
      to: new Date('2026-09-30'),
    });
    expect(board.hiddenFromYou).toContain('deployment.blocked');
  });

  it('and every number on it arrives with its rows', async () => {
    const board = await service.board(person([...OPS_CAPABILITIES]), 'ceo', {
      from: new Date('2026-09-01'),
      to: new Date('2026-09-30'),
    });
    for (const number of board.numbers) {
      expect(Array.isArray(number.rows)).toBe(true);
      expect(number.counts.length).toBeGreaterThan(0);
    }
  });

  it('is offered when it is yours, or when you can see all of it', () => {
    const offered = service.boardsFor(person(['contributor:self', 'sprint:read'])).boards.map((b) => b.key);
    expect(offered).toContain('contributor');
    expect(offered).not.toContain('ceo');
  });

  it('and half a board is never offered as a whole one', () => {
    /**
     * A contributor holding sprint:read was being shown "Running the company",
     * because two of its eleven numbers happened to be sprint counts. A board
     * that presents itself as the company's command centre while showing a
     * ninth of it is worse than not offering it: they may still open those two
     * numbers directly, which they can.
     */
    const partial = service.boardsFor(person(['sprint:read']));
    expect(partial.boards.map((b) => b.key)).not.toContain('ceo');
  });

  it('and a contributor still lands somewhere when they hold almost nothing', () => {
    /**
     * Written after this test failed for real. With only contributor:self they
     * saw ZERO boards, because their board's one company-wide number needs
     * sprint:read — and the thing they actually come for, their standing
     * against their six, is not a metric at all. A person whose home page is
     * empty concludes the system is not for them, which for the people bringing
     * us companies is the worst possible conclusion.
     */
    const result = service.boardsFor(person(['contributor:self']));
    expect(result.lands).toBe('contributor');
    expect(result.boards.length).toBeGreaterThan(0);
  });

  it('and every board says what it shows about the person, not just the company', () => {
    const empty = BOARDS.filter((b) => b.personalPanels.length === 0).map((b) => b.key);
    expect(empty).toEqual([]);
  });
});
