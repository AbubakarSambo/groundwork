import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { LABEL } from './OpsLayout'
import { Adder } from './OpsForm'

/**
 * WHAT A PIECE OF WORK SERVES, ASKED WHERE THE WORK IS.
 *
 * "A product contribution counts only if it improves sales or the moat" was a
 * sentence in a plan. This is the sentence as a field, and it sits on the item
 * rather than on a separate screen because the only moment the answer is cheap
 * is the moment somebody proposes the work. Afterwards it is a justification
 * for something already built, and nobody has ever failed to produce one.
 *
 * IT DOES NOT BLOCK. Work that says nothing is listed on the roadmap and
 * counted. A refusal would be answered by typing anything into the box, and
 * then the field is worse than absent: it looks like a decision.
 */
export function WhatThisServes({
  recordType,
  recordId,
  said,
}: {
  recordType: string
  recordId: string
  said?: { serves: string; justification: string; dependsOn: string | null; dependsOnOwnedBy: string | null } | null
}) {
  const options = useQuery({
    queryKey: ['ops', 'what-work-can-serve'],
    queryFn: opsApi.whatWorkCanServe,
    retry: false,
  })
  const useCases = useQuery({ queryKey: ['ops', 'use-cases'], queryFn: opsApi.useCases, retry: false })
  const moat = useQuery({ queryKey: ['ops', 'moat'], queryFn: opsApi.moat, retry: false })

  /* Both lists, offered together and labelled by what they are, because the
     field that names them changes meaning with the answer above it. A picker
     that swapped its contents as you chose would be cleverer and harder to
     read back. */
  const canPointAt = [
    ...(useCases.data ?? []).map((u) => ({ value: u.id, label: `Use case · ${u.company.name} — ${u.title}` })),
    ...(moat.data?.components ?? []).map((c) => ({ value: c.key, label: `Moat · ${c.name}` })),
  ]

  return (
    <div style={{ marginTop: 8 }}>
      {said ? (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          <span style={{ ...LABEL, fontSize: 9.5, marginRight: 8 }}>
            {options.data?.find((o) => o.serves === said.serves)?.label ?? said.serves}
          </span>
          {said.justification}
          {said.dependsOn && (
            /* Said out loud wherever the work is read, not filed on a page
               somebody visits. A dependency is only a risk if somebody sees it. */
            <div style={{ color: 'var(--gw-amber-t)', marginTop: 3 }}>
              Depends on {said.dependsOn}
              {said.dependsOnOwnedBy ? `, owned by ${said.dependsOnOwnedBy}` : ''}
            </div>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 12.5, color: 'var(--gw-red-t)' }}>Has not said what it serves</span>
      )}

      <Adder
        title={said ? 'change what it serves' : 'say what it serves'}
        fields={[
          {
            name: 'serves',
            label: 'What this is for',
            required: true,
            options: (options.data ?? []).map((o) => ({ value: o.serves, label: o.label })),
          },
          {
            name: 'servesRecordId',
            label: 'Which one — the use case, or the moat component',
            options: canPointAt,
          },
          {
            name: 'justification',
            label: 'Why this, and why now',
            type: 'textarea',
            required: true,
            placeholder: 'A sentence. "Important" will be refused.',
          },
          {
            name: 'dependsOn',
            label: 'What it makes us depend on, if anything',
            placeholder: 'A library, a service, an account',
          },
          { name: 'dependsOnOwnedBy', label: 'Who owns that' },
        ]}
        submit={(v) =>
          opsApi.sayWhatItServes({
            recordType,
            recordId,
            serves: v.serves,
            servesRecordId: v.servesRecordId || undefined,
            justification: v.justification,
            dependsOn: v.dependsOn || undefined,
            dependsOnOwnedBy: v.dependsOnOwnedBy || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Say it"
      />
    </div>
  )
}

/**
 * OPEN WORK THAT HAS NAMED NOTHING.
 *
 * The first threat, and it is the absence of a row rather than a complaint
 * anybody filed. Shown at the top of the roadmap because that is where somebody
 * adding work will see it, and hidden entirely when it is empty — a permanent
 * zero teaches people to stop reading the line.
 */
export function WorkThatSaysNothing() {
  const nothing = useQuery({
    queryKey: ['ops', 'what-serves-nothing'],
    queryFn: opsApi.whatServesNothing,
    retry: false,
  })

  if (!nothing.data || nothing.data.value === 0) return null

  return (
    <section
      style={{
        background: 'var(--gw-amber-bg)',
        border: '1px solid var(--gw-amber-b-soft)',
        borderRadius: 8,
        padding: '11px 14px',
        marginBottom: 14,
      }}
    >
      <p style={{ ...LABEL, color: 'var(--gw-amber-t)' }}>{nothing.data.says}</p>
      <p style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.6 }}>
        {nothing.data.rows.map((r) => r.title).join(' · ')}
      </p>
      <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '6px 0 0' }}>
        Work that serves neither a customer nor the moat may still be right. It should be said out
        loud rather than assumed.
      </p>
    </section>
  )
}
