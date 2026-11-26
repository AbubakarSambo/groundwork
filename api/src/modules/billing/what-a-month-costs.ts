import { SubscriptionPlan } from '@prisma/client';

/**
 * WHAT A MONTH COSTS (fix list item 6, Hafsah, 15 October 2026; the light prototype's s73).
 *
 *   A plan's price, for the seats it includes.
 *   + each seat past those, at the plan's extra-seat price ($5).
 *   + WhatsApp, for each person who used it that month, at the plan's price per person ($4), never more than the seats.
 *
 * Every number comes from the plan's row in `pricing_plans`, so the back office changes it with no code. Nothing here
 * holds a price of its own. The same arithmetic decides what Stripe is told and what Plan and billing says.
 */

export interface APlansPrices {
  plan: SubscriptionPlan;
  amountCents: number | null;
  memberCap: number | null;
  extraSeatCents: number | null;
  whatsappPersonCents: number | null;
}

/** The seats past what the plan includes. Zero for a plan with no limit. */
export function extraSeatsOn(p: Pick<APlansPrices, 'memberCap'>, people: number): number {
  if (p.memberCap === null || p.memberCap === undefined) return 0;
  return Math.max(0, people - p.memberCap);
}

/**
 * What the plan and its extra seats cost a month for this many people. Null when the plan cannot hold them on its own:
 * no price (Enterprise), or more people than it includes and no extra-seat price.
 */
export function seatsCost(p: APlansPrices, people: number): number | null {
  if (p.amountCents === null || p.amountCents === undefined) return null;
  const extra = extraSeatsOn(p, people);
  if (extra > 0 && (p.extraSeatCents === null || p.extraSeatCents === undefined)) return null;
  return p.amountCents + extra * (p.extraSeatCents ?? 0);
}

/** The people WhatsApp is charged for: those who used it, never more than the seats. */
export function whatsappPeopleCharged(usedIt: number, seats: number): number {
  return Math.max(0, Math.min(usedIt, seats));
}

export interface AMonth {
  plan: SubscriptionPlan;
  planCents: number;
  people: number;
  included: number | null;
  extraSeats: number;
  extraSeatCents: number;
  extraSeatsCents: number;
  whatsappOn: boolean;
  whatsappPeople: number;
  whatsappPersonCents: number;
  whatsappCents: number;
  /** Set only for an organisation that keeps the old flat WhatsApp line: what that line costs. */
  whatsappFlatCents: number | null;
  totalCents: number;
}

/**
 * THIS MONTH, LINE BY LINE. `whatsappFlatCents` is the old flat line, for the organisations that keep it; otherwise WhatsApp
 * is the people who used it times the price per person. `whatsappFree` is the free month: on, and nothing charged.
 */
export function thisMonth(
  p: APlansPrices,
  people: number,
  whatsapp: { on: boolean; usedIt: number; free?: boolean; flatCents?: number | null },
): AMonth | null {
  if (p.amountCents === null || p.amountCents === undefined) return null;
  const extraSeats = extraSeatsOn(p, people);
  const extraSeatCents = p.extraSeatCents ?? 0;
  const whatsappPersonCents = p.whatsappPersonCents ?? 0;
  const whatsappPeople = whatsapp.on ? whatsappPeopleCharged(whatsapp.usedIt, people) : 0;
  const flat = whatsapp.on && whatsapp.flatCents != null ? whatsapp.flatCents : null;
  const whatsappCents = !whatsapp.on || whatsapp.free ? 0 : flat !== null ? flat : whatsappPeople * whatsappPersonCents;
  const extraSeatsCents = extraSeats * extraSeatCents;
  return {
    plan: p.plan,
    planCents: p.amountCents,
    people,
    included: p.memberCap,
    extraSeats,
    extraSeatCents,
    extraSeatsCents,
    whatsappOn: whatsapp.on,
    whatsappPeople,
    whatsappPersonCents,
    whatsappCents,
    whatsappFlatCents: flat,
    totalCents: p.amountCents + extraSeatsCents + whatsappCents,
  };
}

/**
 * THE CHEAPER PLAN, WHEN THERE IS ONE (s73: "Groundwork suggests a cheaper plan when there is one, a suggestion, never
 * automatic"). Compares the plan and its seats only, since WhatsApp costs the same on every plan. Null when the current
 * plan is already the cheapest for this many people.
 */
export function aCheaperPlan(plans: APlansPrices[], current: SubscriptionPlan, people: number): { plan: SubscriptionPlan; cents: number; extraSeats: number; insteadOf: number } | null {
  const mine = plans.find((p) => p.plan === current);
  const now = mine ? seatsCost(mine, people) : null;
  if (now === null) return null;
  let best: { plan: SubscriptionPlan; cents: number; extraSeats: number } | null = null;
  for (const p of plans) {
    if (p.plan === current) continue;
    const c = seatsCost(p, people);
    if (c === null) continue;
    if (!best || c < best.cents) best = { plan: p.plan, cents: c, extraSeats: extraSeatsOn(p, people) };
  }
  /* Half a dollar or more, as the prototype has it, so a rounding difference is never a suggestion. */
  if (!best || best.cents > now - 50) return null;
  return { ...best, insteadOf: now };
}

