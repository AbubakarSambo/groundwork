/**
 * THE PERSON CORRECTS WHAT THEY TOLD US ABOUT THEIR JOB (decision 129), by the route or by saying so in Ask Groundwork.
 *
 * It is their own act, so it is the person's yes: Ask says the change back first and only a yes reaches here, and the route is
 * the person calling for themselves. It writes one new row (the old rows stay as the history) with the fields they did not touch
 * carried over, and when they name their job it sets their job title on their account and on the roster, which is the one way
 * an existing title is ever changed.
 *
 * WHO READS IT: the person. The role map shows what a job owns only when the person has agreed to that, and a correction keeps
 * the agreement the earlier row had; it never starts one.
 */
/** What a private row is kept under when the person has not said what their job is called. It is never shown, and the role map never reads it. */
export const NOT_NAMED_YET = 'Not named yet';

export const THE_PARTS = ['roleName', 'owns', 'decides', 'doingWell', 'dependsOn', 'dependedOnBy', 'inTheWay'] as const;
export type APart = (typeof THE_PARTS)[number];
export type APatch = Partial<Record<APart, string | null>>;

export const LONGEST_PART_TYPED = 1000;

export const PART_WORDS: Record<APart, string> = {
  roleName: 'job',
  owns: 'are responsible for',
  decides: 'decide yourself',
  doingWell: 'say doing well looks like',
  dependsOn: 'depend on',
  dependedOnBy: 'say depends on you',
  inTheWay: 'say usually gets in your way',
};

export const NO_JOB_YET = 'Tell me first what your job is called, for example "My job is sales representative", and then I can keep the rest.';
export const NOTHING_TO_CHANGE = 'Say what you would like to change about your job.';

export interface WhoCorrects { userId: string; organizationId: string }

export async function correctTheirJob(prisma: any, who: WhoCorrects, patch: APatch): Promise<{ roleName: string; changed: APart[] }> {
  const clean: APatch = {};
  for (const k of THE_PARTS) {
    if (patch[k] === undefined) continue;
    const v = String(patch[k] ?? '').replace(/\s+/g, ' ').trim();
    if (v.length > LONGEST_PART_TYPED) throw new RangeError(`That is a long answer. Could you say it again in fewer than ${LONGEST_PART_TYPED} characters?`);
    clean[k] = v || null;
  }
  const changed = (Object.keys(clean) as APart[]);
  if (!changed.length) throw new RangeError(NOTHING_TO_CHANGE);

  const person = await prisma.person.findFirst({
    where: { organizationId: who.organizationId, linkedUserId: who.userId },
    select: { id: true, externalId: true, title: true },
  });
  /* Without a roster entry yet, what is kept is kept under the account id, which is the key Ask gives the entry it makes. */
  const key: string = person?.externalId ?? who.userId;
  const latest = await prisma.roleInterviewAnswer.findFirst({
    where: { organizationId: who.organizationId, personExternalId: { in: [person?.externalId, who.userId].filter(Boolean) } },
    orderBy: { createdAt: 'desc' },
  });
  const user = await prisma.user.findUnique({ where: { id: who.userId }, select: { jobTitle: true } });
  const named = (n?: string | null) => (n && n !== NOT_NAMED_YET ? n : null);
  const roleName = (clean.roleName || named(latest?.roleName) || user?.jobTitle || person?.title || '').trim();
  if (!roleName) throw new RangeError(NO_JOB_YET);

  if (clean.roleName) {
    await prisma.user.update({ where: { id: who.userId }, data: { jobTitle: clean.roleName } });
    if (person) await prisma.person.update({ where: { id: person.id }, data: { title: clean.roleName } });
  }
  const keep = (k: APart) => (k in clean ? clean[k] ?? null : (latest?.[k] ?? null));
  await prisma.roleInterviewAnswer.create({
    data: {
      organizationId: who.organizationId,
      personExternalId: key,
      roleName,
      owns: keep('owns'), decides: keep('decides'), dependsOn: keep('dependsOn'), dependedOnBy: keep('dependedOnBy'),
      doingWell: keep('doingWell'), inTheWay: keep('inTheWay'),
      source: 'correction',
      /* A correction keeps the agreement the earlier row had and never starts one. The role map shows what a job owns only when the person has agreed. */
      sharedAt: latest && (latest.source === 'interview' || latest.sharedAt) ? new Date() : null,
      checkInId: null,
      promptVersionId: null,
    },
  });
  return { roleName, changed };
}

/** What the person told us about their job, for them to read. Their words only. */
export async function theirJobForThem(prisma: any, who: WhoCorrects) {
  const person = await prisma.person.findFirst({ where: { organizationId: who.organizationId, linkedUserId: who.userId }, select: { externalId: true, title: true } });
  const user = await prisma.user.findUnique({ where: { id: who.userId }, select: { jobTitle: true } });
  const row = await prisma.roleInterviewAnswer.findFirst({
    where: { organizationId: who.organizationId, personExternalId: { in: [person?.externalId, who.userId].filter(Boolean) } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    roleName: ((row?.roleName && row.roleName !== NOT_NAMED_YET ? row.roleName : null) ?? user?.jobTitle ?? person?.title ?? null) as string | null,
    owns: row?.owns ?? null, decides: row?.decides ?? null, doingWell: row?.doingWell ?? null,
    dependsOn: row?.dependsOn ?? null, dependedOnBy: row?.dependedOnBy ?? null, inTheWay: row?.inTheWay ?? null,
    updatedAt: row?.createdAt ?? null,
    roleMapShowsWhatYouOwn: !!(row && (row.source === 'interview' || row.sharedAt)),
  };
}
