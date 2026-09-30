/**
 * WHAT BACKED A DETECTION IS STORED, AND KEPT UPDATED (decision 57, item 4).
 *
 * `mergedEvidenceSource` is the rule for combining what a detection was already backed by with what
 * a later period adds: once two separate reads have agreed even once, that stays true, the same way
 * a pattern once SURFACED never becomes unsurfaced. `observe`/`observePositive` on PatternsService
 * are the two places it is actually written, on create and on every later update.
 */
import { mergedEvidenceSource } from './pattern-library';
import { PatternsService } from './patterns.service';
import { PatternStatus } from '@prisma/client';

describe('mergedEvidenceSource', () => {
  it('is the incoming read when nothing was stored before', () => {
    expect(mergedEvidenceSource(null, 'model')).toBe('model');
    expect(mergedEvidenceSource(undefined, 'both')).toBe('both');
  });

  it('keeps what was stored when this period adds nothing new', () => {
    expect(mergedEvidenceSource('model', undefined)).toBe('model');
  });

  it('upgrades to "both" the moment the rule ever agrees', () => {
    expect(mergedEvidenceSource('model', 'both')).toBe('both');
  });

  it('never downgrades away from "both", even if a later period is model-only', () => {
    expect(mergedEvidenceSource('both', 'model')).toBe('both');
    expect(mergedEvidenceSource('both', undefined)).toBe('both');
  });

  it('is null when nothing has ever said what backed it', () => {
    expect(mergedEvidenceSource(null, undefined)).toBeNull();
  });
});

describe('PatternsService.observe/observePositive store and merge evidenceSource', () => {
  function prismaWith(existing: any) {
    const create = jest.fn(async (args: any) => ({ id: 'new-id', ...args.data }));
    const update = jest.fn(async (args: any) => ({ ...existing, ...args.data }));
    const prisma: any = {
      patternDetection: {
        findUnique: jest.fn(async () => existing),
        create,
        update,
      },
      groundParticipant: { findUnique: jest.fn(async () => null) },
    };
    return { prisma, create, update };
  }

  it('observe() writes evidenceSource on a brand-new detection', async () => {
    const { prisma, create } = prismaWith(null);
    const svc: any = new PatternsService(prisma, {} as any);
    // createAndMirror -> patternDetection.create, then a mirror lookup this test does not need to satisfy fully.
    jest.spyOn(svc, 'createAndMirror').mockImplementation(async (data: any) => create({ data }));
    await svc.observe('g1', 'p1', 'B2', 'Something happened.', 1, 'model');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidenceSource: 'model' }) }));
  });

  it('observe() upgrades a stored "model" to "both" when a later period\'s rule agrees', async () => {
    const existing = { id: 'pd1', lastPeriodNumber: 1, periodsObserved: 1, seenInSessions: [1], status: PatternStatus.CANDIDATE, evidenceSource: 'model', readyAt: null };
    const { prisma, update } = prismaWith(existing);
    const svc: any = new PatternsService(prisma, {} as any);
    await svc.observe('g1', 'p1', 'B2', 'Something happened again.', 2, 'both');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidenceSource: 'both' }) }));
  });

  it('observe() keeps "both" even when a later period comes back model-only', async () => {
    const existing = { id: 'pd1', lastPeriodNumber: 1, periodsObserved: 1, seenInSessions: [1], status: PatternStatus.SURFACED, evidenceSource: 'both', readyAt: new Date() };
    const { prisma, update } = prismaWith(existing);
    const svc: any = new PatternsService(prisma, {} as any);
    await svc.observe('g1', 'p1', 'B2', 'Still happening.', 2, 'model');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidenceSource: 'both' }) }));
  });

  it('observePositive() writes evidenceSource "rule" for a rule-only positive signal (e.g. R3)', async () => {
    const { prisma, create } = prismaWith(null);
    const svc: any = new PatternsService(prisma, {} as any);
    await svc.observePositive('g1', 'p1', 'R3', 'Named Ngozi with specific evidence.', 1, 'rule');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidenceSource: 'rule' }) }));
  });
});
