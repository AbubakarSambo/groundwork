/**
 * A KIND WE DO NOT HAVE IS A MISTAKE, NOT A CRASH.
 *
 * Every route on this controller took `:kind` from the path, upper-cased it, and handed it to
 * Prisma as a `WorkspaceKind`. So `/integrations/workspace/discord/on` reached the database as the
 * enum value `DISCORD`, which does not exist, and the caller got a 500 — an outage-shaped answer
 * to a typo. The two kinds are named here so the refusal can name them back.
 */
import { BadRequestException } from '@nestjs/common';
import { WorkspaceKind } from '@prisma/client';

export const KINDS_WE_HAVE: WorkspaceKind[] = ['SLACK', 'TEAMS'] as WorkspaceKind[];

export function theKind(said: string | undefined): WorkspaceKind {
  const asked = (said ?? '').trim().toUpperCase();
  if ((KINDS_WE_HAVE as string[]).includes(asked)) return asked as WorkspaceKind;
  throw new BadRequestException(
    `Groundwork can post to Slack or Teams. "${said ?? ''}" is neither.`,
  );
}
