import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { answersUnderTheQuestionsOwnIds, theOldNamesOf } from './the-answers-under-the-questions-own-ids';
import { readDuties } from './who-holds-each-duty';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { GROUPS, SUITES, checkAnswers, suiteOf, type Answers, type Question, type SuiteGroup } from './the-ten-suites';
import { DUTIES_REFUSED, DUTIES_ROW, ORGANISATION_DUTIES, TEAM_DUTIES, changeDuties, dutiesFrom, type Duties } from './who-holds-each-duty';
import { RULES_AN_ADMIN_MAY_SET, RULE_IN_WORDS, STEP_SUITES, WORKFLOWS_REFUSED, WORKFLOWS_ROW, aWorkflowSaid, changeWorkflows, workflowsFrom, type StepSuite, type Workflows } from './the-approval-steps';
import { theStepsFor, type Step } from './who-may-decide';
import { saidAsADate } from './a-request-is-recorded';
import { LEAVE_RULES_REFUSED, LEAVE_RULES_ROW, changeLeaveRules, leaveRulesFrom, theLeaveRulesSaid, type LeaveRules } from './the-leave-rules';
import { PLACES_REFUSED, checkThePlaces, readThePlaces, writeThePlaces, type TheLeavePlaces } from './the-leave-places';
import { SPEND_RULES_REFUSED, SPEND_RULES_ROW, changeSpendRules, spendRulesFrom, theSpendRulesOf, theCardsAnswers, theSpendRulesSaid, withTheCardsAnswers, type SpendRules } from './the-spending-rules';
import { FOR_WHOM_REFUSED, FOR_WHOM_ROW, SETTINGS, SUITE_OF, changeForWhom, forWhomFrom, readForWhom, theExceptionsSaid, theNumberSaid, whoSaid, type ASetting, type AnException } from './who-a-rule-is-for';
import { thePeopleHere } from './the-people-and-their-lines';
import { CHECKED_SUITES, whatIsMissing, type ACheckedSuite, type TheSetupCheck } from './the-setup-check';
import { TIME_RULES_REFUSED, TIME_RULES_ROW, changeTimeRules, timeRulesFrom, theTimeRulesSaid, type TimeRules } from './the-time-sheet-rules';

/** The words the server says when it refuses, in plain full sentences. */
export const REFUSED = {
  onlyAdminsAndLeads: 'Only an admin or a lead can open the suites.',
  onlyAnAdmin: 'Only an admin can switch a suite on or off.',
  onlyAnAdminOrHr: 'Only an admin or whoever looks after HR can switch leave requests or performance reviews on or off.',
  onlyAnAdminOrFinance: 'Only an admin or whoever looks after finance can switch spending requests or time sheets on or off.',
  noSuchSuite: 'There is no suite with that name.',
  answerFirst: 'Answer every question before you switch it on.',
};

export interface Reader { userId: string; organizationId: string }

/**
 * WHO MAY SET UP EACH SUITE (decision 85: "The company/admin/HR/finance lead sets up the rules once").
 * Whoever holds the HR duty sets up leave and reviews; whoever holds the finance duty sets up spending
 * and time sheets (who-holds-each-duty.ts). An admin sets up every suite, as before. Who holds each duty
 * is still set by an admin only.
 */
export const THE_DUTY_THAT_SETS_UP: Record<string, 'hr' | 'finance'> = { leave: 'hr', reviews: 'hr', spend: 'finance', time: 'finance' };

/** A suite somebody who holds a duty may set up, as they read it on the Suites page. */
export interface ASuiteYouSetUp { key: string; name: string; line: string; on: boolean; questions: Question[]; answers: Answers }

/** A member who holds the HR or finance duty reads only the suites that duty sets up. */
export interface ForADutyHolder {
  reader: 'duty';
  /** The suites this reader may set up, with their questions and answers. */
  youSetUp: ASuiteYouSetUp[];
  /** Who a "person" question may name: the organisation's own people, by name only. */
  people: { id: string; name: string }[];
}

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
  'A request to spend goes to whoever its steps by amount name, on the spending page. Once it is approved, whoever looks after finance checks it, notes the receipt or quote, and records it paid.';

