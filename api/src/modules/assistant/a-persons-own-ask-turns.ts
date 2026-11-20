import { Prisma } from '@prisma/client';

/**
 * THE ONE PLACE WHAT SOMEBODY TYPED TO ASK GROUNDWORK IS READ BACK (Hafsah, 15 November 2026).
 *
 * Questions to Ask Groundwork are private, always. Before this file, six different pieces of code
 * read the `assistantTurn` table in their own way, and one of them was a detector that read every
 * person's questions in the organisation to work out who was mentioned in which work. Nothing
 * stopped a seventh.
 *
 * Now there is one reader, and it cannot be asked for an organisation's turns: every function here
 * needs the key of one person and asks for nothing but that person's own rows. Code that is not
 * answering that person, or building their own private view, has no way in. A spec fails if any
 * other file reads the table.
 *
 * Writing a turn, and deleting a leaver's turns, are not reads and stay where they are.
 */

type Db = {
  assistantTurn: { findMany: (args: any) => Promise<any[]>; count: (args: any) => Promise<number> };
  $queryRaw: (...args: any[]) => Promise<any>;
};

function owner(key: string | null | undefined): string {
  if (!key || !key.trim()) throw new Error('Ask turns are read for one named person only.');
  return key;
}

/** A person's own turns, newest first. Nobody else's, whatever the caller passes in `where`. */
export function ownAskTurns<S extends Record<string, boolean>>(
  prisma: Db, organizationId: string, key: string | null | undefined,
  options: { select: S; take: number; role?: 'person' | 'assistant' },
) {
  return prisma.assistantTurn.findMany({
    where: { organizationId, personExternalId: owner(key), ...(options.role ? { role: options.role } : {}) },
    select: options.select,
    orderBy: { createdAt: 'desc' },
    take: options.take,
  });
}

/** How many questions this person has asked. */
export function howManyQuestionsOwnerAsked(prisma: Db, organizationId: string, key: string | null | undefined) {
  return prisma.assistantTurn.count({ where: { organizationId, personExternalId: owner(key), role: 'person' } });
}

/** This person's own past questions that match what they are looking for. */
export function searchOwnQuestions(
  prisma: Db, organizationId: string, key: string | null | undefined, phrase: string, needles: string[],
): Promise<{ content: string; createdAt: Date; role: string }[]> {
  const who = owner(key);
  return prisma.$queryRaw(
    Prisma.sql`
      SELECT content, created_at AS "createdAt", role
      FROM assistant_turns
      WHERE organization_id = ${organizationId}
        AND person_external_id = ${who}
        AND role = 'person'
        AND (
          content % ${phrase}
          OR EXISTS (
            SELECT 1 FROM unnest(${needles}::text[]) AS w
            WHERE regexp_replace(lower(content), '[^a-z0-9]', '', 'g') LIKE '%' || w || '%'
          )
        )
      ORDER BY created_at DESC
      LIMIT 4
    `,
  );
}
