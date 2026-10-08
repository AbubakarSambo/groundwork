import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * ONE RECORD OF WHO DID WHAT (decision 85, layer 7; step 5 of the build list in
 * docs/suites-against-the-workflow-model.md).
 *
 * Every suite writes here, in one table (`SuiteEvent`): who asked (after Groundwork said it back and
 * they said yes), who was told on WhatsApp, who approved each step, who declined, who it was passed to
 * when it waited too long, and who started and decided a review. Each with when, and on what
 * information as references to rows ("leave_requests" and its id, the week's total in minutes), never a
 * copy of anybody's words.
 *
 * Writing it never stops the request: a record that cannot be written is logged and the request
 * stands.
 *
 * WHO READS IT. A request's history is served only to the people who may already read the request
 * (each suite's `history`), in plain sentences with first names and "you" for the reader: "Wairimu
 * approved it on 2 October. Omar approved it on 3 October."
 */

export type SuiteOfARecord = 'leave' | 'spend' | 'time' | 'reviews';
export type WhatHappened = 'asked' | 'told' | 'approved' | 'declined' | 'escalated' | 'started' | 'decided' | 'questioned' | 'answered'
  /* A later step's approver had already approved it at an earlier step, so the step was passed (who-may-decide.ts). */
  | 'passed'
  /* Finance's part of a request to spend (build step 10). */
  | 'verified' | 'coded' | 'evidence' | 'exported' | 'paid'
  /* The person marked a line of their review as wrong and said what is true (build step 12). */
  | 'corrected'
  /*
   * An appeal of a decided review, and its decision (decision 113). Kept for the record of who did what, and said to nobody in a
   * history: only the person, the admin who decides it and the reviewer may read that there was an appeal, and they read it on the review.
   */
  | 'appealed' | 'appeal-decided'
  /* An admin was told an appeal waits for them, so an admin added later is told once and nobody twice. Said to nobody in a history. */
  | 'appeal-told';

export interface ARecord {
  organizationId: string;
  suite: SuiteOfARecord;
  ref: string;
  kind: WhatHappened;
  byUserId?: string | null;
  toUserId?: string | null;
  step?: number | null;
  /** References to rows only. */
  basis?: Record<string, unknown> | null;
  at?: Date;
}

const logger = new Logger('ARequestIsRecorded');

/** Writes one record. Never throws. */
export async function recordIt(prisma: PrismaService, e: ARecord): Promise<void> {
  const table = (prisma as any)?.suiteEvent;
  if (!table?.create) return;
  try {
    await table.create({
      data: {
        organizationId: e.organizationId, suite: e.suite, ref: e.ref.slice(0, 200), kind: e.kind,
        byUserId: e.byUserId ?? null, toUserId: e.toUserId ?? null, step: e.step ?? null,
        basis: (e.basis ?? undefined) as never, ...(e.at ? { at: e.at } : {}),
      },
    });
  } catch (err: any) {
    logger.warn(`Could not record that a ${e.suite} request was ${e.kind}: ${err?.message}`);
  }
}

/** The records of one request, oldest first. */
export async function theRecordOf(prisma: PrismaService, organizationId: string, suite: SuiteOfARecord, ref: string): Promise<ARecord[]> {
  const table = (prisma as any)?.suiteEvent;
  if (!table?.findMany) return [];
  const rows = await table.findMany({ where: { organizationId, suite, ref }, orderBy: { at: 'asc' } }).catch(() => []);
  return (rows ?? []) as ARecord[];
}

/** "2 October", in the organisations' own time (Africa/Lagos, as the boards are dated). */
export function saidAsADate(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(at);
}

const capital = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;

/**
 * A request's record in plain sentences for one reader. `names` maps sign-ins to first names; the
 * reader is "you"; somebody whose name is not known is "somebody". Hours read "these hours" and
 * "sent"; a review reads "the review".
 */
export function theRecordInWords(records: ARecord[], names: Map<string, string>, readerUserId: string, suite: SuiteOfARecord): string[] {
  const who = (id: string | null | undefined) => (!id ? 'an admin' : id === readerUserId ? 'you' : names.get(id) || 'somebody');
  /* "Daniel approved it on 7 October, standing in for Wairimu." The one on leave reads "standing in for you". */
  const standingIn = (r: ARecord) => ((r.basis as any)?.standingInFor ? `, standing in for ${who((r.basis as any).standingInFor)}` : '');
  const it = suite === 'time' ? 'these hours' : suite === 'reviews' ? 'the review' : 'it';
  const out: string[] = [];
  for (const r of records) {
    const on = saidAsADate(new Date(r.at ?? Date.now()));
    const by = who(r.byUserId);
    switch (r.kind) {
      case 'asked': {
        const did = suite === 'time' ? `sent ${it}` : `asked for ${it}`;
        const confirmed = (r.basis as any)?.proposalId
          ? `, after Groundwork said it back and ${by === 'you' ? 'you' : by} said yes`
          : '';
        out.push(`${capital(by)} ${did} on ${on}${confirmed}.`);
        break;
      }
      case 'told':
        out.push((r.basis as any)?.onTheBoard === 'hr'
          ? `Groundwork told ${who(r.toUserId)}, who ${r.toUserId === readerUserId ? 'look' : 'looks'} after HR, on the leave board on ${on}.`
          : `Groundwork told ${who(r.toUserId)} on WhatsApp on ${on}.`);
        break;
      case 'approved':
        out.push(`${capital(by)} approved ${it} on ${on}${standingIn(r)}.`);
        break;
      case 'passed': {
        const had = who(r.toUserId);
        out.push(`${capital(had)} had already approved ${it}, so this step was passed.`);
        break;
      }
      case 'declined':
        out.push(`${capital(by)} declined ${it} on ${on}${standingIn(r)}${(r.basis as any)?.withAReason ? `${standingIn(r) ? ', and' : ' and'} gave a reason` : ''}.`);
        break;
      case 'questioned':
        out.push(`${capital(by)} asked ${who(r.toUserId)} a question about ${it} on ${on}.`);
        break;
      case 'answered': {
        const asker = who(r.toUserId);
        out.push(`${capital(by)} answered ${asker === 'you' ? 'your' : `${asker}'s`} question on ${on}.`);
        break;
      }
      case 'escalated': {
        const from = (r.basis as any)?.fromUserId as string | undefined;
        const because = (r.basis as any)?.because === 'away'
          ? `, because ${who(from)} ${from === readerUserId ? 'were' : 'was'} on leave`
          : (r.basis as any)?.days
            ? `, because ${who(from)} had not answered for ${(r.basis as any).days} working days`
            : '';
        out.push(`Groundwork passed ${it} to ${who(r.toUserId)} on ${on}${from ? because : ''}.`);
        break;
      }
      case 'started':
        out.push(`${capital(by)} started the review on ${on}.`);
        break;
      case 'verified':
        out.push(`${capital(by)} checked ${it} for finance on ${on}.`);
        break;
      case 'coded':
        out.push(`${capital(by)} recorded the budget line it is paid from on ${on}.`);
        break;
      case 'evidence': {
        const what = (r.basis as any)?.what === 'quote' ? 'quote' : 'receipt';
        out.push(`${capital(by)} recorded that finance has the ${what} on ${on}.`);
        break;
      }
      case 'exported':
        out.push(suite === 'time' ? `${capital(by)} put ${it} in a file for billing on ${on}.` : `${capital(by)} put ${it} in a file of requests to pay on ${on}.`);
        break;
      case 'paid': {
        const paidOn = (r.basis as any)?.paidOn as string | undefined;
        const day = paidOn ? saidAsADate(new Date(`${paidOn}T12:00:00.000Z`)) : null;
        out.push(day && day !== on ? `${capital(by)} marked ${it} paid on ${on}. It was paid on ${day}.` : `${capital(by)} marked ${it} paid on ${on}.`);
        break;
      }
      case 'decided':
        out.push(`${capital(by)} decided the review on ${on}.`);
        break;
      case 'corrected':
        out.push(`${capital(by)} marked a line of the review as wrong, and said what is true, on ${on}.`);
        break;
    }
  }
  return out;
}

/** First names of every sign-in a record names. Never an address. */
export async function theNamesIn(prisma: PrismaService, records: ARecord[]): Promise<Map<string, string>> {
  const ids = [...new Set(records.flatMap((r) => [r.byUserId, r.toUserId, (r.basis as any)?.fromUserId, (r.basis as any)?.standingInFor]).filter((x): x is string => typeof x === 'string' && !!x))];
  if (!ids.length) return new Map();
  let us: { id: string; firstName: string | null }[] = [];
  try { us = (await (prisma as any).user?.findMany?.({ where: { id: { in: ids } }, select: { id: true, firstName: true } })) ?? []; } catch { us = []; }
  return new Map(us.map((u) => [u.id, u.firstName?.trim() || '']));
}

/** A request's record, read and said for one reader. The caller has already checked the reader may read the request. */
export async function aRequestsHistory(prisma: PrismaService, organizationId: string, suite: SuiteOfARecord, ref: string, readerUserId: string): Promise<{ said: string[] }> {
  const records = await theRecordOf(prisma, organizationId, suite, ref);
  return { said: theRecordInWords(records, await theNamesIn(prisma, records), readerUserId, suite) };
}

/** The suite a waiting request's kind is kept under. */
export const SUITE_OF_A_REQUEST: Record<'leave' | 'hours' | 'spend', SuiteOfARecord> = { leave: 'leave', hours: 'time', spend: 'spend' };
