import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GROUPS, SUITES, checkAnswers, suiteOf, type Answers, type Question, type SuiteGroup } from './the-ten-suites';
import { DUTIES_REFUSED, DUTIES_ROW, ORGANISATION_DUTIES, TEAM_DUTIES, changeDuties, dutiesFrom, type Duties } from './who-holds-each-duty';

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
    if (on) {
      const people = new Set((await this.people(reader.organizationId)).map((p) => p.id));
      const answers = checkAnswers(suite, input.answers, people);
      if (!answers) throw new BadRequestException(REFUSED.answerFirst);
      await this.prisma.organizationSuite.upsert({
        where,
        create: { organizationId: reader.organizationId, suite: suite.key, isOn: true, answers, changedById: reader.userId },
        update: { isOn: true, answers, changedById: reader.userId },
      });
    } else {
      await this.prisma.organizationSuite.upsert({
        where,
        create: { organizationId: reader.organizationId, suite: suite.key, isOn: false, changedById: reader.userId },
        update: { isOn: false, changedById: reader.userId },
      });
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
    return this.duties(reader);
  }

  // ---------------------------------------------------------------------------------------------

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
