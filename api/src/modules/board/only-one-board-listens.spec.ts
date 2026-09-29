import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BoardService } from './board.service';

/**
 * THE BOARD IS WARMED ONCE FOR EACH CHECK-IN THAT CHANGES IT (decision 44).
 *
 * On run-19 every finished check-in warmed the board twice, 18 warm-ups for 9 check-ins, each asking
 * the model for the same lines at the same moment. The public API module listed BoardService among
 * its own providers, so Nest built it twice and both copies listened for every check-in.
 *
 * Two checks. Every class that listens for an event is provided by exactly one module, so no
 * listener is built twice again, whichever it is. And the board's own warm-up, fired again and again
 * for the same ground, runs once; a check-in that brings something new runs it again.
 */
const SRC = join(__dirname, '..', '..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const FILES = walk(SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

describe('no listener is built twice', () => {
  const listeners = FILES
    .filter((f) => /@OnEvent\(/.test(readFileSync(f, 'utf8')))
    .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/export class (\w+)/g)].map((m) => m[1]));
  const modules = FILES.filter((f) => f.endsWith('.module.ts')).map((f) => ({ f, src: strip(readFileSync(f, 'utf8')) }));
  const providedIn = (cls: string) => modules.filter(({ src }) => {
    const providers = src.match(/providers:\s*\[([\s\S]*?)\]/);
    return !!providers && new RegExp(`\\b${cls}\\b`).test(providers[1]);
  }).map(({ f }) => f.slice(SRC.length + 1));

  it('finds the listeners it is checking', () => {
    expect(listeners).toEqual(expect.arrayContaining(['BoardService', 'ReportsListener', 'PatternsListener']));
  });

  it.each(listeners.map((c) => [c]))('%s is provided by one module only', (cls) => {
    expect(providedIn(cls).length).toBeLessThanOrEqual(1);
  });

  it('the public API reaches the board by importing its module', () => {
    const api = modules.find(({ f }) => f.endsWith('public-api.module.ts'))!.src;
    expect(api).toMatch(/imports:\s*\[[\s\S]*\bBoardModule\b/);
    expect(providedIn('BoardService')).toEqual(['modules/board/board.module.ts']);
  });
});

describe('the board warm-up runs once for each new thing', () => {
  let completedAt = new Date('2026-09-29T17:40:00Z');
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-lead' })) },
    checkIn: { aggregate: jest.fn(async () => ({ _count: { _all: 9 }, _max: { completedAt } })) },
    recordEntry: { aggregate: jest.fn(async () => ({ _count: { _all: 40 }, _max: { createdAt: completedAt } })) },
    groundDocument: { count: jest.fn(async () => 0) },
    groundObjective: { aggregate: jest.fn(async () => ({ _count: { _all: 5 }, _max: { updatedAt: null } })) },
    groundDependency: { aggregate: jest.fn(async () => ({ _count: { _all: 0 }, _max: { updatedAt: null } })) },
    groundParticipant: { count: jest.fn(async () => 9) },
    report: { findUnique: jest.fn(async () => ({ updatedAt: completedAt })) },
  };
  const event = { checkInId: 'c1', groundId: 'g-cohort', participantId: 'p1', sessionNumber: 1 };
  let board: BoardService;
  let reads: jest.SpyInstance;
  beforeEach(() => {
    completedAt = new Date('2026-09-29T17:40:00Z');
    board = new BoardService(prisma, {} as any, {} as any, {} as any);
    /* The board read itself, as the warm-up asks for it; slow enough that triggers overlap it. */
    reads = jest.spyOn(board, 'get').mockImplementation(async () => { await new Promise((r) => setTimeout(r, 20)); return {} as any; });
  });

  it('fired five times one after another for the same check-in: read once', async () => {
    for (let n = 0; n < 5; n++) await board.warmOnCheckInCompleted(event);
    expect(reads).toHaveBeenCalledTimes(1);
    expect(reads).toHaveBeenCalledWith('g-cohort', 'u-lead', expect.anything(), { mayWordNewLines: true });
  });

  it('fired five times at once for the same check-in: read once', async () => {
    await Promise.all([1, 2, 3, 4, 5].map(() => board.warmOnCheckInCompleted(event)));
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it('a check-in that lands while one warm-up runs gets exactly one more, which reads it', async () => {
    const first = board.warmOnCheckInCompleted(event);
    completedAt = new Date('2026-09-29T17:42:00Z');
    await Promise.all([first, board.warmOnCheckInCompleted(event), board.warmOnCheckInCompleted(event), board.warmOnCheckInCompleted(event)]);
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it('a later check-in is a new thing, and the board is read again', async () => {
    await board.warmOnCheckInCompleted(event);
    completedAt = new Date('2026-09-29T17:45:00Z');
    await board.warmOnCheckInCompleted({ ...event, participantId: 'p2' });
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it('each ground is its own warm-up', async () => {
    await Promise.all([board.warmOnCheckInCompleted(event), board.warmOnCheckInCompleted({ ...event, groundId: 'g-other' })]);
    expect(reads).toHaveBeenCalledTimes(2);
  });
});
