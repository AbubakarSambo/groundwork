import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { readDuties } from './who-holds-each-duty';
import { recordIt, saidAsADate } from './a-request-is-recorded';
import { spendInWords } from './a-request-in-words';
import { theirRosterEntries } from './a-roster-entry-and-its-sign-in';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx') as typeof import('xlsx');

/**
 * FINANCE'S PART OF A REQUEST TO SPEND (decision 85, item 2; build step 10 of
 * docs/suites-against-the-workflow-model.md).
 *
 * Once a request to spend has its last approval, whoever looks after finance (the `finance` duty,
 * who-holds-each-duty.ts) checks it, records the budget line or category it is paid from, notes the
 * receipt or quote it has had when the spending rules asked for one (only that it was given; no file is
 * kept), and marks it paid with the day it was paid. Approved requests not yet paid are exported as a
 * CSV or an Excel file. Each step is written to the one record of who did what (`suite_events`):
 * verified, coded, evidence, exported and paid. There is no connection to a payment system (decision
 * 86, item 4); the file is what finance takes away.
 *
 * WHO READS AND DOES THIS. Whoever looks after finance, and an admin (decision 5: an admin reads every
 * board). Anybody else is refused. Decision 85 says finance "sees only the financial information it is
 * allowed": this read serves only what is on the request itself (who asked, their team, the amount, what
 * it is for, its category, who approved it and when, the evidence, finance's own steps) and nothing else
 * Groundwork knows about the person: no check-in, report, pattern, leave, hours or review. Nothing here
 * opens any other board to finance.
 */
export const FINANCE_REFUSED = {
  notOn: thisSuiteIsOff('The spending suite'),
  onlyFinance: 'Only whoever looks after finance, or an admin, can do this.',
  notFound: 'That request was not found.',
  notApproved: 'Only a request that has been approved comes to finance.',
  alreadyChecked: 'This request has already been checked.',
  checkFirst: 'Check the request before you mark it paid.',
  alreadyPaid: 'This request is already marked paid.',
  badCode: 'Give the budget line or category in 1 to 80 letters.',
  badDay: 'Give the day it was paid as a date, no later than today and no earlier than the day it was asked for.',
  notNeeded: 'This request does not need that. Say which of the receipt or the quote finance has had.',
  badFormat: 'Ask for the file as csv or xlsx.',
  notYourOwn: 'Nobody checks or pays their own request. Somebody else in finance, or an admin, can.',
};

export interface Reader { userId: string; organizationId: string }

/** One approved request, as finance reads it: only what is on the request itself. */
export interface ForFinance {
  id: string;
  /** Who asked, by full name. */
  name: string;
  team: string | null;
  amount: number;
  what: string;
  category: string | null;
  askedOn: string;
  /** Who approved each step, by first name, and the day of the last approval. */
  approvedBy: string[];
  approvedOn: string | null;
  /** "receipt", "quote": what the rules asked for, and what finance has had. */
  evidenceNeeded: string[];
  evidenceGiven: string[];
  /** Who in finance checked it and when, or null. */
  checked: { by: string; on: string } | null;
  code: string | null;
  paidOn: string | null;
  /** The request, in full sentences, with "you" for the reader. */
  said: string[];
}

export interface TheFinanceView {
  reader: 'finance' | 'admin';
  currency: string | null;
  /** Approved and not yet paid, oldest approval first. */
  toPay: ForFinance[];
  /** Paid in the last 60 days, newest first. */
  paid: ForFinance[];
  /** Budget lines finance may choose from: the spending rules' categories and the teams with a budget. Finance may also write its own. */
  lines: string[];
}

type Row = {
  id: string; organizationId: string; userId: string; amount: unknown; what: string; team: string | null; status: string; createdAt: Date;
  decidedById?: string | null; decidedAt?: Date | null; approvedByIds?: string[] | null;
  category?: string | null; evidenceNeeded?: string[] | null; evidenceGiven?: string[] | null;
  verifiedById?: string | null; verifiedAt?: Date | null; code?: string | null; paidOn?: Date | null; paidById?: string | null;
};

const n = (x: unknown) => Number(x ?? 0);
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86_400_000;
const EVIDENCE_WORD: Record<string, string> = { receipt: 'a receipt', quote: 'a quote' };
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

