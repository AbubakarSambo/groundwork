import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { LABEL } from './OpsLayout'
import { Adder } from './OpsForm'
import { readDate } from './OpsTable'

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
    ...(useCases.data ?? []).map((u) => ({ value: u.id, label: `Use case · ${u.company.name} - ${u.title}` })),
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
            label: 'Which one - the use case, or the moat component',
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
/**
 * THE FREEZE, WHERE WORK IS PROPOSED.
 *
 * Not on a settings page somebody visits once. It sits at the top of the
 * roadmap, because the person who needs to read it is the person about to add
 * something, and they are looking here.
 */
export function TheFreeze() {
  const freeze = useQuery({ queryKey: ['ops', 'freeze'], queryFn: opsApi.freezeNow, retry: false })
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const mayDecide = me.data?.capabilities.includes('ceo:board') ?? false
  const f = freeze.data
  if (!f) return null

  return (
    <section
      style={{
        background: f.isOn ? 'var(--gw-blue-bg)' : 'var(--gw-slate)',
        border: `1px solid ${f.isOn ? 'var(--gw-blue-b)' : 'var(--gw-border)'}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 14,
      }}
    >
      <p style={{ ...LABEL, color: f.isOn ? 'var(--gw-blue-t)' : 'var(--gw-muted)' }}>
        {f.isOn ? 'The product is frozen' : 'Nothing is frozen'}
      </p>
      <p style={{ fontSize: 13.5, margin: '5px 0 0', maxWidth: '62ch', lineHeight: 1.6 }}>{f.says}</p>
      {f.isOn && (
        <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '6px 0 0', maxWidth: '62ch', lineHeight: 1.6 }}>
          Making an unsupported use case work, and keeping what exists running, go through as normal.
          Anything else - including the moat - needs somebody to agree it cannot wait.
        </p>
      )}
      {f.overdue && (
        /* Said, never done. A freeze that lifts itself ends without anybody
           deciding it should. */
        <p style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', margin: '6px 0 0' }}>
          It is past the date it was meant to lift. Somebody has to decide whether it stays.
        </p>
      )}
      {/* WHAT WAS DECIDED BEFORE, AND BY WHOM.
          The whole reason this is append-only: lifting a freeze is the moment
          the company stops doing what it agreed to do, and it is the one done
          in a hurry. A record only the person who lifted it can see is not a
          record. */}
      <WhatWasDecidedAboutTheFreeze />

      {mayDecide && (
        <div style={{ marginTop: 10 }}>
          <Adder
            title={f.isOn ? 'Lift it' : 'Freeze the product'}
            fields={[
              {
                name: 'because',
                label: f.isOn ? 'Why it is lifting' : 'What the freeze is for',
                type: 'textarea',
                required: true,
              },
              ...(f.isOn ? [] : [{ name: 'until', label: 'Until when', type: 'date' as const }]),
            ]}
            submit={(v) =>
              opsApi.decideTheFreeze({ isOn: !f.isOn, because: v.because, until: v.until || undefined })
            }
            invalidate={[['ops']]}
            submitLabel={f.isOn ? 'Lift it' : 'Freeze it'}
          />
        </div>
      )}
    </section>
  )
}

function WhatWasDecidedAboutTheFreeze() {
  const [open, setOpen] = useState(false)
  const past = useQuery({
    queryKey: ['ops', 'freeze-history'],
    queryFn: opsApi.freezeHistory,
    retry: false,
    enabled: open,
  })

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
      >
        {open ? 'Hide what was decided before' : 'What was decided before'}
      </button>
      {open && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          {(past.data ?? []).map((d) => (
            <li key={d.id}>
              <strong>{d.isOn ? 'Frozen' : 'Lifted'}</strong> {readDate(d.decidedAt)} by {d.decidedById} - {d.because}
            </li>
          ))}
          {past.data?.length === 0 && <li>Nobody has decided anything about it yet.</li>}
        </ul>
      )}
    </div>
  )
}

/**
 * A STANDING ITEM: THE FRAME, NOT A PROPOSAL.
 *
 * Everything else on the roadmap can be argued with, reprioritised or dropped.
 * These cannot, and showing them in the same table with the same status picker
 * made them look like opinions somebody could disagree with.
 *
 * The first of them carries a COUNT rather than a status. "The product is
 * solid" is the claim on this board most likely to outrun its evidence —
 * everybody agrees with it in a meeting and nobody has measured it — so it
 * reads three numbers and says which part is not done.
 */
export function TheFrame({ item }: { item: { id: string; title: string; description?: string | null; itemType: string } }) {
  const solidity = useQuery({
    queryKey: ['ops', 'solidity'],
    queryFn: opsApi.howSolid,
    retry: false,
    /* Only the stability item is defined by these counts. Fetching them beside
       the marketing-site item would attach a number to something it does not
       measure. */
    enabled: item.itemType === 'stability',
  })
  const [open, setOpen] = useState(false)
  const s = item.itemType === 'stability' ? solidity.data : null

  return (
    <section
      style={{
        background: 'white',
        border: '1px solid var(--gw-border)',
        borderLeft: `3px solid ${s?.solid ? 'var(--gw-green)' : 'var(--gw-navy)'}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 10,
      }}
    >
      <p style={LABEL}>Not a proposal</p>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: '4px 0 6px' }}>{item.title}</h2>
      {item.description && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: 0, maxWidth: '68ch', lineHeight: 1.6 }}>
          {item.description}
        </p>
      )}

      {s && (
        <>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: '10px 0 0',
              color: s.solid ? 'var(--gw-green-t)' : 'var(--gw-text)',
            }}
          >
            {s.says}
          </p>
          {!s.solid && (
            <>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10, marginTop: 6 }}
              >
                {open ? 'Hide what is left' : 'What is left'}
              </button>
              {open && (
                /* Named, because "three use cases do not work" is only useful
                   if you can see which three and for whom. */
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
                  {s.bugs.map((b) => (
                    <li key={b.title}>Bug · {b.title}</li>
                  ))}
                  {s.useCases.map((u) => (
                    <li key={`${u.company}-${u.title}`}>
                      {u.company} · {u.title} - {u.readiness.replace(/_/g, ' ').toLowerCase()}
                    </li>
                  ))}
                  {s.blocked.map((b) => (
                    <li key={b.name}>Blocked · {b.name} - {b.why}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

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
        {(nothing.data.rows ?? []).map((r) => r.title).join(' · ')}
      </p>
      <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '6px 0 0' }}>
        Work that serves neither a customer nor the moat may still be right. It should be said out
        loud rather than assumed.
      </p>
    </section>
  )
}
