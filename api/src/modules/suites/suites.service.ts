import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GROUPS, SUITES, checkAnswers, suiteOf, type Answers, type Question, type SuiteGroup } from './the-ten-suites';
import { DUTIES_REFUSED, DUTIES_ROW, ORGANISATION_DUTIES, TEAM_DUTIES, changeDuties, dutiesFrom, type Duties } from './who-holds-each-duty';
import { RULES_AN_ADMIN_MAY_SET, RULE_IN_WORDS, STEP_SUITES, WORKFLOWS_REFUSED, WORKFLOWS_ROW, aWorkflowSaid, changeWorkflows, workflowsFrom, type StepSuite, type Workflows } from './the-approval-steps';
import { theStepsFor, type Step } from './who-may-decide';
import { saidAsADate } from './a-request-is-recorded';
import { LEAVE_RULES_REFUSED, LEAVE_RULES_ROW, changeLeaveRules, leaveRulesFrom, theLeaveRulesSaid, type LeaveRules } from './the-leave-rules';
import { SPEND_RULES_REFUSED, SPEND_RULES_ROW, changeSpendRules, spendRulesFrom, theSpendRulesSaid, type SpendRules } from './the-spending-rules';

/** The words the server says when it refuses, in plain full sentences. */
export const REFUSED = {
  onlyAdminsAndLeads: 'Only an admin or a lead can open the suites.',
  onlyAnAdmin: 'Only an admin can switch a suite on or off.',
  noSuchSuite: 'There is no suite with that name.',
  answerFirst: 'Answer every question before you switch it on.',
};

export interface Reader { userId: string; organizationId: string }

export interface ForAnAdmin {
  reader: 'admin';
  groups: { name: SuiteGroup; suites: { key: string; name: string; line: string; on: boolean; questions: Question[]; answers: Answers }[] }[];
  /** Who a "person" question may name: the organisation's own people, by name only. */
  people: { id: string; name: string }[];
}

/** Who holds each duty (who-holds-each-duty.ts), as the admin who sets them reads it. */
export interface TheDuties {
  /** Finance, HR and the chief executive: one person each, with the question the admin answers. */
  organisation: { key: string; ask: string; holder: { id: string; name: string } | null }[];
  /** For each team in the staff directory: who holds its budget and who heads it. */
  teams: { team: string; budgetOwner: { id: string; name: string } | null; head: { id: string; name: string } | null }[];
  /** The two questions asked for each team. */
  teamAsks: { budgetOwners: string; departmentHeads: string };
  /** What is set, said back in full sentences. */
  said: string[];
  /** Where the duties are used so far, in one sentence. */
  usedFor: string;
  /** Who may be named: the organisation's own people, by name only. */
  people: { id: string; name: string }[];
}

export const DUTIES_USED_FOR =
  'Spending over the most a manager may approve on their own goes first to whoever holds that team’s budget, then to whoever looks after finance, and only then to the person named on the spending suite.';

/** The approval steps of leave, time sheets and spending (the-approval-steps.ts), as the admin who sets them reads them. */
export interface TheWorkflows {
  suites: {
    key: StepSuite;
    name: string;
    /** Whether an admin has set steps or days for this suite; otherwise it runs as it always has. */
    set: boolean;
    /** The steps that run now, each a list of rules tried in order. For spending, those up to the limit. */
    steps: Step[];
    /** For spending with a limit, the steps above it; otherwise null. */
    stepsAbove: Step[] | null;
    /** Working days before a request is passed on, or null when it never is. */
    escalateAfter: number | null;
    /** The workflow said back in full sentences. */
    said: string[];
  }[];
  /** The rules a step may use, each with how it is said. */
  rules: { key: string; said: string }[];
}

/** Each change of a suite's rules, as an admin reads it (decision 85, build step 5). */
export interface TheRulesHistory {
  changes: {
    /** The suite's key, "duties" or "workflows". */
    suite: string;
    /** Who changed it, by name, or null when not known. */
    by: string | null;
    at: string;
    /** "Grace switched on Leave requests on 3 October." */
    said: string;
    /** What changed, each in a full sentence: "The answer to “How many days ...?” changed from 21 to 25." */
    details: string[];
    before: { isOn: boolean; answers: unknown } | null;
    after: { isOn: boolean; answers: unknown };
  }[];
}

/** The leave rules (the-leave-rules.ts), as the admin who sets them reads them. */
export interface TheLeaveRules {
  rules: LeaveRules;
  /** The rules said back in full sentences. */
  said: string[];
  /** Who holds the HR duty, by name, or null when nobody does. */
  hr: string | null;
}

