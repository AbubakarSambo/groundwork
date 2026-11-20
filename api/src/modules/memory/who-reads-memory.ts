import { runsItForAPattern } from '../patterns/who-reads-a-pattern';
import type { AMemoryFile, ReaderKind } from './the-memory-format';

/**
 * WHO MAY READ WHICH SECTION OF A MEMORY FILE. The one place that decides it (docs/groundwork-memory-system.md, section 9).
 *
 * It asks nothing new: whoever runs a check-in is `runsItForAPattern` (its lead, or the admin who set it up for them, never every admin of
 * the organisation), an admin is an admin of this organisation, and a person on a check-in is a participant who has not left. A section is
 * read by anybody it names; a reader the file does not name reads nothing of it.
 */

export interface TheReader {
  userId: string;
  organizationId: string;
  isAdmin: boolean;
  /** The check-ins this reader runs. */
  runs: ReadonlySet<string>;
  /** The check-ins this reader takes part in, with their own participant id in each. */
  takesPartIn: ReadonlyMap<string, string>;
}

/** What a reader is, from the record. Anything that cannot be read leaves the reader with no rights beyond the organisation's own. */
export async function theReaderOf(prisma: any, userId: string, organizationId: string): Promise<TheReader> {
  const membership = await prisma.organizationMembership?.findUnique?.({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch?.(() => null);
  const grounds: any[] = (await prisma.ground?.findMany?.({ where: { organizationId, OR: [{ initiatorId: userId }, { createdByUserId: userId }] }, select: { id: true, initiatorId: true, createdByUserId: true } }).catch?.(() => [])) ?? [];
  const parts: any[] = (await prisma.groundParticipant?.findMany?.({ where: { userId, leftAt: null, ground: { organizationId } }, select: { id: true, groundId: true } }).catch?.(() => [])) ?? [];
  return {
    userId, organizationId,
    isAdmin: membership?.role === 'ADMIN',
    runs: new Set(grounds.filter((g) => runsItForAPattern(g, userId)).map((g) => g.id)),
    takesPartIn: new Map(parts.map((p) => [p.groundId, p.id])),
  };
}

export function mayReadAs(reader: TheReader, file: Pick<AMemoryFile, 'header'>, as: readonly ReaderKind[]): boolean {
  const scope = file.header.scope;
  return as.some((k) => {
    switch (k) {
      case 'everyone': return true;
      case 'admin': return reader.isAdmin;
      case 'leaders': return reader.isAdmin || reader.runs.size > 0;
      case 'lead': return !!scope.groundId && reader.runs.has(scope.groundId);
      case 'team': return !!scope.groundId && (reader.runs.has(scope.groundId) || reader.takesPartIn.has(scope.groundId));
      case 'person': return !!scope.participantId && [...reader.takesPartIn.values()].includes(scope.participantId);
      case 'project-people': return !!scope.userIds?.includes(reader.userId);
      default: return false;
    }
  });
}

/** The sections of a file this reader may read, and only those. */
export function theSectionsFor<F extends Pick<AMemoryFile, 'header' | 'sections'>>(reader: TheReader, file: F): F['sections'] {
  if (file.header.retired) return [];
  return file.sections.filter((s) => s.statements.length > 0 && mayReadAs(reader, file, s.readers));
}

/**
 * WHAT THE ASSISTANT MAY BE GIVEN. The assistant never discusses individual people's performance and never reads a lead's private notes,
 * whatever its reader's rights (docs/groundwork-memory-system.md, sections 5 and 9). So it is given no person's book at all, and from the
 * other books only the sections read by more than the lead or the person (what a team is for, the direction, what the organisation has
 * kept), and only those its reader may read. A lead's brief, risks and who is waiting on whom stay in the lead's own reads.
 */
export function theSectionsTheAssistantMayUse<F extends Pick<AMemoryFile, 'kind' | 'header' | 'sections'>>(reader: TheReader, file: F): F['sections'] {
  if (file.kind === 'person') return [];
  return theSectionsFor(reader, file).filter((s) => s.readers.some((r) => r !== 'lead' && r !== 'person'));
}
