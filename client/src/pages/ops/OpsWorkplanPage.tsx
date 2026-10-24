import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE WORKPLAN. Five phases, drawn as overlapping because they overlap.
 *
 * No progress bars. A phase ends when its exit condition is true, and being
 * three weeks from an end date says nothing about whether it will be — a bar
 * here would be a confident answer to a question nobody asked.
 */

const asADate = (iso: string) =>
  whenItWas(iso, 'monthAndYear')

export function OpsWorkplanPage() {
  const plan = useQuery({ queryKey: ['ops', 'workplan'], queryFn: opsApi.workplan, retry: false })

  return (
    <section style={PAGE}>
      <OpsHeader name="The workplan" answers="What are we doing, in what order, and what ends each part?" />

      {plan.data && (
        <div style={{ ...CARD, marginBottom: 16 }}>
          <p style={{ fontSize: 14.5, margin: 0, lineHeight: 1.6 }}>{plan.data.today.says}</p>
        </div>
      )}

      {(plan.data?.phases ?? []).map((p) => (
        <div
          key={p.key}
          style={{
            ...CARD,
            marginBottom: 12,
            borderLeft: p.running ? '3px solid var(--gw-navy)' : '3px solid transparent',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
            <strong style={{ fontSize: 16 }}>{p.name}</strong>
            <span style={{ ...LABEL, fontSize: 10 }}>
              {asADate(p.startsOn)} - {asADate(p.endsOn)}
            </span>
            {p.running && <span style={{ ...LABEL, fontSize: 10 }}>running now</span>}
          </div>

          <p style={{ fontSize: 14, margin: '6px 0 0', lineHeight: 1.6 }}>{p.intent}</p>

          <div style={{ marginTop: 10 }}>
            <div style={{ ...LABEL, fontSize: 10 }}>Done when</div>
            <p style={{ fontSize: 13.5, margin: '3px 0 0', lineHeight: 1.6 }}>{p.exitCondition}</p>
            {/* AN EXIT THAT IS A SENTENCE SAYS SO. Inventing a metric to fill
                the column would produce a number that gets checked, believed,
                and is about something else. */}
            <p
              style={{
                fontSize: 12.5,
                color: p.checkable ? 'var(--gw-sub)' : 'var(--gw-amber-t)',
                margin: '4px 0 0',
                lineHeight: 1.55,
              }}
            >
              {p.says}
            </p>
          </div>

          {p.permitsOperability && (
            <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '10px 0 0', lineHeight: 1.55 }}>
              While this phase is running, work that makes the company able to operate - hiring,
              onboarding, writing down how we work - counts as a contribution on its own. Outside it,
              that work says what it unblocks instead.
            </p>
          )}
        </div>
      ))}

      {plan.data && (plan.data.phases ?? []).length === 0 && (
        <div style={CARD}>No phases are recorded yet.</div>
      )}
    </section>
  )
}
