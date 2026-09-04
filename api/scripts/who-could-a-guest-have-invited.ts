/**
 * WHERE COULD A GUEST HAVE OPENED A CHECK-IN AGAINST SOMEBODY ELSE'S BILLING.
 *
 * Until `a-guest-is-not-one-of-your-people`, somebody added to a check-in from another company
 * held MEMBER - the same role as the organisation's own staff. `mayOpen` asks only about the role,
 * so an organisation whose setting is EVERYONE let that visitor open a check-in there and invite
 * that organisation's people, against its billing.
 *
 * The fix is forward-only, because both the participant path and the team-invite path wrote
 * MEMBER and nothing in the data tells them apart. So this reports where it was POSSIBLE and
 * leaves the judgement to people who know who these accounts are.
 *
 * A row is not a wrongdoing. It is an organisation worth a look.
 *
 *   cd api && DATABASE_URL='<the staging or production url>' npx ts-node scripts/who-could-a-guest-have-invited.ts
 *
 * Read-only: it runs two SELECTs and writes nothing.
 */
import { PrismaClient } from '@prisma/client';

type Row = {
  organisation: string;
  organisation_id: string;
  visitors: number;
  check_ins_opened_by_a_visitor: number;
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<Row[]>(`
      SELECT o."name"                                   AS organisation,
             o."id"                                     AS organisation_id,
             count(DISTINCT u."id")::int                AS visitors,
             count(DISTINCT g."id")::int                AS check_ins_opened_by_a_visitor
      FROM organizations o
      JOIN organization_memberships m ON m."organization_id" = o."id"
      JOIN users u ON u."id" = m."user_id" AND u."organization_id" <> o."id"
      LEFT JOIN grounds g ON g."organization_id" = o."id" AND g."initiator_id" = u."id"
      WHERE o."who_may_open_check_ins" = 'EVERYONE'
      GROUP BY o."id", o."name"
      ORDER BY 4 DESC, 3 DESC
    `);

    if (rows.length === 0) {
      console.log('Nothing to review: no organisation set to EVERYONE has anyone from another company in it.');
      return;
    }

    console.log(`${rows.length} organisation(s) where a visitor could have opened a check-in:\n`);
    for (const r of rows) {
      const opened = r.check_ins_opened_by_a_visitor;
      console.log(
        `  ${r.organisation} (${r.organisation_id})\n` +
        `    people from another company: ${r.visitors}\n` +
        `    check-ins actually opened by one: ${opened}` +
        (opened > 0 ? '   <-- worth reading' : '   (none - only the possibility)') + '\n',
      );
    }
    console.log('A row is not a wrongdoing. "Actually opened" above zero is the part worth reading.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