/** The approval steps of leave, time sheets and spending (the-approval-steps.ts), as the admin who sets them reads them. */
export interface TheWorkflows {
  suites: {
    key: StepSuite;
    name: string;
    /** Whether an admin has set steps or days for this suite; otherwise it runs as it always has. */
    set: boolean;
    /** The steps that run now, each a list of rules tried in order. For spending, those below every amount: its steps by amount are its spending rules. */
    steps: Step[];
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
  /** The rules said back in full sentences: the whole route first, then the categories and the receipt rule. */
  said: string[];
  /** The organisation's people by name only, for a step that names a person. */
  people: { id: string; name: string }[];
}

/** The time sheet rules (the-time-sheet-rules.ts), as the admin who sets them reads them. */
export interface TheTimeRules {
  rules: TimeRules;
  /** The rules said back in full sentences, with the approval steps the hours go through. */
  said: string[];
}

/** Who each suite's numbers are for (who-a-rule-is-for.ts), as whoever sets them up reads them. */
export interface TheForWhom {
  settings: { setting: ASetting; exceptions: AnException[]; said: string[] }[];
  /** The job titles, teams and people here, to choose from. */
  titles: string[];
  teams: string[];
  people: { id: string; name: string }[];
  /** Each setting's number for everyone, which an exception differs from, and the spending currency. */
  everyone: Partial<Record<ASetting, number | null>>;
  currency: string | null;
}

export const RULES_HISTORY_REFUSED = 'Only an admin can read how the suites’ rules were changed.';

export interface ForALead {
  reader: 'lead';
  suites: { key: string; name: string; line: string }[];
  /** Only for a lead who holds the HR or finance duty: the suites they may set up, as a member who holds it reads them. */
  youSetUp?: ASuiteYouSetUp[];
  people?: { id: string; name: string }[];
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
/** The refusals of the two forms: the same sentences the boards use. */
const LEAVE_FORM_REFUSED = { notInIt: 'Only people in this organisation can ask for leave here.', notOn: thisSuiteIsOff('The leave suite') };
const SPEND_FORM_REFUSED = { notInIt: 'Only people in this organisation can ask to spend here.', notOn: thisSuiteIsOff('The spending suite') };

@Injectable()
export class SuitesService {
  constructor(private readonly prisma: PrismaService) {}

  async forReader(reader: Reader): Promise<ForAnAdmin | ForALead | ForADutyHolder> {
    const role = await this.roleOf(reader);
    const rows = await this.rows(reader.organizationId);
    const adminIds = await this.adminIdsOf(reader.organizationId);
    if (role === 'ADMIN') {
      return {
        reader: 'admin',
        groups: GROUPS.map((name) => ({
          name,
          suites: SUITES.filter((s) => s.group === name).map((s) => ({
            key: s.key, name: s.name, line: s.line,
            on: rows.get(s.key)?.isOn ?? false,
            questions: s.questions,
            answers: this.answersOf(s, rows, adminIds),
          })),
        })),
        people: await this.people(reader.organizationId),
      };
    }
    /* Whoever holds the HR or finance duty also reads the suites that duty sets up (decision 85). */
    const mine = role && role !== 'GUEST' ? await this.suitesTheySetUp(reader, role) : new Set<string>();
    const youSetUp = SUITES.filter((s) => mine.has(s.key)).map((s) => ({
      key: s.key, name: s.name, line: s.line, on: rows.get(s.key)?.isOn ?? false, questions: s.questions, answers: this.answersOf(s, rows, adminIds),
    }));
    if (role === 'LEAD') {
      return {
        reader: 'lead',
        suites: SUITES.filter((s) => s.forLeads && rows.get(s.key)?.isOn).map((s) => ({ key: s.key, name: s.name, line: s.line })),
        ...(youSetUp.length ? { youSetUp, people: await this.people(reader.organizationId) } : {}),
      };
    }
    if (role === 'MEMBER' && youSetUp.length) return { reader: 'duty', youSetUp, people: await this.people(reader.organizationId) };
    throw new ForbiddenException(REFUSED.onlyAdminsAndLeads);
  }

  /**
   * A suite's answers as its settings card reads them. Spending's limit and "Who approves anything above that?" are read from its steps
   * by amount, the one place that says who approves (the-spending-rules.ts), and are kept nowhere else.
   */
  private answersOf(s: (typeof SUITES)[number], rows: Map<string, { answers: unknown }>, adminIds: Set<string>): Answers {
    const answers = { ...answersUnderTheQuestionsOwnIds(s, rows.get(s.key)?.answers, adminIds) } as Record<string, unknown>;
    if (s.key !== 'spend') return answers as Answers;
    delete answers.limit; delete answers.above;
    const card = theCardsAnswers(theSpendRulesOf(rows.get(SPEND_RULES_ROW)?.answers, rows.get('spend')?.answers));
    return { ...answers, ...(card.limit !== null ? { limit: card.limit } : {}), ...(card.above ? { above: card.above } : {}) } as Answers;
  }

