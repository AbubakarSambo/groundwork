import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { Adder } from './OpsForm'
import { readDate } from './OpsTable'

/**
 * The moat, and what has actually been built on it.
 *
 * The statements sit above the entries rather than behind a link, because a
 * list of things somebody shipped, with no definition over it, becomes a list
 * of things somebody shipped. The definition is what says whether something
 * counted — and every clause of these names an asset that can be deliberately
 * built, which is the whole reason they were written that way.
 */
/**
 * Every dependency anybody declared against a piece of work, and who owns it.
 *
 * Hidden when there are none — an empty section here would read as "we depend
 * on nothing", which is a claim, and this list only ever knows what somebody
 * wrote down. The lockfile is the witness that does not have to be trusted, and
 * reading it is separate work.
 */
function WhatWeDependOn() {
  const declared = useQuery({
    queryKey: ['ops', 'what-we-depend-on'],
    queryFn: opsApi.whatWeDependOn,
    retry: false,
  })
  const rows = declared.data ?? []
  if (rows.length === 0) return null

  return (
    <section style={{ ...CARD, marginTop: 20 }}>
      <p style={LABEL}>What we have taken on a dependency for</p>
      <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '4px 0 10px', maxWidth: '62ch', lineHeight: '19px' }}>
        Declared against the work that added it. Only what somebody wrote down - the lockfile is the
        witness that does not have to be trusted.
      </p>
      {rows.map((r) => (
        <div key={r.id} style={{ borderTop: '1px solid var(--gw-border)', padding: '9px 0 0', marginTop: 9 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{r.dependsOn}</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>
            {/* Whose it is, which is the whole question. */}
            Owned by {r.dependsOnOwnedBy ?? 'nobody said'} · {r.justification}
          </div>
        </div>
      ))}
    </section>
  )
}

export default function OpsMoatPage() {
  const moat = useQuery({ queryKey: ['ops', 'moat'], queryFn: opsApi.moat, retry: false })
  const d = moat.data

  return (
    <section style={PAGE}>
      <OpsHeader
        name={d?.title ?? 'The Groundwork Moat'}
        answers="What is the defensible advantage, and what have we built on it?"
      />

      {d && (
        <>
          <section style={{ ...CARD, marginBottom: 14 }}>
            <p style={{ fontSize: 15, margin: 0, color: 'var(--gw-navy)', fontWeight: 700, maxWidth: '62ch' }}>
              {d.building}
            </p>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '10px 0 0', maxWidth: '62ch' }}>
              {d.loop}
            </p>
            {/*
              Privacy in three parts, all three shown. The framing says what
              privacy IS here; the line is the rule; the paragraph is what the
              rule consists of - and the paragraph is the only place consent,
              retention and de-identification are named as things to build.
              Showing the line alone makes it a slogan.
            */}
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '14px 0 0', maxWidth: '62ch' }}>
              {d.privacyFraming}
            </p>
            <p style={{ fontSize: 15, margin: '6px 0 0', fontWeight: 700, color: 'var(--gw-navy)' }}>
              {d.privacy}
            </p>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '8px 0 0', maxWidth: '62ch' }}>
              {d.privacyArchitecture}
            </p>
          </section>

          {d.untouched.length > 0 && (
            /*
             * The useful signal on this page. Four of five moving and one
             * untouched for a quarter is the shape of a strategy quietly
             * narrowing, and only naming it shows that.
             */
            <p style={{ fontSize: 13, color: 'var(--gw-red-t)', marginBottom: 14 }}>
              Nothing has been built on {d.untouched.join(', ')}.
            </p>
          )}

          <Adder
            title="Record something built on the moat"
            fields={[
              {
                name: 'componentKey',
                label: 'Which part of it',
                required: true,
                options: d.components.map((c) => ({ value: c.key, label: `${c.ordinal}. ${c.name}` })),
              },
              { name: 'title', label: 'What was built', required: true },
              { name: 'description', label: 'What it does for the moat', type: 'textarea' },
              { name: 'evidenceUrl', label: 'Where somebody can see it', placeholder: 'a pull request, a screen' },
            ]}
            submit={(v) =>
              opsApi.recordMoat({
                componentKey: v.componentKey,
                title: v.title,
                description: v.description || undefined,
                evidenceUrl: v.evidenceUrl || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Record it"
          />

          {d.components.map((c) => (
            <section key={c.key} style={{ ...CARD, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ ...LABEL, fontSize: 10 }}>{c.ordinal}</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: 0, flex: 1 }}>
                  {c.name}
                </h2>
                <span style={{ fontSize: 12, color: c.built === 0 ? 'var(--gw-red-t)' : 'var(--gw-sub)' }}>
                  {c.built === 0 ? 'nothing yet' : `${c.built} built`}
                </span>
              </div>

              <p style={{ fontSize: 14, color: 'var(--gw-sub)', margin: '8px 0 0', maxWidth: '68ch' }}>
                {c.statement}
              </p>

              {c.entries.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                  {c.entries.map((e) => (
                    <li
                      key={e.id}
                      style={{ borderTop: '1px solid var(--gw-border)', padding: '8px 0 0', marginTop: 8 }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14 }}>{e.title}</strong>
                        {e.evidenceUrl && (
                          <a
                            href={e.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: 'var(--gw-navy)' }}
                          >
                            see it
                          </a>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--gw-sub)', marginLeft: 'auto' }}>
                          {readDate(e.builtAt)}
                          {e.by ? ` · ${e.by}` : ''}
                        </span>
                      </div>
                      {e.description && (
                        <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '3px 0 0', maxWidth: '66ch' }}>
                          {e.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/*
            WHAT WE DEPEND ON, ON THE MOAT PAGE, BECAUSE THAT IS WHAT IT COSTS.
            The second threat is a dependency that weakens the moat — most of
            all one belonging to the person who added it. Nothing in the
            database can detect that, so it is declared against the work; this
            is where the declarations are read, beside the thing they cost.
          */}
          <WhatWeDependOn />

          <p style={{ fontSize: 14, color: 'var(--gw-sub)', maxWidth: '62ch', marginTop: 20 }}>
            <strong style={{ color: 'var(--gw-navy)' }}>What an acquirer is buying: </strong>
            {d.acquirer}
          </p>
        </>
      )}
    </section>
  )
}
