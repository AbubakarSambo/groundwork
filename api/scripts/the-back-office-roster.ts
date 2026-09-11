/**
 * WHO IS ON THE BACK OFFICE, ENTERED AS DATA.
 *
 * Nobody is named in code. This script takes the roster as arguments and writes it: one person per
 * --person, with a role and one or more sign-in addresses. Each address must already be a
 * Groundwork account (people sign up first; this connects, it does not create). With --only,
 * everybody active who is not listed is marked not active, so the roster IS the list.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-back-office-roster.ts \
 *     --person "Hafsah Jumare|CEO|hafsah.jumare@coamana.com,hjumare@gmail.com" \
 *     --person "Abubakar Sambo|TECH|samboabubakar5@gmail.com" \
 *     --person "Sahar Jamal|SALES_MARKETING|sahar.jamal89@gmail.com" \
 *     --only --yes
 *
 * Without --yes it prints what it would do. Roles: CEO, SALES_MARKETING, PRODUCT_TECH_LEAD, TECH,
 * CONTRIBUTOR. Safe to run again: it updates what is there.
 */
import { PrismaClient, OpsFunctionalRole } from '@prisma/client';
import { DEFAULT_GRANTS } from '../src/modules/ops/what-somebody-may-do';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const yes = args.includes('--yes');
const only = args.includes('--only');
const people = args
  .map((a, i) => (a === '--person' ? args[i + 1] : null))
  .filter((x): x is string => !!x)
  .map((spec) => {
    const [displayName, role, emails] = spec.split('|').map((s) => s.trim());
    if (!displayName || !role || !emails) throw new Error(`--person wants "Name|ROLE|a@x.com,b@y.com", got "${spec}"`);
    if (!(role in DEFAULT_GRANTS)) throw new Error(`${role} is not a role. One of: ${Object.keys(DEFAULT_GRANTS).join(', ')}`);
    return { displayName, role: role as OpsFunctionalRole, emails: emails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) };
  });

const keyFor = (displayName: string) => displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

(async () => {
  if (!people.length) throw new Error('Give at least one --person.');
  const plan: string[] = [];
  const keptKeys = new Set<string>();

  for (const person of people) {
    const accounts = await prisma.user.findMany({ where: { email: { in: person.emails } }, select: { id: true, email: true } });
    const missing = person.emails.filter((e) => !accounts.some((a) => a.email === e));
    if (missing.length) plan.push(`  ! ${person.displayName}: no Groundwork account for ${missing.join(', ')} - they sign up first; skipped those addresses`);
    if (!accounts.length) { plan.push(`  ! ${person.displayName}: no account at all, nothing to connect`); }

    /* Find them by any of their addresses, then by key, then by first name (the seed used to key people that way). */
    const existing =
      (await prisma.opsPerson.findFirst({ where: { OR: [{ email: { in: person.emails } }, { userId: { in: accounts.map((a) => a.id) } }, { accounts: { some: { userId: { in: accounts.map((a) => a.id) } } } }, { key: keyFor(person.displayName) }, { key: keyFor(person.displayName.split(' ')[0]) }, { displayName: { equals: person.displayName, mode: 'insensitive' } }] } })) ?? null;
    const key = existing?.key ?? keyFor(person.displayName);
    keptKeys.add(key);
    plan.push(`  ${existing ? 'update' : 'add'} ${person.displayName} as ${person.role} (${key}); accounts: ${accounts.map((a) => a.email).join(', ') || 'none'}`);

    if (!yes) continue;
    const [first, ...rest] = accounts;
    const row = await prisma.opsPerson.upsert({
      where: { key },
      create: { key, displayName: person.displayName, email: person.emails[0], functionalRole: person.role, active: true, userId: first?.id ?? null },
      update: { displayName: person.displayName, email: person.emails[0], functionalRole: person.role, active: true, ...(first ? { userId: first.id } : {}) },
    });
    /* Any account that was somebody else's second address is theirs now. */
    for (const a of rest) {
      await prisma.opsPersonAccount.deleteMany({ where: { userId: a.id } });
      await prisma.opsPersonAccount.create({ data: { personId: row.id, userId: a.id } });
    }
    if (first) await prisma.opsPersonAccount.deleteMany({ where: { userId: first.id } });
    await prisma.opsGrant.createMany({ data: DEFAULT_GRANTS[person.role].map((capability) => ({ personId: row.id, capability })), skipDuplicates: true });
  }

  if (only) {
    const others = await prisma.opsPerson.findMany({ where: { active: true, key: { notIn: [...keptKeys] } }, select: { id: true, key: true, displayName: true } });
    for (const o of others) plan.push(`  deactivate ${o.displayName} (${o.key}); not on the roster`);
    if (yes && others.length) await prisma.opsPerson.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { active: false } });
  }

  console.log(yes ? 'Done:' : 'Would do (add --yes to do it):');
  console.log(plan.join('\n'));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err.message); await prisma.$disconnect(); process.exit(1); });
