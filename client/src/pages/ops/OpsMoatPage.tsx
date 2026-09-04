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
export default function OpsMoatPage() {
  const moat = useQuery({ queryKey: ['ops', 'moat'], queryFn: opsApi.moat, retry: false })
  const d = moat.data

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="The moat" answers="What is the defensible advantage, and what have we built on it?" />

      {d && (
        <>
          <section style={{ ...CARD, marginBottom: 14 }}>
            <p style={{ fontSize: 15, margin: 0, color: 'var(--gw-navy)', fontWeight: 600, maxWidth: '62ch' }}>
              {d.building}
            </p>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '10px 0 0', maxWidth: '62ch' }}>
              {d.loop}
            </p>
            {/* Kept next to the loop rather than in a footnote: the loop is what
                would justify collecting anything, and this decides how. */}
            <p style={{ fontSize: 13.5, margin: '10px 0 0', fontWeight: 600, color: 'var(--gw-navy)' }}>
              {d.privacy}
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
                <span style={{ fontSize: 12.5, color: c.built === 0 ? 'var(--gw-red-t)' : 'var(--gw-sub)' }}>
                  {c.built === 0 ? 'nothing yet' : `${c.built} built`}
                </span>
              </div>

              <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: '8px 0 0', maxWidth: '68ch' }}>
                {c.statement}
              </p>

              {c.entries.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                  {c.entries.map((e) => (
                    <li
                      key={e.id}
                      style={{ borderTop: '0.5px solid var(--gw-border)', padding: '8px 0 0', marginTop: 8 }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13.5 }}>{e.title}</strong>
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

          <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', maxWidth: '62ch', marginTop: 20 }}>
            <strong style={{ color: 'var(--gw-navy)' }}>What an acquirer is buying: </strong>
            {d.acquirer}
          </p>
        </>
      )}
    </main>
  )
}