/** "$72", or "$12.50" when there are cents. */
export function dollarsOf(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
}

/** "This adds a seat: +$5 a month" (fix list item 6, Hafsah's own words). */
export function thisAddsASeat(extraSeatCents: number): string {
  return `This adds a seat: +${dollarsOf(extraSeatCents)} a month`;
}

/** "16th", "21st", "2nd": for "This is your 16th of 20 seats". */
export function anOrdinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

export interface WhatAddingIsAsked {
  /** Whether anything is charged at all: the free trial's switch is on and the organisation pays for a plan. */
  charged: boolean;
  /** Why nothing is charged, when it is not: the switch is off (a free trial), or the organisation is not on a paid plan. */
  whyFree?: 'free trial' | 'not paying';
  /** Seats taken now, and how many the plan includes (null: no limit). */
  taken: number;
  included: number | null;
  /** The plan's price for a seat past the included ones (null: none, so nobody past them can be added). */
  extraSeatCents: number | null;
  /** The person being added, by first name, when the screen knows it. */
  name?: string | null;
  /** WhatsApp, where the person may check in on it: the price per person who used it this month, and whether they are already counted. */
  whatsapp?: { personCents: number | null; alreadyCounted: boolean } | null;
}

/**
 * THE COST LINE WHERE SOMEBODY IS ADDED (Hafsah, 21 November 2026). One plain line for the confirm step, worked out from the same
 * prices Plan and billing reads (`pricing_plans`, through PricingService), so the two always agree. A price is only ever said when
 * it will be charged.
 */
/**
 * WHAT APPROVING A CHECK-IN GIVES, AND COSTS (Hafsah, 26 November 2026: "they see who takes the seat and approve and pay if
 * needed"). Everybody named on a check-in an admin approves takes a seat at that yes, so the approval says who, and what it adds
 * to the bill, from the same figures as the line beside an invitation. Null when nobody on it needs a new seat.
 */
export function whatApprovingSays(a: Omit<WhatAddingIsAsked, 'name' | 'whatsapp'> & { names: string[] }): string | null {
  const n = a.names.length;
  if (!n) return null;
  const who = n === 1 ? a.names[0] : `${a.names.slice(0, -1).join(', ')} and ${a.names[n - 1]}`;
  const gives = `Approving it gives ${n === 1 ? 'a seat' : 'seats'} to ${who}, ${n === 1 ? 'who is' : 'who are'} new here.`;
  if (!a.charged) return `${gives} ${whatAddingSomebodySays(a).line}`;
  if (a.included === null) return `${gives} This does not change your bill.`;
  const fit = Math.max(0, a.included - a.taken);
  if (fit >= n) return `${gives} Your plan’s seats cover ${n === 1 ? 'them' : 'all of them'}, so your bill doesn’t change.`;
  const over = n - fit;
  const fits = fit === 0 ? 'Your plan’s seats are all taken.' : `Your plan’s seats cover ${fit} of them.`;
  if (a.extraSeatCents === null) return `${gives} ${fits} The other ${over === 1 ? 'person waits' : `${over} wait`} for a seat until you make room, and ${over === 1 ? 'is' : 'are'} not invited until then.`;
  return `${gives} ${fits} The other ${over === 1 ? 'person needs a new seat' : `${over} need new seats`}, which adds ${dollarsOf(a.extraSeatCents * over)} a month from today.`;
}

export function whatAddingSomebodySays(a: WhatAddingIsAsked): { line: string; needsAYes: boolean; whatsappLine: string | null } {
  if (!a.charged) {
    return { line: a.whyFree === 'not paying' ? 'Nothing is charged, because your organisation is not on a paid plan.' : 'Nothing is charged during your free trial.', needsAYes: false, whatsappLine: null };
  }
  const who = a.name?.trim() || null;
  const whatsappLine = a.whatsapp?.personCents && !a.whatsapp.alreadyCounted
    ? `If ${who ?? 'they'} ${who ? 'checks' : 'check'} in on WhatsApp this month, it adds ${dollarsOf(a.whatsapp.personCents)} to this month’s bill.`
    : null;
  if (a.included === null) return { line: 'This does not change your bill.', needsAYes: false, whatsappLine };
  if (a.taken < a.included) return { line: `This is your ${anOrdinal(a.taken + 1)} of ${a.included} seats, so your bill doesn’t change.`, needsAYes: false, whatsappLine };
  if (a.extraSeatCents === null) return { line: 'Your plan has no room for anyone else.', needsAYes: false, whatsappLine: null };
  return { line: `This needs a new seat. It adds ${dollarsOf(a.extraSeatCents)} a month from today.${who ? ` Add ${who}?` : ''}`, needsAYes: true, whatsappLine };
}
