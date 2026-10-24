import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opsApi, type OpsResource, type OpsResourceCheck } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { Adder } from './OpsForm'

/**
 * THE REGISTER: what we put in front of people, and whether it matches what we
 * sell.
 *
 * The number on each row is a count out of a count and every claim behind it
 * opens. It is deliberately not a percentage and not a grade: the thing being
 * judged is somebody's writing, and a grade on somebody's writing ends the
 * conversation the check exists to start.
 */

const CATEGORIES = [
  { value: 'PITCH_DECK', label: 'Pitch deck' },
  { value: 'SALES_DECK', label: 'Sales deck' },
  { value: 'CAMPAIGN_STRATEGY', label: 'Campaign strategy' },
  { value: 'CAMPAIGN_CONTENT', label: 'Campaign content' },
  { value: 'MARKETING_SITE_COPY', label: 'Marketing site copy' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'OTHER', label: 'Something else' },
]

const CATEGORY_LABEL = new Map(CATEGORIES.map((c) => [c.value, c.label]))

const VERDICT_SAID: Record<OpsResourceCheck['verdict'], string> = {
  CLEAR: 'reads clear',
  SAYS_WHAT_WE_ARE_NOT: 'says what we are not',
  NEEDS_A_LOOK: 'needs a look',
}

function Checks({ checks }: { checks: OpsResourceCheck[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
      {checks.map((c, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          <span
            style={{
              color: c.verdict === 'SAYS_WHAT_WE_ARE_NOT' ? 'var(--gw-red-t)' : 'inherit',
            }}
          >
            {c.kind === 'IS_NOT' ? 'We are not: ' : 'We are: '}
            {c.claim}
          </span>
          <span style={{ color: 'var(--gw-sub)' }}> - {VERDICT_SAID[c.verdict]}</span>
          <div style={{ color: 'var(--gw-sub)', fontSize: 12.5, marginTop: 2, lineHeight: 1.5 }}>
            {c.says}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Row({ resource }: { resource: OpsResource }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const recheck = useMutation({
    mutationFn: () => opsApi.recheckResource(resource.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops', 'resources'] }),
  })

  const flagged = resource.standing.flagged.length > 0

  return (
    <div
      style={{
        ...CARD,
        marginBottom: 12,
        borderLeft: flagged ? '3px solid var(--gw-red-t)' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 15 }}>{resource.title}</strong>
        <span style={{ ...LABEL, fontSize: 10 }}>
          {resource.categoryDetail ?? CATEGORY_LABEL.get(resource.category) ?? resource.category}
        </span>
        {resource.url && (
          <a href={resource.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
            open it
          </a>
        )}
      </div>

      <p style={{ fontSize: 13.5, margin: '8px 0 0', lineHeight: 1.6 }}>{resource.standing.says}</p>
      {resource.checkSays && (
        <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '4px 0 0', lineHeight: 1.55 }}>
          {resource.checkSays}
        </p>
      )}

      {/* THE SIGN-OFF WENT STALE. Shown, never hidden: a sign-off is only good
          for the words it was checked against, and what changed in the
          statement may be exactly what this piece claims. */}
      {resource.stale && (
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--gw-amber-t)',
            margin: '8px 0 0',
            lineHeight: 1.55,
          }}
        >
          {resource.stale}
        </p>
      )}

      {resource.risks.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ ...LABEL, fontSize: 10 }}>What could go wrong with it</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
            {resource.risks.map((r, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
        {resource.checks && resource.checks.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
          >
            {open ? 'Hide what it was checked against' : 'What it was checked against'}
          </button>
        )}
        <button
          type="button"
          onClick={() => recheck.mutate()}
          disabled={recheck.isPending}
          style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
        >
          {recheck.isPending ? 'Checking…' : 'Check it again'}
        </button>
      </div>

      {open && resource.checks && <Checks checks={resource.checks} />}
    </div>
  )
}

export function OpsResourcesPage() {
  const register = useQuery({ queryKey: ['ops', 'resources'], queryFn: opsApi.resources, retry: false })

  return (
    <section style={PAGE}>
      <OpsHeader
        name="Resources"
        answers="What are we putting in front of people, and does it match what we sell?"
      />

      {register.data && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.6 }}>
          Checked against version {register.data.checkedAgainst.version} of what we say we are:{' '}
          <em>{register.data.checkedAgainst.headline}</em>
        </p>
      )}

      <Adder
        title="Enter a resource"
        fields={[
          { name: 'title', label: 'What is it', required: true },
          { name: 'category', label: 'Kind', required: true, options: CATEGORIES },
          { name: 'categoryDetail', label: 'If something else, what', placeholder: 'Podcast script' },
          { name: 'url', label: 'Where it lives', placeholder: 'https://…' },
          {
            name: 'content',
            label: 'The words themselves',
            required: true,
            placeholder: 'Paste the copy. A link cannot be read by a check.',
          },
          /* THREE RISKS, ASKED OF A PERSON. One is a formality, five is an essay
             nobody writes, and the third is usually the real one. Written by
             somebody rather than the model: a risk somebody typed is a risk
             somebody owns. */
          { name: 'risk1', label: 'What could go wrong (1)', required: true },
          { name: 'risk2', label: 'What could go wrong (2)', required: true },
          { name: 'risk3', label: 'What could go wrong (3)', required: true },
        ]}
        submit={(v) =>
          opsApi.addResource({
            title: v.title,
            category: v.category,
            categoryDetail: v.categoryDetail || undefined,
            url: v.url || undefined,
            content: v.content,
            risks: [v.risk1, v.risk2, v.risk3],
          })
        }
        invalidate={[['ops']]}
        submitLabel="Enter it and check it"
      />

      {(register.data?.resources ?? []).map((r) => (
        <Row key={r.id} resource={r} />
      ))}

      {register.data && (register.data.resources ?? []).length === 0 && (
        <div style={CARD}>
          Nothing in the register yet. The deck, the site copy and the last campaign are the ones
          worth entering first - they are the ones already in front of people.
        </div>
      )}
    </section>
  )
}
