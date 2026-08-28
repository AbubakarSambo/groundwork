import { PrismaService } from '../prisma/prisma.service';

/**
 * A GROUND'S DETECTION, MIRRORED INTO THE ORG LAYER.
 *
 * Same shape as the commitment mirror and for the same reason. `PatternDetection` stays
 * authoritative for its ground; this is the copy that outlives it, so a behaviour can be watched
 * across check-ins rather than only inside one.
 *
 * Best-effort, always. A mirror that fails must never fail the detection it was mirroring - the
 * ground's own row is the one that matters.
 */
export async function mirrorDetection(
  prisma: PrismaService,
  args: {
    organizationId: string;
    groundId: string;
    patternDetectionId: string;
    personExternalId: string | null;
    code: string;
    periodsObserved: number;
    observationText: string | null;
  },
): Promise<boolean> {
  try {
    await prisma.detectorResult.upsert({
      where: { sourcePatternDetectionId: args.patternDetectionId },
      create: {
        organizationId: args.organizationId,
        personExternalId: args.personExternalId,
        key: args.code,
        /*
         * Severity comes from persistence rather than from the code. The three-period rule already
         * encodes the product's view that one observation is a moment and three is a pattern, and
         * restating that as a per-code table would be a second opinion about the same thing.
         */
        severity: args.periodsObserved >= 3 ? 'high' : args.periodsObserved >= 2 ? 'medium' : 'low',
        evidence: { observation: args.observationText, periodsObserved: args.periodsObserved } as any,
        sourceGroundId: args.groundId,
        sourcePatternDetectionId: args.patternDetectionId,
      },
      update: {
        severity: args.periodsObserved >= 3 ? 'high' : args.periodsObserved >= 2 ? 'medium' : 'low',
        evidence: { observation: args.observationText, periodsObserved: args.periodsObserved } as any,
        lastSeenAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}
