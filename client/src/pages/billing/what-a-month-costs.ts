import { PLAN_LABELS, formatDollars, type LivePricing, type SubscriptionPlan, type WhatAMonthSays } from '@/api/billing'

/**
 * THE PEOPLE COUNTER ON PLAN AND BILLING (fix list item 6; the light prototype's s73). The server says this month as it is
 * (`status.month`). When the admin moves the counter to see what more or fewer people would cost, the same sentences are
 * worked out here from the same plan rows, with the same arithmetic as the server's what-a-month-costs.ts. At the real
 * number of people, the server's own sentences are drawn as they come.
 */

interface Row { plan: SubscriptionPlan; amountCents: number | null; memberCap: number | null; extraSeatCents: number | null; whatsappPersonCents: number | null }

function rowsOf(pricing: LivePricing | undefined): Row[] {
  return (pricing?.plans ?? []).map((p) => ({
    plan: p.plan,
    amountCents: p.amountCents,
    memberCap: p.memberCap,
    extraSeatCents: p.extraSeatCents ?? null,
    whatsappPersonCents: p.whatsappPersonCents ?? null,
  }))
}

export function extraSeatsOn(p: { memberCap: number | null }, people: number): number {
  return p.memberCap == null ? 0 : Math.max(0, people - p.memberCap)
}

export function seatsCost(p: Row, people: number): number | null {
  if (p.amountCents == null) return null
  const extra = extraSeatsOn(p, people)
  if (extra > 0 && p.extraSeatCents == null) return null
  return p.amountCents + extra * (p.extraSeatCents ?? 0)
}

export interface AMonthOnScreen {
  included: string | null
  lines: { says: string; amount: string }[] | null
  total: { says: string; amount: string } | null
  cheaper: WhatAMonthSays['cheaper']
  forYou: Record<string, string | null>
  forHowMany: string
}

/** What the month says for `people` people. At the real number, exactly the server's sentences. */
export function theMonthFor(month: WhatAMonthSays, pricing: LivePricing | undefined, people: number, onTheHouse: boolean): AMonthOnScreen {
  if (people === month.people || !pricing?.plans?.length) {
    return {
      included: month.included,
      lines: month.lines,
      total: month.total,
      cheaper: month.cheaper,
      forYou: Object.fromEntries(month.plans.map((p) => [p.plan, p.forYou])),
      forHowMany: month.forHowMany,
    }
  }
  const rows = rowsOf(pricing).filter((r) => r.amountCents != null)
  const forYou = Object.fromEntries(rows.map((r) => {
    const c = seatsCost(r, people)
    return [r.plan, c == null ? null : formatDollars(c)]
  }))
  const row = month.plan ? rows.find((r) => r.plan === month.plan) : undefined
  if (!row || row.amountCents == null) {
    return { included: month.included, lines: null, total: null, cheaper: null, forYou, forHowMany: `For ${people}` }
  }
  const label = PLAN_LABELS[row.plan]
  const extra = extraSeatsOn(row, people)
  const seat = row.extraSeatCents ?? 0
  const included = row.memberCap == null ? label : `${label}, ${row.memberCap} seats included${extra ? `, plus ${extra} extra at +${formatDollars(seat)} each` : ''}`
  const lines = [{ says: label, amount: formatDollars(row.amountCents) }]
  if (extra) lines.push({ says: `${extra} extra ${extra === 1 ? 'seat' : 'seats'} × ${formatDollars(seat)}`, amount: formatDollars(extra * seat) })
  /* WhatsApp: the people who used it this month, never more than the people counted here. */
  const n = month.numbers
  const used = Math.min(n.whatsappUsedIt, people)
  const per = row.whatsappPersonCents ?? 0
  const who = `${used} ${used === 1 ? 'person' : 'people'} used it`
  /* The old flat WhatsApp price holds only while no seat is added past the plan. */
  const flat = extra === 0 ? n.whatsappFlatCents : null
  const waCents = !n.whatsappOn || n.whatsappFree ? 0 : flat != null ? flat : used * per
  const serverWa = month.lines?.[month.lines.length - 1]
  lines.push(!n.whatsappOn
    ? { says: 'WhatsApp: switched off', amount: formatDollars(0) }
    : flat != null || n.whatsappFree
      ? { says: (serverWa?.says ?? '').replace(/^WhatsApp: \d+ (person|people) used it/, `WhatsApp: ${who}`), amount: formatDollars(waCents) }
      : { says: `WhatsApp: ${who} × ${formatDollars(per)}`, amount: formatDollars(waCents) })
  const totalCents = row.amountCents + extra * seat + waCents
  const total = { says: 'This month', amount: formatDollars(onTheHouse ? 0 : totalCents) }

  let cheaper: WhatAMonthSays['cheaper'] = null
  const now = seatsCost(row, people)
  if (!onTheHouse && now != null) {
    let best: { plan: SubscriptionPlan; cents: number } | null = null
    for (const r of rows) {
      if (r.plan === row.plan) continue
      const c = seatsCost(r, people)
      if (c != null && (!best || c < best.cents)) best = { plan: r.plan, cents: c }
    }
    if (best && best.cents <= now - 50) {
      const ex = extraSeatsOn(rows.find((r) => r.plan === best!.plan)!, people)
      cheaper = {
        plan: best.plan,
        says: `Cheaper for ${people} people: ${PLAN_LABELS[best.plan]}${ex ? ` with ${ex} extra ${ex === 1 ? 'seat' : 'seats'}` : ''}, ${formatDollars(best.cents)} a month instead of ${formatDollars(now)}.`,
        button: `Switch to ${PLAN_LABELS[best.plan]}`,
      }
    }
  }
  return { included, lines, total, cheaper, forYou, forHowMany: `For ${people}` }
}
