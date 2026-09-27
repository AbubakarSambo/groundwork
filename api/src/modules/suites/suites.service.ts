import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GROUPS, SUITES, checkAnswers, suiteOf, type Answers, type Question, type SuiteGroup } from './the-ten-suites';

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

  // ---------------------------------------------------------------------------------------------

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