/** The spending rules (the-spending-rules.ts), as the admin who sets them reads them. */
export interface TheSpendRules {
  rules: SpendRules;
  /** The rules said back in full sentences. */
  said: string[];
}

export const RULES_HISTORY_REFUSED = 'Only an admin can read how the suites’ rules were changed.';

export interface ForALead {
  reader: 'lead';
  suites: { key: string; name: string; line: string }[];
}

/**
 * THE SUITES PAGE (E, U.17). Who reads what is decided here, never on the screen:
 *   - an admin reads every suite, whether it is on, its first questions and their own answers, and
 *     switches each one on or off;
 *   - a lead reads only which suites are on, of the seven that are for leads, and nothing else:
 *     no switches, no answers, and not the three suites that are for admins only;
 *   - a member and a guest from another company are refused.
 * Access comes from the reader's role in this organisation, never from a title (decisions rule 3).
 */
@Injectable()
export class SuitesService {
  constructor(private readonly prisma: PrismaService) {}

  async forReader(reader: Reader): Promise<ForAnAdmin | ForALead> {
    const role = await this.roleOf(reader);
    const rows = await this.rows(reader.organizationId);
    if (role === 'ADMIN') {
      return {
        reader: 'admin',
        groups: GROUPS.map((name) => ({
          name,
          suites: SUITES.filter((s) => s.group === name).map((s) => ({
            key: s.key, name: s.name, line: s.line,
            on: rows.get(s.key)?.isOn ?? false,
            questions: s.questions,
            answers: (rows.get(s.key)?.answers as Answers) ?? {},
          })),
        })),
        people: await this.people(reader.organizationId),
      };
    }
    if (role === 'LEAD') {
      return {
        reader: 'lead',
        suites: SUITES.filter((s) => s.forLeads && rows.get(s.key)?.isOn).map((s) => ({ key: s.key, name: s.name, line: s.line })),
      };
    }
    throw new ForbiddenException(REFUSED.onlyAdminsAndLeads);
  }

