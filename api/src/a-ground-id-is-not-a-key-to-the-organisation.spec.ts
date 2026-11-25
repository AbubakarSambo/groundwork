import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingService } from './modules/billing/billing.service';
import { AlignmentService } from './modules/alignment/alignment.service';
import { AssertionsService } from './modules/alignment/assertions.service';
import { AgreementsService } from './modules/alignment/agreements.service';
import { DraftsService } from './modules/drafts/drafts.service';
import { GroundsByApiService } from './modules/public-api/grounds-by-api.service';
import { GroundsService } from './modules/grounds/grounds.service';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A GROUND ID IS NOT A KEY TO THE ORGANISATION.
 *
 * One cause in ten places: a handler resolved a row by its own id, and the organisation, the party
 * or the role was asserted in a comment rather than in the query. Each case below is a member of
 * the right organisation who is not entitled to the thing, or a credential fenced to some people
 * asking about another - and each is refused before anything is written or returned.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The free extension this checked is gone with the free plan (22 November 2026): the only free plan is the free trial. */
describe('money', () => {
  it('there is no free extension to spend on anybody else’s ground', () => {
    expect((BillingService.prototype as any).claimFreeExtension).toBeUndefined();
  });
});

describe('the alignment writes ask whether the ground is here first', () => {
  const prisma = (): any => ({
    ground: { findFirst: jest.fn(async () => null) },
    reportedFigure: { create: jest.fn() },
    assertion: { create: jest.fn() },
    agreement: { create: jest.fn() },
    agreementVersion: { create: jest.fn() },
  });

  it('a figure', async () => {
    const p = prisma();
    const svc = new AlignmentService(p);
    await expect(svc.recordFigure('org', 'g-elsewhere', { says: 'x', minorUnits: 1, currency: 'GBP', periodFrom: new Date(), periodTo: new Date(), source: 'somebody said so', statedBy: 'a', from: 'b' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(p.reportedFigure.create).not.toHaveBeenCalled();
  });

  it('an assertion', async () => {
    const p = prisma();
    const svc = new AssertionsService(p);
    await expect(svc.said('org', 'g-elsewhere', { claim: 'the deal was approved on Tuesday', about: 'timing', by: 'a', theOtherSide: 'b' })).rejects.toBeInstanceOf(NotFoundException);
    expect(p.assertion.create).not.toHaveBeenCalled();
  });

  it('an agreement', async () => {
    const p = prisma();
    const svc = new AgreementsService(p);
    await expect(svc.start('org', 'g-elsewhere', 'x', new Date())).rejects.toBeInstanceOf(NotFoundException);
    expect(p.agreement.create).not.toHaveBeenCalled();
    expect(p.agreementVersion.create).not.toHaveBeenCalled();
  });

  it('and speaking for a side reads the initiator of a ground in THIS organisation', () => {
    const src = strip(readFileSync(join(__dirname, 'modules/alignment/agreements.service.ts'), 'utf8'));
    const at = src.indexOf('private async mustBeAbleToSpeakForThisSide(');
    expect(src.slice(at, at + 400)).toMatch(/where: \{ id: groundId, organizationId \}/);
  });
});

describe('a draft is the business of the people on it', () => {
  const svc = (draftFor: (externalId: string) => any) => {
    const prisma: any = {
      objectiveDraft: { findFirst: jest.fn(async ({ where }: any) => draftFor(where.OR[0].initiatorExternalId)) },
      draftContention: { findMany: jest.fn(async () => []), update: jest.fn() },
    };
    const s = Object.create(DraftsService.prototype) as DraftsService;
    (s as any).prisma = prisma;
    return { s, prisma };
  };

  it('somebody in the organisation who is neither the starter nor a participant sees no status', async () => {
    const { s, prisma } = svc(() => null);
    await expect(s.status('org', 'd1', 'stranger')).rejects.toBeInstanceOf(NotFoundException);
    const where = prisma.objectiveDraft.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 'd1', organizationId: 'org' });
    expect(where.OR).toEqual([{ initiatorExternalId: 'stranger' }, { participants: { some: { personExternalId: 'stranger' } } }]);
  });

  it('and cannot settle a disagreement or seed it either', async () => {
    const { s } = svc(() => null);
    await expect(s.resolveContention('org', 'd1', 'c1', 'the second one', 'stranger')).rejects.toBeInstanceOf(NotFoundException);
    await expect(s.seed('org', 'd1', 'ext', 'hris', 'stranger')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('a fenced credential', () => {
  const fence = { boundToPersonExternalIds: ['p-allowed'] } as any;
  const svc = () => {
    const s = Object.create(GroundsByApiService.prototype) as GroundsByApiService;
    (s as any).prisma = { person: { findFirst: jest.fn(async () => { throw new Error('should have been refused before any read'); }) } };
    return s;
  };

  it('cannot read how somebody else’s forecasts went', async () => {
    await expect(svc().howTheirForecastsHaveGone('org', 'p-other', fence)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('nor what the record holds about them before a conversation', async () => {
    await expect(svc().beforeAConversation('org', 'p-other', fence)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and the findings list filters through the same fence', () => {
    const src = strip(readFileSync(join(__dirname, 'modules/detectors/detectors.controller.ts'), 'utf8'));
    const at = src.indexOf('async findings(');
    expect(src.slice(at, at + 900)).toMatch(/mayTouch\(req\.machine, r\.personExternalId\)/);
  });
});

describe('reading one ground', () => {
  it('a member who is neither lead nor party is told it is not there, as the list already tells them', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', initiatorId: 'lead', participants: [{ userId: 'party' }] })), findFirst: jest.fn() },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org' })) },
    };
    const svc = Object.create(GroundsService.prototype) as GroundsService;
    (svc as any).prisma = prisma;
    await expect(svc.get('g', 'org', 'member')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ground.findFirst).not.toHaveBeenCalled();
  });

  it('the rating route is a platform admin’s, as its sibling already was', () => {
    const src = strip(readFileSync(join(__dirname, 'modules/patterns/patterns.controller.ts'), 'utf8'));
    const at = src.indexOf("@Patch(':id/rate')");
    expect(src.slice(at, at + 200)).toMatch(/@UseGuards\(PlatformAdminGuard\)/);
    expect(src).not.toMatch(/@Roles\(Role\.ADMIN\)/);
  });
});
