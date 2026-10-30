import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opsApi, type OpsPerson } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { Adder, Choose } from './OpsForm'

/**
 * Who is here, and what each of them can actually do.
 *
 * Until this existed, adding somebody to the team meant running SQL, which made
 * the one part of the system that decides who may do anything the one part
 * nobody but its author could operate.
 *
 * Grants are shown in full rather than summarised as a role. A role is what
 * somebody was hired as and a grant is what they can do, and the whole point of
 * keeping them apart is being able to see when they have come apart.
 */

/**
 * What this person has agreed, shown before the form that changes it.
 *
 * A form with no current value is a form somebody fills in twice: you cannot
 * tell whether the field is empty because nothing was agreed or because nobody
 * has looked. Those are different, and one of them is a conversation to have.
 */
function TheirAgreement({ personKey }: { personKey: string }) {
  const agreement = useQuery({
    queryKey: ['ops', 'agreement', personKey],
    queryFn: () => opsApi.agreement(personKey),
    retry: false,
  })

  const a = agreement.data
  return (
    <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '6px 0 0' }}>
      {a?.originatorSharePercent
        ? `Agreed: ${Number(a.originatorSharePercent)}% originator share${
            a.originatorShareMonths ? ` for ${a.originatorShareMonths} months` : ''
          }${a.agreementNote ? ` - ${a.agreementNote}` : ''}`
        : 'No revenue share recorded. Being the originator does not create one.'}
    </p>
  )
}

function Capability({
  person,
  capability,
  held,
}: {
  person: OpsPerson
  capability: string
  held: boolean
}) {
  const queryClient = useQueryClient()
  const change = useMutation({
    mutationFn: () =>
      held ? opsApi.revoke(person.key, capability) : opsApi.grant(person.key, capability),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops'] }),
  })

  const refusal =
    (change.error as { response?: { data?: { message?: string } } })?.response?.data?.message

  return (
    <>
      <button className={`gwui-choice${held ? ' gwui-choice-on' : ''}`}
        type="button"
        onClick={() => change.mutate()}
        disabled={change.isPending || !person.active}
        aria-pressed={held}
        title={held ? `Take ${capability} away from ${person.displayName}` : `Give ${person.displayName} ${capability}`}
        style={{ margin: '0 4px 4px 0' }}
      >
        {capability}
      </button>
      {/*
        The refusal that matters here is the last-holder one, and it has to land
        where the click was. A message at the top of a page listing six people
        does not say which of them it is about.
      */}
      {refusal && (
        <p role="alert" style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '4px 0 6px' }}>
          {refusal}
        </p>
      )}
    </>
  )
}

/**
 * `sales:read` and `sales:write` belong together, and the domain is already in
 * the name — so the grouping needs no second list to be kept in step with the
 * first.
 */
function groupCapabilities(capabilities: string[]): Array<[string, string[]]> {
  const groups = new Map<string, string[]>()
  for (const c of capabilities) {
    const domain = c.split(':')[0]
    groups.set(domain, [...(groups.get(domain) ?? []), c])
  }
  return [...groups.entries()]
}

export default function OpsPeoplePage() {
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })
  const roles = useQuery({ queryKey: ['ops', 'roles'], queryFn: opsApi.roles, retry: false })
  const capabilities = useQuery({
    queryKey: ['ops', 'capabilities'],
    queryFn: opsApi.capabilities,
    retry: false,
  })
  const queryClient = useQueryClient()
  const setActive = useMutation({
    mutationFn: ({ key, active }: { key: string; active: boolean }) => opsApi.setActive(key, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops'] }),
  })

  return (
    <section style={PAGE}>
      <OpsHeader name="The team" answers="Who is here, and what can each of them actually do?" />

      <Adder
        title="Add somebody"
        fields={[
          { name: 'displayName', label: 'Their name', required: true },
          { name: 'key', label: 'A short handle', required: true, placeholder: 'firstname' },
          { name: 'email', label: 'Their email' },
          {
            name: 'functionalRole',
            label: 'What they do',
            required: true,
            /* From the API, which reads them off the grants they key on. This
               was a second copy of the list, which is how a role gets added and
               never appears in the picker. */
            options: (roles.data ?? []).map((r) => ({ value: r.role, label: r.label })),
          },
        ]}
        submit={(v) =>
          opsApi.addPerson({
            key: v.key,
            displayName: v.displayName,
            email: v.email || undefined,
            functionalRole: v.functionalRole,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Add them"
      />

      {(people.data ?? []).map((p) => (
        <section key={p.id} style={{ ...CARD, marginBottom: 12, opacity: p.active ? 1 : 0.65 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15, color: 'var(--gw-navy)' }}>{p.displayName}</strong>
            {/* A ROLE SOMEBODY CAN CHANGE. It was fixed at the moment a person
                was created, so two people swapping jobs meant deleting one of
                them. It adds the new role's capabilities and removes none —
                what they no longer need is revoked below, one at a time, so
                that is a decision rather than a side effect of a dropdown. */}
            <Choose
              label={`What ${p.displayName} does`}
              value={p.functionalRole}
              options={(roles.data ?? []).map((r) => r.role)}
              onPick={(next) => opsApi.changeRole(p.key, next)}
              invalidate={[['ops']]}
            />
            {!p.hasAnAccount && (
              /*
               * Said, because it is the difference between somebody who is set
               * up and somebody who cannot sign in — and nothing else on this
               * page would show it.
               */
              <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>no account yet, cannot sign in</span>
            )}
            {p.holdsNothing && p.active && (
              <span style={{ fontSize: 12, color: 'var(--gw-red-t)' }}>holds nothing at all</span>
            )}
            <button className="btn sec sm"
              type="button"
              onClick={() => setActive.mutate({ key: p.key, active: !p.active })}
              style={{ marginLeft: 'auto' }}
            >
              {p.active ? 'They have left' : 'They are back'}
            </button>
          </div>

          {p.email && (
            <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '3px 0 0' }}>{p.email}</p>
          )}

          {/*
            Grouped by the thing they are about, because thirty pills in one run
            is a wall — you cannot see at a glance that somebody has every read
            and no write, which is the single most useful thing this page can
            tell you.
          */}
          {/*
            The agreement sits with the person rather than with their
            contribution, because it is a contract and not a record of work. The
            two are never shown as one number anywhere.
          */}
          <div style={{ marginTop: 8 }}>
            <TheirAgreement personKey={p.key} />
            <Adder
              title="What they agreed"
              fields={[
                { name: 'originatorSharePercent', label: 'Originator share (%)', type: 'number', placeholder: '40' },
                { name: 'originatorShareMonths', label: 'For how many months', type: 'number', placeholder: '6' },
                { name: 'agreementNote', label: 'Anything worth recording', type: 'textarea' },
              ]}
              submit={(v) =>
                opsApi.setAgreement(p.key, {
                  originatorSharePercent: v.originatorSharePercent ? Number(v.originatorSharePercent) : null,
                  originatorShareMonths: v.originatorShareMonths ? Number(v.originatorShareMonths) : null,
                  agreementNote: v.agreementNote || undefined,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Record it"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            {groupCapabilities(capabilities.data ?? []).map(([domain, caps]) => (
              <div key={domain} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ ...LABEL, fontSize: 9.5, width: 72, flex: 'none', paddingTop: 3 }}>
                  {domain}
                </span>
                <div style={{ flex: 1 }}>
                  {caps.map((c) => (
                    <Capability key={c} person={p} capability={c} held={p.capabilities.includes(c)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {people.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Nobody here yet.</p>
      )}
    </section>
  )
}