  /** An admin switches one suite on, with its answers, or off. Switching off keeps the answers. */
  async switch(reader: Reader, key: string, input: { on?: unknown; answers?: unknown }): Promise<ForAnAdmin> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(REFUSED.onlyAnAdmin);
    const suite = suiteOf(key);
    if (!suite) throw new NotFoundException(REFUSED.noSuchSuite);
    const on = input.on === true;
    const where = { organizationId_suite: { organizationId: reader.organizationId, suite: suite.key } };
    /* What it was, kept with what it becomes (decision 85, build step 5). */
    const before = (await this.rows(reader.organizationId).catch(() => new Map())).get(suite.key) ?? null;
    if (on) {
      const people = new Set((await this.people(reader.organizationId)).map((p) => p.id));
      const answers = checkAnswers(suite, input.answers, people);
      if (!answers) throw new BadRequestException(REFUSED.answerFirst);
      await this.prisma.organizationSuite.upsert({
        where,
        create: { organizationId: reader.organizationId, suite: suite.key, isOn: true, answers, changedById: reader.userId },
        update: { isOn: true, answers, changedById: reader.userId },
      });
      await this.keepTheChange(reader, suite.key, before, { isOn: true, answers });
    } else {
      await this.prisma.organizationSuite.upsert({
        where,
        create: { organizationId: reader.organizationId, suite: suite.key, isOn: false, changedById: reader.userId },
        update: { isOn: false, changedById: reader.userId },
      });
      await this.keepTheChange(reader, suite.key, before, { isOn: false, answers: before?.answers ?? {} });
    }
    return (await this.forReader(reader)) as ForAnAdmin;
  }

  /** Who holds each duty, for the admin who sets them. Nobody else reads this page. */
  async duties(reader: Reader): Promise<TheDuties> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const [row, people, teams] = await Promise.all([
      this.prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: org, suite: DUTIES_ROW } }, select: { answers: true } }),
      this.people(org),
      this.teams(org),
    ]);
    const d = dutiesFrom(row?.answers);
    const byId = new Map(people.map((p) => [p.id, p]));
    const who = (id: string | undefined) => (id && byId.get(id)) || null;
    const said: string[] = [];
    const say = (id: string | undefined, sentence: (name: string) => string) => { const p = who(id); if (p) said.push(sentence(p.name)); };
    say(d.finance, (n) => `${n} looks after finance.`);
    say(d.hr, (n) => `${n} looks after HR.`);
    say(d.chiefExecutive, (n) => `${n} is the chief executive.`);
    for (const t of teams) {
      say(d.budgetOwners?.[t], (n) => `${n} holds the ${t} budget.`);
      say(d.departmentHeads?.[t], (n) => `${n} heads ${t}.`);
    }
    return {
      organisation: ORGANISATION_DUTIES.map((x) => ({ key: x.key, ask: x.ask, holder: who(d[x.key]) })),
      teams: teams.map((t) => ({ team: t, budgetOwner: who(d.budgetOwners?.[t]), head: who(d.departmentHeads?.[t]) })),
      teamAsks: { budgetOwners: TEAM_DUTIES[0].ask, departmentHeads: TEAM_DUTIES[1].ask },
      said: said.length ? said : ['Nobody has been named for any duty yet.'],
      usedFor: DUTIES_USED_FOR,
      people,
    };
  }

  /**
   * An admin says who holds a duty, or clears one by giving null. Duties left out are kept. Each
   * person must be somebody in this organisation who is not a guest, and each team must be one in the
   * staff directory.
   */
  async setDuties(reader: Reader, input: unknown): Promise<TheDuties> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: DUTIES_ROW } };
    const [row, people, teams] = await Promise.all([
      this.prisma.organizationSuite.findUnique({ where, select: { answers: true } }),
      this.people(org),
      this.teams(org),
    ]);
    const changed = changeDuties(dutiesFrom(row?.answers), input, new Set(people.map((p) => p.id)), new Set(teams));
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.duties as Duties as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: DUTIES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, DUTIES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.duties(reader);
  }

  /** The approval steps of leave, time sheets and spending, for the admin who sets them. Nobody else reads this. */
  async workflows(reader: Reader): Promise<TheWorkflows> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const kept = workflowsFrom(rows.get(WORKFLOWS_ROW)?.answers);
    const spend = (rows.get('spend')?.answers ?? {}) as Record<string, unknown>;
    const limit = typeof spend.limit === 'number' ? spend.limit : null;
    const above = typeof spend.above === 'string' ? spend.above : null;
    return {
      suites: STEP_SUITES.map((key) => {
        const workflow = kept[key];
        const steps = key === 'spend' ? theStepsFor('spend', { limit, above, workflow }, 0) : theStepsFor(key, { workflow });
        const stepsAbove = key === 'spend' && limit != null ? theStepsFor('spend', { limit, above, workflow }, limit + 1) : null;
        return {
          key, name: suiteOf(key)?.name ?? key, set: !!workflow, steps, stepsAbove,
          escalateAfter: workflow?.escalateAfter ?? null,
          said: aWorkflowSaid(key, steps, stepsAbove, workflow?.escalateAfter),
        };
      }),
      rules: RULES_AN_ADMIN_MAY_SET.map((key) => ({ key, said: RULE_IN_WORDS[key] })),
    };
  }

  /**
   * An admin sets the approval steps, or the working days before a request is passed on, for leave,
   * time sheets or spending. A suite or a part given as null is cleared back to how it always ran; one
   * left out is kept.
   */
  async setWorkflows(reader: Reader, input: unknown): Promise<TheWorkflows> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: WORKFLOWS_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const changed = changeWorkflows(workflowsFrom(row?.answers), input);
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.workflows as Workflows as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: WORKFLOWS_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, WORKFLOWS_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.workflows(reader);
  }

  /** The leave rules, for the admin who sets them. Nobody else reads this. */
  async leaveRules(reader: Reader): Promise<TheLeaveRules> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const rules = leaveRulesFrom(rows.get(LEAVE_RULES_ROW)?.answers);
    const leave = (rows.get('leave')?.answers ?? {}) as Record<string, unknown>;
    const hrId = dutiesFrom(rows.get(DUTIES_ROW)?.answers).hr;
    const hr = hrId ? (await this.people(reader.organizationId)).find((p) => p.id === hrId)?.name ?? null : null;
    return { rules, said: theLeaveRulesSaid(rules, typeof leave.days === 'number' ? leave.days : null, hr), hr };
  }

  /**
   * An admin sets the leave rules: kinds of leave, notice, blackout periods, who may take leave, the
   * documents needed, and whether HR is told. A part given as null is cleared; one left out is kept.
   */
  async setLeaveRules(reader: Reader, input: unknown): Promise<TheLeaveRules> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: LEAVE_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const changed = changeLeaveRules(leaveRulesFrom(row?.answers), input);
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.rules as LeaveRules as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: LEAVE_RULES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, LEAVE_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.leaveRules(reader);
  }

  /** The spending rules, for the admin who sets them. Nobody else reads this. */
  async spendRules(reader: Reader): Promise<TheSpendRules> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const rules = spendRulesFrom(rows.get(SPEND_RULES_ROW)?.answers);
    const spend = (rows.get('spend')?.answers ?? {}) as Record<string, unknown>;
    return { rules, said: theSpendRulesSaid(rules, typeof spend.currency === 'string' ? spend.currency : null) };
  }

  /**
   * An admin sets the spending rules: categories, what a category is called, the receipt or quote
   * needed, and thresholds with their own steps. A part given as null is cleared; one left out is kept.
   */
  async setSpendRules(reader: Reader, input: unknown): Promise<TheSpendRules> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: SPEND_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const changed = changeSpendRules(spendRulesFrom(row?.answers), input);
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.rules as SpendRules as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: SPEND_RULES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, SPEND_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.spendRules(reader);
  }

  /**
   * Each change of the suites' rules, newest first, for an admin only (decision 85, build step 5):
   * who changed it, when, and from what to what, in full sentences. `OrganizationSuite` keeps only the
   * last answers, so this is the only place an earlier rule can be read.
   */
  async rulesHistory(reader: Reader): Promise<TheRulesHistory> {
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(RULES_HISTORY_REFUSED);
    const table = (this.prisma as any).suiteRuleChange;
    const rows: { suite: string; changedById: string | null; changedAt: Date; before: any; after: any }[] = table?.findMany
      ? await table.findMany({ where: { organizationId: reader.organizationId }, orderBy: { changedAt: 'desc' }, take: 100 })
      : [];
    const people = await this.people(reader.organizationId);
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const firstOf = (id: string | null | undefined) => (id && nameOf.get(id)?.split(/\s+/)[0]) || null;
    const teams = await this.teams(reader.organizationId);
    return {
      changes: rows.map((r) => {
        const by = firstOf(r.changedById);
        const who = by ?? 'Somebody';
        const on = saidAsADate(new Date(r.changedAt));
        const full = suiteOf(r.suite)?.name ?? r.suite;
        const name = `${full.charAt(0).toLowerCase()}${full.slice(1)}`;
        const said = r.suite === DUTIES_ROW ? `${who} changed who holds each duty on ${on}.`
          : r.suite === WORKFLOWS_ROW ? `${who} changed the approval steps on ${on}.`
          : r.suite === LEAVE_RULES_ROW ? `${who} changed the leave rules on ${on}.`
          : r.suite === SPEND_RULES_ROW ? `${who} changed the spending rules on ${on}.`
          : !r.before?.isOn && r.after?.isOn ? `${who} switched on ${name} on ${on}.`
          : r.before?.isOn && !r.after?.isOn ? `${who} switched off ${name} on ${on}.`
          : `${who} changed the answers for ${name} on ${on}.`;
        return {
          suite: r.suite, by: by ?? null, at: new Date(r.changedAt).toISOString(), said,
          details: this.whatChanged(r.suite, r.before?.answers ?? null, r.after?.answers ?? {}, nameOf, teams),
          before: r.before ?? null, after: r.after,
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------------------------

  /** Keeps one change of a suite's rules. Never stops the change itself. */
  private async keepTheChange(reader: Reader, suite: string, before: { isOn: boolean; answers: unknown } | null, after: { isOn: boolean; answers: unknown }) {
    const table = (this.prisma as any).suiteRuleChange;
    if (!table?.create) return;
    if (before && before.isOn === after.isOn && JSON.stringify(before.answers ?? {}) === JSON.stringify(after.answers ?? {})) return;
    const kept = before ? { isOn: !!before.isOn, answers: before.answers ?? {} } : undefined;
    await table.create({
      data: { organizationId: reader.organizationId, suite, changedById: reader.userId, before: kept as never, after: after as never },
    }).catch(() => undefined);
  }

  /** What changed between two sets of answers, each in a full sentence, with people by name. */
  private whatChanged(suite: string, before: any, after: any, nameOf: Map<string, string>, teams: string[]): string[] {
    const b = (before ?? {}) as Record<string, any>;
    const a = (after ?? {}) as Record<string, any>;
    const person = (v: unknown) => (typeof v === 'string' ? nameOf.get(v) ?? 'somebody no longer here' : null);
    const line = (ask: string, from: string | null, to: string | null): string | null => {
      if (from === to) return null;
      if (from == null) return `The answer to “${ask}” was set to ${to}.`;
      if (to == null) return `The answer to “${ask}” was cleared. It was ${from}.`;
      return `The answer to “${ask}” changed from ${from} to ${to}.`;
    };
    const out: (string | null)[] = [];
    if (suite === DUTIES_ROW) {
      for (const d of ORGANISATION_DUTIES) out.push(line(d.ask, person(b[d.key]), person(a[d.key])));
      for (const t of [...new Set([...teams, ...Object.keys(b.budgetOwners ?? {}), ...Object.keys(a.budgetOwners ?? {}), ...Object.keys(b.departmentHeads ?? {}), ...Object.keys(a.departmentHeads ?? {})])]) {
        out.push(line(`Who holds the ${t} budget?`, person(b.budgetOwners?.[t]), person(a.budgetOwners?.[t])));
        out.push(line(`Who heads ${t}?`, person(b.departmentHeads?.[t]), person(a.departmentHeads?.[t])));
      }
    } else if (suite === LEAVE_RULES_ROW) {
      const said = (x: unknown) => theLeaveRulesSaid(leaveRulesFrom(x), null, null).filter((l) => !/^There are no kinds|^No notice|^A rule never/.test(l));
      const from = said(before);
      const to = said(after);
      for (const l of to) if (!from.includes(l)) out.push(`This was added. ${l}`);
      for (const l of from) if (!to.includes(l)) out.push(`This was taken away. ${l}`);
    } else if (suite === SPEND_RULES_ROW) {
      const said = (x: unknown) => theSpendRulesSaid(spendRulesFrom(x), null).filter((l) => !/^There are no categories|^Groundwork keeps only|^A request over more than one/.test(l));
      const from = said(before);
      const to = said(after);
      for (const l of to) if (!from.includes(l)) out.push(`This was added. ${l}`);
      for (const l of from) if (!to.includes(l)) out.push(`This was taken away. ${l}`);
    } else if (suite === WORKFLOWS_ROW) {
      const wb = workflowsFrom(before);
      const wa = workflowsFrom(after);
      for (const key of STEP_SUITES) {
        const said = (w: Workflows) => {
          const x = w[key];
          if (!x) return null;
          const steps = x.steps ?? (key === 'spend' ? null : theStepsFor(key, {}));
          return aWorkflowSaid(key, steps ?? theStepsFor('spend', { limit: null, above: null }, 0), x.stepsAbove ?? null, x.escalateAfter).join(' ');
        };
        const from = said(wb);
        const to = said(wa);
        if (from === to) continue;
        const full = suiteOf(key)?.name ?? key;
        const what = `${full.charAt(0).toLowerCase()}${full.slice(1)}`;
        out.push(to == null ? `The approval steps for ${what} went back to how they always ran.` : `The approval steps for ${what} changed. ${to}`);
      }
    } else {
      const s = suiteOf(suite);
      for (const q of s?.questions ?? []) {
        const said = (v: unknown) => (v == null ? null : q.kind === 'person' ? person(v) : Array.isArray(v) ? v.join(', ') : String(v));
        out.push(line(q.ask, said(b[q.id]), said(a[q.id])));
      }
    }
    return out.filter((x): x is string => !!x);
  }

  /** The teams in the staff directory, by their department's name. */
  private async teams(organizationId: string): Promise<string[]> {
    const ps = await this.prisma.person.findMany({ where: { organizationId, active: true }, select: { department: true } });
    return [...new Set(ps.map((p) => p.department?.trim()).filter((t): t is string => !!t))].sort();
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  private async rows(organizationId: string) {
    const rows = await this.prisma.organizationSuite.findMany({
      where: { organizationId },
      select: { suite: true, isOn: true, answers: true },
    });
    return new Map(rows.map((r) => [r.suite, r]));
  }

  /** The organisation's own people, by name, for a "person" question. Never a guest, never an address. */
  private async people(organizationId: string): Promise<{ id: string; name: string }[]> {
    const ms = await this.prisma.organizationMembership.findMany({
      where: { organizationId, role: { not: 'GUEST' } },
      select: { userId: true, user: { select: { firstName: true, lastName: true } } },
    });
    return ms
      .map((m) => ({ id: m.userId, name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() }))
      .filter((p) => p.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
