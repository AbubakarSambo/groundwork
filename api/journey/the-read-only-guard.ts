/**
 * THE GUARD THAT KEEPS A CHECK ON EXISTING DATA READ ONLY, shared by the checks for the existing clients.
 * It imports nothing from the product, so it runs in the current code and in the code of the live main line.
 */
/* ------------------------------------------------------------------------------------------------ */
/* The guard that keeps the connection read only.                                                    */
/* ------------------------------------------------------------------------------------------------ */

export class ATriedToWrite extends Error {
  constructor(public what: string) {
    super(`The check refused a write: ${what}. Opening a page must never write.`);
    this.name = 'ATriedToWrite';
  }
}

const READS = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'queryRaw']);

/** Refuses every write the services try, by name. The database refuses the rest (see makeTheDatabaseReadOnly). */
/**
 * The few writes the product makes when a person opens a page or asks a question, by design, and that are not a rebuild of anything:
 * it records that a person has now been shown a pattern about them (decision 86), and it links an invited
 * person to their sign-in by their address. The guard does not run them; it answers "nothing changed" and
 * says so through `onByDesign`, so the page is served as it would be and the write is still counted.
 */
export const WRITES_OPENING_A_PAGE_MAKES_BY_DESIGN = new Set([
  'PatternDetection.updateMany', 'GroundParticipant.updateMany',
  /* And when somebody asks Ask Groundwork: it keeps their own question in their own history, and drops a say-back they left unanswered. */
  'AssistantTurn.createMany', 'AssistantTurn.create', 'AssistantProposal.update', 'AssistantProposal.updateMany',
]);

export function installTheGuard(prisma: any, onRefused: (what: string) => void = () => undefined, onByDesign: (what: string) => void = () => undefined): void {
  prisma.$use(async (params: { model?: string; action: string }, next: (p: unknown) => Promise<unknown>) => {
    if (!READS.has(params.action)) {
      const what = `${params.model ?? 'a table'}.${params.action}`;
      if (WRITES_OPENING_A_PAGE_MAKES_BY_DESIGN.has(what)) {
        onByDesign(what);
        return { count: 0 };
      }
      onRefused(what);
      throw new ATriedToWrite(what);
    }
    return next(params);
  });
  for (const raw of ['$executeRaw', '$executeRawUnsafe']) {
    prisma[raw] = (): never => {
      onRefused(raw);
      throw new ATriedToWrite(raw);
    };
  }
}

/**
 * Makes the one connection read only at the database and checks that it says so. With
 * `proveWithATrialWrite` it also tries a write that must be refused (the services' own client is
 * only asked, so that its error log stays quiet).
 */
export async function makeTheDatabaseReadOnly(prisma: any, proveWithATrialWrite = false): Promise<void> {
  await prisma.$queryRawUnsafe('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
  const rows: { transaction_read_only: string }[] = await prisma.$queryRawUnsafe('SHOW transaction_read_only');
  if (rows?.[0]?.transaction_read_only !== 'on') throw new Error('The connection is not read only, so the check stopped before reading anything.');
  if (!proveWithATrialWrite) return;
  let refused = false;
  try {
    await prisma.$queryRawUnsafe('CREATE TEMP TABLE existing_clients_check_probe (i int)');
  } catch {
    refused = true;
  }
  if (!refused) throw new Error('The connection accepted a trial write, so the check stopped before reading anything.');
}

/** One connection only, so the read-only setting holds for every query. */
export function withOneConnection(url: string): string {
  const u = new URL(url);
  u.searchParams.set('connection_limit', '1');
  if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '300');
  return u.toString();
}

/* ------------------------------------------------------------------------------------------------ */
/* What a read turned out to be.                                                                     */
/* ------------------------------------------------------------------------------------------------ */

export type Outcome = 'served' | 'refused' | 'failed' | 'wrote';

/** A refusal on purpose (403, 404) is not a fault; trying to write is; anything else is a failure. */
export function outcomeOf(err: unknown): { outcome: Outcome; why: string } {
  const e = err as any;
  if (e instanceof ATriedToWrite || e?.name === 'ATriedToWrite') return { outcome: 'wrote', why: e.message };
  const status = typeof e?.getStatus === 'function' ? e.getStatus() : e?.status;
  if (status === 403 || status === 404) return { outcome: 'refused', why: String(e?.message ?? 'refused') };
  return { outcome: 'failed', why: String(e?.message ?? e).split('\n')[0].slice(0, 200) };
}

