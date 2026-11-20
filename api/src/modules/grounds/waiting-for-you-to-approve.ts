import type { Need } from './what-needs-you';
import { saidAsADay } from '../suites/who-is-away';
import { whatTheMoneyIsFor } from '../suites/a-request-in-words';

/**
 * WHAT IS WAITING FOR YOU TO APPROVE, TOLD ON TODAY (week 21). Leave, hours and spending, said in
 * plain sentences and only to the person who approves them.
 *
 * It is worked out from the boards' own reads, which already say, row by row, whether this reader is
 * the one who approves it (`decidesIt`, who-may-decide.ts). Nothing here decides who approves.
 *   - Leave is said as dates only, never the reason or the kind (decision 31).
 *   - Hours are said as what was sent and for which day, never as how much somebody works, and with no
 *     comparison (decision 10: hours are for billing only).
 *   - Up to two of a kind are each said. Three or more are said once, with the count.
 */

export interface WaitingLeave { name: string; startsOn: string; endsOn: string; mayDecide: boolean }
export interface WaitingHours { name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean; days: string[]; weekOf: string }
export interface WaitingSpend { firstName: string; amount: number; what: string; mayDecide: boolean }

const first = (full: string) => full.trim().split(/\s+/)[0];
const MANY = 3;

const hoursSaid = (minutes: number) => {
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hour' : 'hours'}`;
};
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const amountSaid = (amount: number, currency: string | null) => `${currency ? `${currency} ` : ''}${amount.toLocaleString('en-US')}`;

export function waitingForYouToApprove(
  input: { leave?: WaitingLeave[]; hours?: WaitingHours[]; spend?: WaitingSpend[]; currency?: string | null },
  organizationId: string,
): Need[] {
  const base = { groundId: '', organizationId, kind: 'decide' as const };
  const out: Need[] = [];
  const WAITING = 'It is waiting for you to approve.';

  const leave = (input.leave ?? []).filter((l) => l.mayDecide);
  if (leave.length >= MANY) {
    out.push({ ...base, key: 'approve-leave', title: `${leave.length} leave requests are waiting for you to approve.`, detail: null, action: { label: 'Look at them', to: '/suite/queue?suite=leave' } });
  } else {
    leave.forEach((l, i) => out.push({
      ...base, key: `approve-leave-${i}`,
      title: `${first(l.name)} asked for leave ${l.startsOn === l.endsOn ? `on ${saidAsADay(l.startsOn)}` : `from ${saidAsADay(l.startsOn)} to ${saidAsADay(l.endsOn)}`}.`,
      detail: WAITING, action: { label: 'Look at it', to: '/suite/queue?suite=leave' },
    }));
  }

  const hours = (input.hours ?? []).filter((h) => h.mayApprove && !h.approved && h.total > 0);
  if (hours.length >= MANY) {
    out.push({ ...base, key: 'approve-hours', title: `Hours from ${hours.length} people are waiting for you to approve.`, detail: null, action: { label: 'Look at them', to: '/suite/time' } });
  } else {
    hours.forEach((h, i) => {
      const clients = Object.entries(h.minutes).filter(([, m]) => m > 0).map(([c]) => c);
      const when = h.days.length === 1 ? saidAsADay(h.days[0]) : `the week of ${saidAsADay(h.weekOf)}`;
      out.push({
        ...base, key: `approve-hours-${i}`,
        title: `${first(h.name)} sent ${hoursSaid(h.total)}${clients.length ? ` on ${listed(clients)}` : ''} for ${when}.`,
        detail: 'They are waiting for you to approve.', action: { label: 'Look at them', to: '/suite/time' },
      });
    });
  }

  const spend = (input.spend ?? []).filter((s) => s.mayDecide);
  if (spend.length >= MANY) {
    out.push({ ...base, key: 'approve-spend', title: `${spend.length} requests to spend are waiting for you to approve.`, detail: null, action: { label: 'Look at them', to: '/suite/queue?suite=spend' } });
  } else {
    spend.forEach((s, i) => out.push({
      ...base, key: `approve-spend-${i}`,
      title: `${s.firstName} asked to spend ${amountSaid(s.amount, input.currency ?? null)} on ${whatTheMoneyIsFor(s.what)}.`,
      detail: WAITING, action: { label: 'Look at it', to: '/suite/queue?suite=spend' },
    }));
  }
  return out;
}