  /** Who in the organisation is an admin, so a person kept as the approver can be read as "An admin". */
  private async adminIdsOf(organizationId: string): Promise<Set<string>> {
    const rows = await (this.prisma.organizationMembership?.findMany?.({ where: { organizationId, role: 'ADMIN' as never }, select: { userId: true } }) ?? Promise.resolve([])).catch(() => []);
    return new Set((rows as { userId: string }[]).map((r) => r.userId));
  }

  /**
   * The suites this reader may set up: every suite for an admin; leave and reviews for whoever holds the
   * HR duty; spending and time sheets for whoever holds the finance duty; none for anybody else.
   */
  async suitesTheySetUp(reader: Reader, role?: string | null): Promise<Set<string>> {
    const r = role === undefined ? await this.roleOf(reader) : role;
    if (r === 'ADMIN') return new Set(SUITES.map((s) => s.key));
    if (!r || r === 'GUEST') return new Set();
    const duties = await readDuties(this.prisma, reader.organizationId);
    return new Set(Object.entries(THE_DUTY_THAT_SETS_UP).filter(([, duty]) => duties[duty] === reader.userId).map(([key]) => key));
  }

  /** Whether this reader may set up this suite. */
  async maySetUp(reader: Reader, key: string): Promise<boolean> {
    return (await this.suitesTheySetUp(reader)).has(key);
  }

  /** The refusal for somebody who may not set up this suite, naming who may. */
  private refusalFor(key: string): string {
    const duty = THE_DUTY_THAT_SETS_UP[key];
    return duty === 'hr' ? REFUSED.onlyAnAdminOrHr : duty === 'finance' ? REFUSED.onlyAnAdminOrFinance : REFUSED.onlyAnAdmin;
  }

