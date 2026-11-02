/**
 * THE SPENDING SETTINGS MOVED INTO THE STEPS BY AMOUNT, ONCE (Hafsah's plan of 2 November, step 0). Who approves a request to spend is
 * now its steps by amount alone (the-spending-rules.ts). An organisation whose spending row still holds the settings card's old
 * `limit` and `above`, or whose workflows still hold spending `steps` and `stepsAbove`, gets them as rows of its steps by amount:
 * the limit with "the person named" as its step (or the old steps above it), and the old steps below the limit as a row at nothing
 * when they were not just the manager. The old keys are then taken out, and the escalation days stay. Rows already set by amount are
 * kept and win over an old answer at the same amount. Dry run without --yes. Never run against the live database.
 *   npx ts-node -P tsconfig.json --transpile-only scripts/spending-limit-into-steps.ts --yes
 */
import { PrismaClient } from '@prisma/client';
import { spendRulesFrom, SPEND_RULES_ROW } from '../src/modules/suites/the-spending-rules';
import { stepsFrom } from '../src/modules/suites/the-approval-steps';
const prisma = new PrismaClient();
const yes = process.argv.includes('--yes');
(async () => {
  const spends = await prisma.organizationSuite.findMany({ where: { suite: 'spend' }, select: { organizationId: true, answers: true } });
  for (const s of spends) {
    const a = { ...((s.answers ?? {}) as Record<string, any>) };
    const wfRow = await prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: s.organizationId, suite: 'workflows' } }, select: { answers: true } });
    const wf = { ...((wfRow?.answers ?? {}) as Record<string, any>) };
    const old = (wf.spend ?? {}) as Record<string, any>;
    const limit = typeof a.limit === 'number' ? a.limit : null;
    if (limit === null && !old.steps && !old.stepsAbove) continue;
    const rulesRow = await prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: s.organizationId, suite: SPEND_RULES_ROW } }, select: { answers: true } });
    const rules = spendRulesFrom(rulesRow?.answers);
    const rows = [...(rules.thresholds ?? [])];
    const add = (above: number, steps: any) => { if (steps && !rows.some((r) => r.above === above)) rows.push({ above, steps }); };
    const below = stepsFrom(old.steps);
    if (below && !(below.length === 1 && below[0][0] === 'manager')) add(0, below);
    if (limit !== null) add(limit, stepsFrom(old.stepsAbove) ?? [[typeof a.above === 'string' && a.above ? { named: a.above } : 'admin']]);
    rows.sort((x, y) => x.above - y.above);
    console.log(`${s.organizationId}: ${JSON.stringify(rows)}`);
    if (!yes) continue;
    const next = { ...rules, ...(rows.length ? { thresholds: rows } : {}) } as any;
    await prisma.organizationSuite.upsert({
      where: { organizationId_suite: { organizationId: s.organizationId, suite: SPEND_RULES_ROW } },
      create: { organizationId: s.organizationId, suite: SPEND_RULES_ROW, isOn: false, answers: next },
      update: { answers: next },
    });
    delete a.limit; delete a.above;
    await prisma.organizationSuite.update({ where: { organizationId_suite: { organizationId: s.organizationId, suite: 'spend' } }, data: { answers: a } });
    if (wfRow && wf.spend) {
      wf.spend = old.escalateAfter ? { escalateAfter: old.escalateAfter } : undefined;
      if (!wf.spend) delete wf.spend;
      await prisma.organizationSuite.update({ where: { organizationId_suite: { organizationId: s.organizationId, suite: 'workflows' } }, data: { answers: wf } });
    }
  }
  console.log(yes ? 'Done.' : 'Nothing written (add --yes).');
  await prisma.$disconnect();
})();