@Injectable()
export class SpendingForFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** What waits for finance, and what finance paid lately. */
  async view(reader: Reader, today = new Date()): Promise<TheFinanceView> {
    const { currency, role } = await this.mayAct(reader);
    const rows = (await this.prisma.spendRequest.findMany({
      where: { organizationId: reader.organizationId, status: 'approved' },
      orderBy: { createdAt: 'asc' },
    })) as Row[];
    const since = new Date(today.getTime() - 60 * DAY);
    const toPay = rows.filter((r) => !r.paidOn).sort((a, b) => (a.decidedAt?.getTime() ?? 0) - (b.decidedAt?.getTime() ?? 0));
    const paid = rows.filter((r) => r.paidOn && r.paidOn >= since).sort((a, b) => b.paidOn!.getTime() - a.paidOn!.getTime());
    const said = await this.asFinanceReadsThem([...toPay, ...paid], currency, reader.userId);
    const rules = await this.categories(reader.organizationId);
    const budgets = await this.prisma.teamBudget.findMany({ where: { organizationId: reader.organizationId }, select: { team: true } }).catch(() => []);
    return {
      reader: role === 'ADMIN' ? 'admin' : 'finance',
      currency,
      toPay: toPay.map((r) => said.get(r.id)!),
      paid: paid.map((r) => said.get(r.id)!),
      lines: [...new Set([...rules, ...(budgets ?? []).map((b: any) => b.team as string)])].filter(Boolean).sort(),
    };
  }

  /** Finance checks an approved request. */
  async verify(reader: Reader, id: string, today = new Date()): Promise<TheFinanceView> {
    const r = await this.anApproved(reader, id);
    if (r.verifiedById) throw new BadRequestException(FINANCE_REFUSED.alreadyChecked);
    await this.prisma.spendRequest.update({ where: { id }, data: { verifiedById: reader.userId, verifiedAt: new Date() } });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'verified', byUserId: reader.userId, basis: { row: 'spend_requests', id } });
    return this.view(reader, today);
  }

  /** Finance records the budget line or category it is paid from. It can be changed until it is paid. */
  async code(reader: Reader, id: string, codeGiven: unknown, today = new Date()): Promise<TheFinanceView> {
    const code = typeof codeGiven === 'string' ? codeGiven.trim().replace(/\s+/g, ' ') : '';
    if (!code || code.length > 80) throw new BadRequestException(FINANCE_REFUSED.badCode);
    const r = await this.anApproved(reader, id);
    if (r.paidOn) throw new BadRequestException(FINANCE_REFUSED.alreadyPaid);
    await this.prisma.spendRequest.update({ where: { id }, data: { code } });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'coded', byUserId: reader.userId, basis: { row: 'spend_requests', id } });
    return this.view(reader, today);
  }

  /** Finance has had the receipt or the quote the rules asked for. Only that it was given; no file is kept. */
  async evidenceGiven(reader: Reader, id: string, what: unknown, today = new Date()): Promise<TheFinanceView> {
    const r = await this.anApproved(reader, id);
    if (typeof what !== 'string' || !(r.evidenceNeeded ?? []).includes(what)) throw new BadRequestException(FINANCE_REFUSED.notNeeded);
    const given = [...new Set([...(r.evidenceGiven ?? []), what])];
    await this.prisma.spendRequest.update({ where: { id }, data: { evidenceGiven: given } });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'evidence', byUserId: reader.userId, basis: { row: 'spend_requests', id, what } });
    return this.view(reader, today);
  }

  /** Finance marks a checked request paid, with the day it was paid. */
  async paid(reader: Reader, id: string, onGiven: unknown, today = new Date()): Promise<TheFinanceView> {
    const r = await this.anApproved(reader, id);
    if (r.paidOn) throw new BadRequestException(FINANCE_REFUSED.alreadyPaid);
    if (!r.verifiedById) throw new BadRequestException(FINANCE_REFUSED.checkFirst);
    const on = typeof onGiven === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(onGiven) ? new Date(`${onGiven}T00:00:00.000Z`) : null;
    if (!on || Number.isNaN(on.getTime()) || dayOf(on) > dayOf(today) || dayOf(on) < dayOf(r.createdAt)) throw new BadRequestException(FINANCE_REFUSED.badDay);
    await this.prisma.spendRequest.update({ where: { id }, data: { paidOn: on, paidById: reader.userId } });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'paid', byUserId: reader.userId, basis: { row: 'spend_requests', id, paidOn: dayOf(on) } });
    return this.view(reader, today);
  }

  /**
   * The approved requests not yet paid, as a file finance takes away: CSV, or Excel (the `xlsx` library
   * the product already uses to read spreadsheets). Each request in it is recorded as exported.
   */
  async export(reader: Reader, format: unknown, today = new Date()): Promise<{ fileName: string; contentType: string; body: Buffer }> {
    if (format !== 'csv' && format !== 'xlsx') throw new BadRequestException(FINANCE_REFUSED.badFormat);
    const v = await this.view(reader, today);
    const header = ['Request', 'Asked on', 'Asked by', 'Team', 'What it is for', 'Category', 'Amount', 'Currency', 'Approved by', 'Approved on', 'Checked by finance', 'Budget line', 'Receipt or quote needed', 'Receipt or quote given'];
    /* A file is read away from Groundwork, so the reader is named, never "you". */
    const me = (await this.firstName(reader.userId)) || 'Finance';
    const named = (x: string) => (x === 'you' ? me : x);
    const rows: (string | number)[][] = v.toPay.map((r) => [
      r.id, r.askedOn, r.name, r.team ?? '', r.what, r.category ?? '', r.amount, v.currency ?? '', r.approvedBy.map(named).join(', '), r.approvedOn ?? '',
      r.checked ? `${named(r.checked.by)}, ${r.checked.on}` : 'No',
      r.code ?? '', r.evidenceNeeded.join(', '), r.evidenceGiven.join(', '),
    ]);
    const all: (string | number)[][] = [header, ...rows];
    for (const r of v.toPay) await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'spend', ref: r.id, kind: 'exported', byUserId: reader.userId, basis: { row: 'spend_requests', id: r.id, format } });
    const stamp = dayOf(today);
    if (format === 'csv') {
      const cell = (x: unknown) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      return { fileName: `requests-to-pay-${stamp}.csv`, contentType: 'text/csv; charset=utf-8', body: Buffer.from(`${all.map((row) => row.map(cell).join(',')).join('\n')}\n`, 'utf8') };
    }
    const sheet = XLSX.utils.aoa_to_sheet(all);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'To pay');
    return { fileName: `requests-to-pay-${stamp}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer };
  }

  /** How many approved requests wait for this reader in finance: to check, and checked but not paid. Null when they are not finance. */
  async waitingFor(reader: Reader): Promise<{ toCheck: number; toPay: number } | null> {
    const duties = await readDuties(this.prisma, reader.organizationId).catch(() => ({} as any));
    if (duties.finance !== reader.userId) return null;
    const on = await this.prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'spend' } }, select: { isOn: true } }).catch(() => null);
    if (!on?.isOn) return null;
    const rows = (await this.prisma.spendRequest.findMany({ where: { organizationId: reader.organizationId, status: 'approved', paidOn: null } })) as Row[];
    return { toCheck: rows.filter((r) => !r.verifiedById).length, toPay: rows.filter((r) => r.verifiedById).length };
  }

  /** Whether this reader holds the finance duty, for the other reads that let finance in. */
  static async holdsFinance(prisma: PrismaService, organizationId: string, userId: string): Promise<boolean> {
    const duties = await readDuties(prisma, organizationId).catch(() => ({} as any));
    return duties.finance === userId;
  }

  // ---------------------------------------------------------------------------------------------

  private async mayAct(reader: Reader): Promise<{ currency: string | null; role: string | null }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'spend' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(FINANCE_REFUSED.notOn);
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    const role = m?.role ?? null;
    if (!role || role === 'GUEST') throw new ForbiddenException(FINANCE_REFUSED.onlyFinance);
    if (role !== 'ADMIN' && !(await SpendingForFinanceService.holdsFinance(this.prisma, reader.organizationId, reader.userId))) throw new ForbiddenException(FINANCE_REFUSED.onlyFinance);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return { currency: typeof a.currency === 'string' ? a.currency : null, role };
  }

  private async anApproved(reader: Reader, id: string): Promise<Row> {
    await this.mayAct(reader);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException(FINANCE_REFUSED.notFound);
    if (r.status !== 'approved') throw new BadRequestException(FINANCE_REFUSED.notApproved);
    /* Nobody approves their own spending, and nobody checks or pays their own either. */
    if (r.userId === reader.userId) throw new ForbiddenException(FINANCE_REFUSED.notYourOwn);
    return r;
  }

  private async categories(organizationId: string): Promise<string[]> {
    const row = await this.prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId, suite: 'spendRules' } }, select: { answers: true } }).catch(() => null);
    const cs = ((row?.answers as any)?.categories ?? []) as { name?: unknown }[];
    return cs.map((c) => (typeof c?.name === 'string' ? c.name : '')).filter(Boolean);
  }

  private async firstName(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName?.trim() || '';
  }

  /** Each request as finance reads it, in fields and in full sentences. Names only, never an address. */
  private async asFinanceReadsThem(rows: Row[], currency: string | null, readerUserId: string): Promise<Map<string, ForFinance>> {
    const ids = [...new Set(rows.flatMap((r) => [r.userId, ...(r.approvedByIds?.length ? r.approvedByIds : r.decidedById ? [r.decidedById] : []), r.verifiedById ?? '']).filter(Boolean))];
    const us = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }) : [];
    const first = new Map(us.map((u) => [u.id, u.firstName?.trim() || '']));
    const full = new Map(us.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim()]));
    const who = (id: string) => (id === readerUserId ? 'you' : first.get(id) || 'somebody');
    /* The team, from the request, or else from the person's directory entry. */
    const entries: Map<string, any> = await theirRosterEntries(this.prisma, rows[0]?.organizationId ?? '', [...new Set(rows.map((r) => r.userId))], { department: true }).catch(() => new Map());
    const out = new Map<string, ForFinance>();
    for (const r of rows) {
      const approvers = r.approvedByIds?.length ? r.approvedByIds : r.decidedById ? [r.decidedById] : [];
      const team = r.team?.trim() || entries.get(r.userId)?.department?.trim() || null;
      const name = full.get(r.userId) || 'Somebody';
      const needed = (r.evidenceNeeded ?? []).filter((e) => EVIDENCE_WORD[e]);
      const given = (r.evidenceGiven ?? []).filter((e) => needed.includes(e));
      const said: string[] = [];
      said.push(`${name}${team ? `, in ${team},` : ''} asked on ${saidAsADate(r.createdAt)} to spend ${spendInWords(n(r.amount), currency, r.what)}.`);
      if (r.category) said.push(`It is for ${r.category}.`);
      if (approvers.length) {
        const names = approvers.map(who);
        const by = listed(names.map((x, i) => (i === 0 ? `${x.charAt(0).toUpperCase()}${x.slice(1)}` : x)));
        if (!r.decidedAt) said.push(`${by} approved it.`);
        else if (approvers.length === 1) said.push(`${by} approved it on ${saidAsADate(r.decidedAt)}.`);
        else said.push(`${by} approved it. The last approval was on ${saidAsADate(r.decidedAt)}.`);
      }
      for (const e of needed) {
        said.push(given.includes(e) ? `It needs ${EVIDENCE_WORD[e]}, and finance has had it.` : `It needs ${EVIDENCE_WORD[e]}, and finance has not had it yet.`);
      }
      if (r.verifiedById && r.verifiedAt) {
        const by = who(r.verifiedById);
        said.push(`${by.charAt(0).toUpperCase()}${by.slice(1)} checked it on ${saidAsADate(r.verifiedAt)}.`);
      } else said.push('Nobody in finance has checked it yet.');
      if (r.code) said.push(`It is paid from ${r.code}.`);
      said.push(r.paidOn ? `It was paid on ${saidAsADate(r.paidOn)}.` : 'It has not been paid yet.');
      out.set(r.id, {
        id: r.id, name, team, amount: n(r.amount), what: r.what, category: r.category ?? null,
        askedOn: dayOf(r.createdAt),
        approvedBy: approvers.map(who),
        approvedOn: r.decidedAt ? dayOf(r.decidedAt) : null,
        evidenceNeeded: needed, evidenceGiven: given,
        checked: r.verifiedById && r.verifiedAt ? { by: who(r.verifiedById), on: dayOf(r.verifiedAt) } : null,
        code: r.code ?? null,
        paidOn: r.paidOn ? dayOf(r.paidOn) : null,
        said,
      });
    }
    return out;
  }
}
