import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * WHAT THE DATABASE WILL HOLD, READ OUT OF THE MIGRATIONS.
 *
 * Prices and seat caps live in `pricing_plans`, where a platform admin edits them, so no test can
 * pin the live figure - that is a row, and it reaching every surface through one endpoint is the
 * whole point. What a test CAN pin is the seed: the values a fresh database starts with, which are
 * also the values the marketing site has hand-written into its HTML.
 *
 * Folded in filename order rather than read from one file, because that is how migrations apply
 * and because the values change: a later migration that lowers a cap or raises a price must win
 * here exactly as it wins in Postgres. A parser pointed at a single migration would pass forever
 * while quietly describing the state of the database six months ago.
 *
 * Test-only. It reads the filesystem, so it must never be imported by anything that ships.
 */
const MIGRATIONS_DIR = join(__dirname, '../../../api/prisma/migrations')

export interface SeededPlan {
  amountCents: number | null
  memberCap: number | null
}

function fold(): Record<string, SeededPlan> {
  const out: Record<string, SeededPlan> = {}
  const dirs = readdirSync(MIGRATIONS_DIR).filter(d => !d.startsWith('.')).sort()

  for (const dir of dirs) {
    let sql: string
    try {
      sql = readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8')
    } catch {
      continue
    }
    if (!sql.includes('pricing_plans')) continue

    /** Comments stripped: these migrations explain themselves at length and quote values while doing it. */
    const code = sql.replace(/--.*$/gm, '')

    /** INSERT ... VALUES ('PLAN', amount, ...) - the original seed, one tuple per line. */
    for (const m of code.matchAll(/\(\s*'([A-Z_]+)'\s*,\s*(\d+|NULL)\s*(?:,\s*(\d+|NULL)\s*)?,\s*CURRENT_TIMESTAMP\s*\)/g)) {
      const [, plan, amount, cap] = m
      const row = (out[plan] ??= { amountCents: null, memberCap: null })
      row.amountCents = amount === 'NULL' ? null : Number(amount)
      if (cap !== undefined) row.memberCap = cap === 'NULL' ? null : Number(cap)
    }

    /**
     * UPDATE ... SET "col" = value [, more columns] WHERE "plan" = 'PLAN'.
     *
     * Each statement is isolated FIRST, then its assignments are read, because a real price change
     * also clears the cached Stripe price id in the same statement:
     *
     *   SET "amount_cents" = 9000, "stripe_price_id" = NULL WHERE "plan" = 'SMALL_TEAM'
     *
     * An earlier version of this required WHERE to follow the value directly, so that statement
     * matched nothing and the parser reported the OLD price - a guard that passes while describing
     * a database that no longer exists, which is worse than no guard.
     */
    for (const stmt of code.matchAll(/UPDATE\s+"pricing_plans"\s+SET\s+([\s\S]*?)\s+WHERE\s+"plan"\s*=\s*'([A-Z_]+)'/g)) {
      const [, assignments, plan] = stmt
      const row = (out[plan] ??= { amountCents: null, memberCap: null })
      for (const a of assignments.matchAll(/"(amount_cents|member_cap)"\s*=\s*(\d+|NULL)/g)) {
        const [, col, value] = a
        const v = value === 'NULL' ? null : Number(value)
        if (col === 'amount_cents') row.amountCents = v
        else row.memberCap = v
      }
    }
  }
  return out
}

export const SEEDED_PLANS = fold()

/** "$25" - the amount as the marketing HTML writes it, with no "/mo". */
export function seededAmountLabel(plan: string): string | null {
  const cents = SEEDED_PLANS[plan]?.amountCents
  if (cents == null) return null
  const dollars = cents / 100
  return `$${dollars.toLocaleString('en-US')}`
}

/** "Up to 20 people" - the cap as the marketing HTML writes it. */
export function seededCapLabel(plan: string): string {
  const cap = SEEDED_PLANS[plan]?.memberCap
  if (cap == null) return 'Unlimited'
  return `Up to ${cap.toLocaleString('en-US')} people`
}

/** "20 seats included", as the pricing pages say a plan's seats once any plan can add more (fix list item 6). */
export function seededSeatsIncludedLabel(plan: string): string {
  const cap = SEEDED_PLANS[plan]?.memberCap
  if (cap == null) return 'Unlimited'
  return `${cap.toLocaleString('en-US')} seats included`
}