  /**
   * An admin switches one suite on, with its answers, or off. Switching off keeps the answers. Whoever
   * holds the HR duty may switch leave and reviews, and whoever holds the finance duty spending and time
   * sheets (decision 85). The rules history keeps it as their change.
   */
  async switch(reader: Reader, key: string, input: { on?: unknown; answers?: unknown }, opts: { theStepsAreSet?: boolean } = {}): Promise<ForAnAdmin | ForALead | ForADutyHolder> {
    const suite = suiteOf(key);
    const mine = await this.suitesTheySetUp(reader);
    if (!mine.size || (suite && !mine.has(suite.key))) throw new ForbiddenException(this.refusalFor(key));
    if (!suite) throw new NotFoundException(REFUSED.noSuchSuite);
    const on = input.on === true;
    const where = { organizationId_suite: { organizationId: reader.organizationId, suite: suite.key } };
    /* What it was, kept with what it becomes (decision 85, build step 5). */
    const before = (await this.rows(reader.organizationId).catch(() => new Map())).get(suite.key) ?? null;
    if (on) {
      const people = new Set((await this.people(reader.organizationId)).map((p) => p.id));
      const given = checkAnswers(suite, input.answers, people);
      if (!given) throw new BadRequestException(REFUSED.answerFirst);
      /* Whatever else the row holds stays (an old setting under a name the questions do not use), except the old names the answers now replace. */
      const old = theOldNamesOf(suite.key);
      const kept = Object.fromEntries(Object.entries((before?.answers && typeof before.answers === 'object' ? before.answers : {}) as Record<string, unknown>).filter(([k]) => !old.includes(k) && !(k in given)));
      const answers = { ...kept, ...given } as typeof given;
      /* Spending's limit and the person above it are the lowest of its steps by amount: written there, and kept nowhere else. */
      if (suite.key === 'spend') {
        /* Set up by talking writes the whole route through `setSpendRules` itself, so the card's two answers are not laid over it. */
        if (!opts.theStepsAreSet) await this.theCardsAnswersIntoTheSteps(reader, given as Record<string, unknown>);
        delete (answers as Record<string, unknown>).limit; delete (answers as Record<string, unknown>).above;
      }
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
    return this.forReader(reader);
  }

  /**
   * Who holds each duty, for the admin who sets them, and for whoever holds the HR or finance duty, who
   * reads it to set up their suites (decision 85). Only an admin sets it.
   */
  async duties(reader: Reader): Promise<TheDuties> {
    if (!(await this.suitesTheySetUp(reader)).size) throw new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin);
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

  /**
   * The approval steps of leave, time sheets and spending, for whoever sets them: an admin reads all
   * three; whoever holds the HR duty reads leave; whoever holds the finance duty reads time sheets and
   * spending. Nobody else reads this.
   */
  async workflows(reader: Reader): Promise<TheWorkflows> {
    const mine = await this.suitesTheySetUp(reader);
    if (!STEP_SUITES.some((k) => mine.has(k))) throw new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const kept = workflowsFrom(rows.get(WORKFLOWS_ROW)?.answers);
    return {
      suites: STEP_SUITES.filter((key) => mine.has(key)).map((key) => {
        const workflow = kept[key];
        const steps = key === 'spend' ? theStepsFor('spend', {}, 0) : theStepsFor(key, { workflow });
        return {
          key, name: suiteOf(key)?.name ?? key, set: !!workflow, steps,
          escalateAfter: workflow?.escalateAfter ?? null,
          said: aWorkflowSaid(key, steps, workflow?.escalateAfter),
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
    const mine = await this.suitesTheySetUp(reader);
    if (!STEP_SUITES.some((k) => mine.has(k))) throw new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin);
    /* Whoever holds a duty changes only the steps of the suites that duty sets up. */
    const given = input && typeof input === 'object' ? Object.keys(input as object) : [];
    if (given.some((k) => (STEP_SUITES as string[]).includes(k) && !mine.has(k))) throw new ForbiddenException(WORKFLOWS_REFUSED.notYourSuite);
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

  /** The leave rules, for whoever sets them: an admin, or whoever holds the HR duty. Nobody else reads this. */
  async leaveRules(reader: Reader): Promise<TheLeaveRules> {
    if (!(await this.maySetUp(reader, 'leave'))) throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
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
    if (!(await this.maySetUp(reader, 'leave'))) throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
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

  /** The leave policy's offices, who works from each, and every place's public holidays (the-leave-places.ts), for whoever sets up leave. */
  async leavePlaces(reader: Reader): Promise<TheLeavePlaces> {
    if (!(await this.maySetUp(reader, 'leave'))) throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
    const rules = leaveRulesFrom((await this.rows(reader.organizationId)).get(LEAVE_RULES_ROW)?.answers);
    return readThePlaces(this.prisma, reader.organizationId, rules.country ?? null, await this.people(reader.organizationId));
  }

  /**
   * Whoever sets up leave sets the offices (an office left out is removed, and nobody is tied to it any more) and each place's public
   * holidays, a year at a time. Each change is kept in the rules history.
   */
  async setLeavePlaces(reader: Reader, input: unknown): Promise<TheLeavePlaces> {
    if (!(await this.maySetUp(reader, 'leave'))) throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const people = await this.people(org);
    const checked = checkThePlaces(input, new Set(people.map((p) => p.id)));
    if ('refused' in checked) throw new BadRequestException(checked.refused);
    const before = await this.leavePlaces(reader);
    const officesAfter = checked.change.offices?.map((o) => o.name.toLowerCase()) ?? before.offices.map((o) => o.name.toLowerCase());
    if ((checked.change.holidays ?? []).some((h) => h.office && !officesAfter.includes(h.office.toLowerCase()))) throw new BadRequestException(PLACES_REFUSED.badOffice);
    await writeThePlaces(this.prisma, org, checked.change);
    const after = await this.leavePlaces(reader);
    const kept = (x: TheLeavePlaces) => ({ offices: x.offices.map((o) => ({ name: o.name, country: o.country, people: o.people.map((p) => p.id) })), holidays: x.holidays.map((h) => ({ office: h.office, on: h.on, name: h.name, confirmed: h.confirmed })) });
    await this.keepTheChange(reader, 'leavePlaces', { isOn: false, answers: kept(before) }, { isOn: false, answers: kept(after) });
    return after;
  }

  /**
   * WHO EACH SUITE'S NUMBERS ARE FOR (Batch S, S1, who-a-rule-is-for.ts): the exceptions an admin set for a job title, an app role,
   * a team or one person, said back with who each covers today. Whoever may set up a suite reads and sets its own: an admin every
   * one, whoever holds the HR duty leave, and whoever holds the finance duty time sheets and spending. The screen and the chat both
   * write through `setForWhom`.
   */
  async forWhom(reader: Reader): Promise<TheForWhom> {
    const mine = await this.suitesTheySetUp(reader);
    const settings = SETTINGS.filter((x) => mine.has(SUITE_OF[x]));
    if (!settings.length) throw new ForbiddenException(REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const [forWhom, people, rows] = await Promise.all([readForWhom(this.prisma, org), thePeopleHere(this.prisma, org), this.rows(org)]);
    const currency = typeof (rows.get('spend')?.answers as any)?.currency === 'string' ? (rows.get('spend')!.answers as any).currency : null;
    const leaveDays = (rows.get('leave')?.answers as any)?.days;
    return {
      everyone: {
        'leave.days': typeof leaveDays === 'number' ? leaveDays : null,
        'time.hoursAWeek': timeRulesFrom(rows.get(TIME_RULES_ROW)?.answers).hoursAWeek ?? null,
        'spend.limit': theCardsAnswers(theSpendRulesOf(rows.get(SPEND_RULES_ROW)?.answers, rows.get('spend')?.answers)).limit,
      },
      currency,
      settings: settings.map((setting) => ({ setting, exceptions: forWhom[setting] ?? [], said: theExceptionsSaid(forWhom, setting, people, currency) })),
      titles: [...new Set(people.map((p) => p.title).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b)),
      teams: [...new Set(people.map((p) => p.team).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b)),
      people: people.filter((p) => p.name).map((p) => ({ id: p.userId, name: p.name })),
    };
  }

  /** One exception set, or removed with a number of null. Kept in the rules history like any other change. */
  async setForWhom(reader: Reader, input: unknown): Promise<TheForWhom> {
    const setting = (input as any)?.setting as ASetting;
    if (!SETTINGS.includes(setting)) throw new BadRequestException(FOR_WHOM_REFUSED.badSetting);
    if (!(await this.maySetUp(reader, SUITE_OF[setting]))) throw new ForbiddenException(this.refusalFor(SUITE_OF[setting]));
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: FOR_WHOM_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const changed = changeForWhom(forWhomFrom(row?.answers), input);
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.forWhom as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: FOR_WHOM_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, FOR_WHOM_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.forWhom(reader);
  }

  /**
   * THE SETUP CHECK (Batch S, S3, the-setup-check.ts): what a suite is missing before its approvals follow the reporting lines,
   * and the step that fixes each, for whoever may set it up.
   */
  async setupCheck(reader: Reader, key: string): Promise<TheSetupCheck> {
    if (!CHECKED_SUITES.includes(key as ACheckedSuite)) throw new NotFoundException(REFUSED.noSuchSuite);
    if (!(await this.maySetUp(reader, key))) throw new ForbiddenException(this.refusalFor(key));
    return whatIsMissing(this.prisma, reader.organizationId, key as ACheckedSuite, reader.userId);
  }

  /**
   * RELEASE 9: the leave days a year, from a policy an admin approved (modules/policy). Only the days are written; whether the
   * leave suite is on, and every other answer, stays as it was. Kept in the history like any other change.
   */
  async setLeaveDaysFromPolicy(reader: Reader, days: number): Promise<void> {
    if (!(await this.maySetUp(reader, 'leave'))) throw new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin);
    if (!Number.isInteger(days) || days < 0 || days > 365) throw new BadRequestException('Give the leave days as a whole number from 0 to 365.');
    const where = { organizationId_suite: { organizationId: reader.organizationId, suite: 'leave' } };
    const before = (await this.rows(reader.organizationId).catch(() => new Map())).get('leave') ?? null;
    const answers = { ...((before?.answers && typeof before.answers === 'object' ? before.answers : {}) as Record<string, unknown>), days } as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: reader.organizationId, suite: 'leave', isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, 'leave', before, { isOn: before?.isOn === true, answers });
  }

  /**
   * The spending rules, for whoever sets them: an admin, or whoever holds the finance duty. Nobody else reads this. `said` is the whole
   * route (who approves at each amount, then finance's part), the categories and the receipt rule, with each person by first name.
   * `people` is the organisation's people by name only, for a step that names a person.
   */
  async spendRules(reader: Reader): Promise<TheSpendRules> {
    if (!(await this.maySetUp(reader, 'spend'))) throw new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const rules = theSpendRulesOf(rows.get(SPEND_RULES_ROW)?.answers, rows.get('spend')?.answers);
    const spend = (rows.get('spend')?.answers ?? {}) as Record<string, unknown>;
    const people = await this.people(reader.organizationId);
    const first = (id: string | null | undefined) => people.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? null;
    const finance = first(dutiesFrom(rows.get(DUTIES_ROW)?.answers).finance);
    return { rules, said: theSpendRulesSaid(rules, typeof spend.currency === 'string' ? spend.currency : null, { nameOf: first, finance }), people };
  }

  /** The settings card saved: its limit and "Who approves anything above that?" become the lowest of the steps by amount. */
  private async theCardsAnswersIntoTheSteps(reader: Reader, given: Record<string, unknown>): Promise<void> {
    const where = { organizationId_suite: { organizationId: reader.organizationId, suite: SPEND_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const kept = theSpendRulesOf(row?.answers, (await this.rows(reader.organizationId)).get('spend')?.answers);
    const next = withTheCardsAnswers(kept, given);
    if (next === kept) return;
    const answers = next as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: reader.organizationId, suite: SPEND_RULES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, SPEND_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
  }

  /**
   * An admin sets the spending rules: categories, what a category is called, the receipt or quote
   * needed, and thresholds with their own steps. A part given as null is cleared; one left out is kept.
   */
  async setSpendRules(reader: Reader, input: unknown): Promise<TheSpendRules> {
    if (!(await this.maySetUp(reader, 'spend'))) throw new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: SPEND_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const changed = changeSpendRules(theSpendRulesOf(row?.answers, (await this.rows(reader.organizationId)).get('spend')?.answers), input);
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    /* A step may name a person only from this organisation. */
    const ids = new Set((await this.people(org)).map((p) => p.id));
    if ((changed.rules.thresholds ?? []).some((t) => t.steps.flat().some((r) => typeof r === 'object' && !ids.has(r.named)))) throw new BadRequestException(SPEND_RULES_REFUSED.badThresholds);
    const answers = changed.rules as SpendRules as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: SPEND_RULES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, SPEND_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.spendRules(reader);
  }

  /** Release 9: reopen a week that locked, by its Monday. Whoever sets the time sheet rules (an admin, or whoever holds finance). */
  async reopenAWeek(reader: Reader, weekOf: string): Promise<TheTimeRules> {
    if (!(await this.maySetUp(reader, 'time'))) throw new ForbiddenException(TIME_RULES_REFUSED.onlyAnAdmin);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekOf ?? ''))) throw new BadRequestException('Say which week, by its Monday, such as 2026-10-19.');
    const where = { organizationId_suite: { organizationId: reader.organizationId, suite: TIME_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const kept = timeRulesFrom(row?.answers);
    const answers = { ...kept, reopened: [...new Set([...(kept.reopened ?? []), weekOf])] } as never;
    await this.prisma.organizationSuite.upsert({ where, create: { organizationId: reader.organizationId, suite: TIME_RULES_ROW, isOn: false, answers, changedById: reader.userId }, update: { answers, changedById: reader.userId } });
    await this.keepTheChange(reader, TIME_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.timeRules(reader);
  }

  /** The time sheet rules, for whoever sets them: an admin, or whoever holds the finance duty. Nobody else reads this. */
  async timeRules(reader: Reader): Promise<TheTimeRules> {
    if (!(await this.maySetUp(reader, 'time'))) throw new ForbiddenException(TIME_RULES_REFUSED.onlyAnAdmin);
    const rows = await this.rows(reader.organizationId);
    const rules = timeRulesFrom(rows.get(TIME_RULES_ROW)?.answers);
    const nameOf = new Map((await this.people(reader.organizationId)).map((p) => [p.id, p.name]));
    /* Who approves is the approval steps, through the one resolver (who-may-decide.ts); said, never set, here. */
    const time = (rows.get('time')?.answers ?? {}) as Record<string, unknown>;
    const workflow = workflowsFrom(rows.get(WORKFLOWS_ROW)?.answers).time;
    const approval = `${aWorkflowSaid('time', theStepsFor('time', { ...time, workflow }), workflow?.escalateAfter)[0]} An admin changes who approves under the approval steps.`;
    return { rules, said: theTimeRulesSaid(rules, approval, (id) => nameOf.get(id) ?? null) };
  }

  /**
   * An admin sets the time sheet rules: who keeps a time sheet, how often, the hours asked a week, the
   * cut-off in Lagos time, and billable or not for each client or project. A part given as null is
   * cleared; one left out is kept. Who approves stays with the approval steps.
   */
  async setTimeRules(reader: Reader, input: unknown): Promise<TheTimeRules> {
    if (!(await this.maySetUp(reader, 'time'))) throw new ForbiddenException(TIME_RULES_REFUSED.onlyAnAdmin);
    const org = reader.organizationId;
    const where = { organizationId_suite: { organizationId: org, suite: TIME_RULES_ROW } };
    const row = await this.prisma.organizationSuite.findUnique({ where, select: { answers: true } });
    const time = await this.prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: org, suite: 'time' } }, select: { answers: true } });
    const listed = (time?.answers as Record<string, unknown> | null)?.clients;
    const clients = Array.isArray(listed) ? listed.filter((c): c is string => typeof c === 'string') : [];
    const changed = changeTimeRules(timeRulesFrom(row?.answers), input, {
      people: new Set((await this.people(org)).map((p) => p.id)),
      teams: new Set(await this.teams(org)),
      clients,
    });
    if ('refused' in changed) throw new BadRequestException(changed.refused);
    const answers = changed.rules as TimeRules as never;
    await this.prisma.organizationSuite.upsert({
      where,
      create: { organizationId: org, suite: TIME_RULES_ROW, isOn: false, answers, changedById: reader.userId },
      update: { answers, changedById: reader.userId },
    });
    await this.keepTheChange(reader, TIME_RULES_ROW, row ? { isOn: false, answers: row.answers } : null, { isOn: false, answers });
    return this.timeRules(reader);
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
    /*
     * Who looked after HR when the leave rules changed: the duties as they stood after the last change
     * of duties at or before it, or else as they are now. Read so the leave rules history names them
     * ("Joy Mutua, who looks after HR, is told of each approved request") instead of nobody.
     */
    const hrNow = (await readDuties(this.prisma, reader.organizationId)).hr ?? null;
    const hrAt = (at: Date): string | null => {
      const t = new Date(at).getTime();
      const duties = rows.filter((x) => x.suite === DUTIES_ROW);
      /* The last change of duties at or before it says who held HR then; else the first change after it, as it was before; else now. */
      const before = duties.find((x) => new Date(x.changedAt).getTime() <= t);
      const after = [...duties].reverse().find((x) => new Date(x.changedAt).getTime() > t);
      const id = before ? dutiesFrom(before.after?.answers).hr ?? null : after ? dutiesFrom(after.before?.answers).hr ?? null : hrNow;
      return id ? nameOf.get(id) ?? null : null;
    };
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
          : r.suite === TIME_RULES_ROW ? `${who} changed the time sheet rules on ${on}.`
          : r.suite === FOR_WHOM_ROW ? `${who} changed the numbers set for some people on ${on}.`
          : !r.before?.isOn && r.after?.isOn ? `${who} switched on ${name} on ${on}.`
          : r.before?.isOn && !r.after?.isOn ? `${who} switched off ${name} on ${on}.`
          : `${who} changed the answers for ${name} on ${on}.`;
        return {
          suite: r.suite, by: by ?? null, at: new Date(r.changedAt).toISOString(), said,
          details: this.whatChanged(r.suite, r.before?.answers ?? null, r.after?.answers ?? {}, nameOf, teams, r.suite === LEAVE_RULES_ROW ? hrAt(r.changedAt) : null),
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
  private whatChanged(suite: string, before: any, after: any, nameOf: Map<string, string>, teams: string[], hr: string | null = null): string[] {
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
      const said = (x: unknown) => theLeaveRulesSaid(leaveRulesFrom(x), null, hr).filter((l) => !/^There are no kinds|^No notice|^A rule never|^If leave is longer than two|^Shorter leave follows/.test(l));
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
    } else if (suite === TIME_RULES_ROW) {
      const said = (x: unknown) => theTimeRulesSaid(timeRulesFrom(x), null, (id) => nameOf.get(id) ?? null).filter((l) => !/^Hours are for billing only/.test(l));
      const from = said(before);
      const to = said(after);
      for (const l of to) if (!from.includes(l)) out.push(`This was added. ${l}`);
      for (const l of from) if (!to.includes(l)) out.push(`This was taken away. ${l}`);
    } else if (suite === FOR_WHOM_ROW) {
      const said = (x: unknown) => { const f = forWhomFrom(x); return SETTINGS.flatMap((k) => (f[k] ?? []).map((e) => `${whoSaid(e.who, (id) => nameOf.get(id))} ${theNumberSaid(k, e.value)}.`)); };
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
          return aWorkflowSaid(key, key === 'spend' ? theStepsFor('spend', {}, 0) : x.steps ?? theStepsFor(key, {}), x.escalateAfter).join(' ');
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

  /**
   * WHAT THE LEAVE FORM MAY OFFER (request 165). Any person in the organisation may read it, because they are the one asking:
   * the kinds of leave (their key and what people call them) and the colleagues who could stand in (a name and an id, never an
   * address). Not the rules behind them, and not who has what days left. With the suite off, the same refusal as the board.
   */
  async leaveForm(reader: Reader): Promise<{ kinds: { key: string; name: string }[]; standIns: { userId: string; name: string }[] }> {
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_FORM_REFUSED.notInIt);
    const rows = await this.rows(reader.organizationId);
    if (!rows.get('leave')?.isOn) throw new NotFoundException(LEAVE_FORM_REFUSED.notOn);
    const kinds = leaveRulesFrom(rows.get(LEAVE_RULES_ROW)?.answers).kinds ?? [];
    const people = (await this.people(reader.organizationId)).filter((p) => p.id !== reader.userId);
    return { kinds: kinds.map((k) => ({ key: k.key, name: k.name })), standIns: people.map((p) => ({ userId: p.id, name: p.name })) };
  }

  /**
   * WHAT THE PAYMENT REQUEST FORM MAY OFFER (request 165): the categories the organisation set, what it calls one
   * ("project", "category"), and the currency. Not the limits, the thresholds, the budgets or who approves.
   */
  async spendForm(reader: Reader): Promise<{ currency: string | null; categoryCalled: string; categories: string[] }> {
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(SPEND_FORM_REFUSED.notInIt);
    const rows = await this.rows(reader.organizationId);
    const suite = rows.get('spend');
    if (!suite?.isOn) throw new NotFoundException(SPEND_FORM_REFUSED.notOn);
    const rules = theSpendRulesOf(rows.get(SPEND_RULES_ROW)?.answers, suite.answers);
    const answers = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      currency: typeof answers.currency === 'string' ? answers.currency : null,
      categoryCalled: rules.categoryCalled?.trim() || 'category',
      categories: (rules.categories ?? []).map((c) => c.name),
    };
  }

  /**
   * WHICH OF THE REQUEST SUITES ARE ON FOR THIS PERSON, IN ONE CALL (S2 of the nothing-removed audit).
   *
   * Today's link to "Your own leave and spending requests" asked three routes, one for each suite, and took a single 404
   * (one suite off) to mean all three were off, so a person in an organisation with leave on and spending off lost the link.
   * This answers for all three at once and never refuses a person who is in the organisation: a suite that is off is a
   * `false`, not an error. Somebody who is not in the organisation (a guest, or no one) has none, and is not refused either,
   * so a page can ask without a refusal ever hiding something that is on. Only yes or no for each suite; nothing of its answers.
   */
  async forYourRequests(reader: Reader): Promise<{ leave: boolean; spend: boolean; time: boolean; reviews: boolean; any: boolean; says: string }> {
    const role = await this.roleOf(reader);
    const rows = role && role !== 'GUEST' ? await this.rows(reader.organizationId) : new Map<string, { isOn: boolean }>();
    const on = (key: string) => rows.get(key)?.isOn === true;
    const out = { leave: on('leave'), spend: on('spend'), time: on('time') };
    const any = out.leave || out.spend || out.time;
    return {
      ...out,
      /* Journey walk row 5: GET /suites/reviews/mine answers 404 while reviews are off, and every screen asked it anyway.
       * The screens read this one yes or no first. It is not a request, so `any` and the sentence stay about the three requests. */
      reviews: on('reviews'),
      any,
      says: any
        ? 'These are the requests you can make in your organisation.'
        : 'No requests for leave, spending or hours are switched on in your organisation yet. An admin switches them on under Suites.',
    };
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
