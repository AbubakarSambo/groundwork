import React from 'react'
import { Section, Panel, Button, SubHeading, Table, Dot, Stack, Tag, type TagTone } from '@/components/gw/ui'
import { ScenarioBoardFrame } from './ScenarioBoardFrame'

/**
 * THE TEAM BOARDS (prototype: docs/prototype/screens/G1-example-check-ins/eng, founder, ops and support, .txt and .jpg).
 * These four example boards share one page: the question and headline with the targets beside it, what needs you, every item
 * and what shows it, the team today, the shape of the work, blockers, what keeps coming up, reports, the other boards, and
 * where this is heading. Each board file supplies only its own words (a fixture) and the one section that differs
 * (`shape`). Every section is open; nothing folds.
 */
type Tone = TagTone
export type TeamBoardData = {
  title: string; subtitle: string; leadName: string; updated: string
  question: string; headline: string; bar: number; under: string; reported: string
  targets: { heading: string; rows: { name: string; value: string; status: string; tone: Tone }[] }
  needs: { heading: string; open: string; rows: { what: string; sub: string; edge: 'blue' | 'amber' | 'dark'; strip?: string; chip?: string }[] }
  items: {
    heading: string; note: string; legend: [string, string]; columns: [string, string, string, string, string]
    rows: { name: string; flag?: string; flagTone?: 'red' | 'amber'; owner: string; stage: string; on: boolean; shows: string; next: string }[]
    detail: { title: string; pairs: [string, string][]; next: string; button: string; foot: string }
  }
  team?: { heading: string; note: string; rows: { name: string; line: string; tag: string; tone: Tone; sessions: string; comingUp?: string }[]; foot: string }
  shape: Shape
  groups?: { heading: string; cards: { title: string; stats: { n: string; l: string }[]; text: string; names: string }[] }
  who?: { heading: string; note: string; rows: { name: string; sessions: string }[] }
  blockers: { heading: string; note: string; rows: { title: string; tag: string; tone: Tone; waiting: string; raised: string; affects: string; promised?: string; proof: string; clear: string }[] }
  keeps: {
    heading: string; note: string; personHeading: string; people: { name: string; text: string }[]; peoplePlain?: string
    sayHeading: string; say: { title: string; text: string; who: string }[]; foot: string
  }
  overTime: string
  reports: { heading: string; note: string; open: string; rows: { name: string; text: string }[] }
  askedOf?: { heading: string; title: string; text: string; button: string }
  everySession: string
  others: { heading: string; rows: { name: string; tag: string; tone: Tone | 'sand' }[] }
  heading: {
    heading: string; note: string; outcomesLabel: string; outcomes: string[]; signalsLabel: string
    signals: { line: string; from?: string; text?: string; onRecord: boolean }[]
    settleLabel: string; settle: string; decider: string; deciderNote: string; button: string
  }
  askBox: { placeholder: string; button: string }
}
export type Shape =
  | { kind: 'bars'; heading: string; note: string; rows: { label: string; fill: number; count: string }[]; key: string; foot: string }
  | { kind: 'heat'; heading: string; note: string; columns: string[]; rows: { site: string; counts: number[] }[]; foot: string }
  | { kind: 'weeks'; heading: string; note: string; weekHeading: string; weekColumns: string[]; weeks: string[][]; assumeHeading: string; assumptions: { title: string; sub: string; tag: string; tone: Tone }[]; foot: string }
  | { kind: 'volume'; heading: string; note: string; numbers: { n: string; l: string; src: string; on: boolean }[]; causesHeading: string; causes: { name: string; n: number; note: string }[]; foot: string }

function Squares({ s, large }: { s: string; large?: boolean }) {
  return (
    <span className={large ? 'gwui-tb-squares gwui-tb-squares-lg' : 'gwui-tb-squares'} aria-hidden>
      {s.split('').map((c, i) => <span key={i} className={c === '1' ? 'gwui-tb-sq' : 'gwui-tb-sq gwui-tb-sq-off'} />)}
    </span>
  )
}

/** The tags the prototype draws for a decision or a pattern: plain sand pills. */
function Chip({ children }: { children: React.ReactNode }) { return <span className="gwui-tb-chip">{children}</span> }

export default function TeamBoard({ data: d }: { data: TeamBoardData }) {
  const maxCause = d.shape.kind === 'volume' ? Math.max(...d.shape.causes.map((c) => c.n)) : 1
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} leadName={d.leadName}>
      <Stack gap={30}>
        <div className="gwui-tb-head">
          <div>
            <p className="gwui-tb-question">{d.question}</p>
            <p className="gwui-tb-headline">{d.headline}</p>
            <div className="gwui-tb-bar" role="img" aria-label={`${d.bar}%`}><span className="gwui-tb-bar-fill" style={{ width: `${d.bar}%` }} /></div>
            <p className="gwui-tb-under">{d.under}</p>
            <p className="gwui-tb-reported">{d.reported}</p>
          </div>
          <Panel>
            <h3 className="t-h3" style={{ marginBottom: 6 }}>{d.targets.heading}</h3>
            <ul className="gwui-tb-targets">
              {d.targets.rows.map((t) => (
                <li key={t.name} className="gwui-tb-target">
                  <span><span className="gwui-tb-target-name">{t.name}</span><span className="gwui-tb-target-value">{t.value}</span></span>
                  <Tag tone={t.tone}>{t.status}</Tag>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Section heading={d.needs.heading}>
          <div>
            {d.needs.rows.map((n) => (
              <div key={n.what} className={`gwui-tb-need gwui-tb-need-${n.edge}`}>
                <div className="gwui-tb-need-main">
                  <h3 className="gwui-tb-need-what">{n.what}</h3>
                  <p className="gwui-tb-need-sub">{n.sub}{n.chip && <Chip>{n.chip}</Chip>}</p>
                  {n.strip && <span className="gwui-tb-strip">{n.strip}</span>}
                </div>
                <Button kind="secondary">{d.needs.open}</Button>
              </div>
            ))}
          </div>
        </Section>

        <Section heading={d.items.heading} note={d.items.note}>
          <div className="gwui-tb-legend"><span><Dot filled />{d.items.legend[0]}</span><span><Dot />{d.items.legend[1]}</span></div>
          <Stack gap={12}>
            <div className="gwui-tb-items">
              <Table
                caption={d.items.heading}
                phone="stack"
                columns={[
                  { key: 'name', header: d.items.columns[0], rowHeader: true, width: '28%' },
                  { key: 'owner', header: d.items.columns[1], width: '15%' },
                  { key: 'stage', header: d.items.columns[2], width: '17%' },
                  { key: 'shows', header: d.items.columns[3], width: '17%' },
                  { key: 'next', header: d.items.columns[4] },
                ]}
                rows={d.items.rows.map((r) => ({
                  name: <>{r.name}{r.flag && <span className={r.flagTone === 'amber' ? 'gwui-tb-flag gwui-tb-flag-amber' : 'gwui-tb-flag'}>{r.flag}</span>}</>,
                  owner: r.owner,
                  stage: <span className="gwui-tb-stage"><Dot filled={r.on} />{r.stage}</span>,
                  shows: r.shows,
                  next: <span className="gwui-tb-next">{r.next}</span>,
                }))}
              />
            </div>
            <Panel>
              <div className="gwui-tb-detail">
                <div>
                  <h3 className="gwui-tb-detail-title">{d.items.detail.title}</h3>
                  <dl className="gwui-tb-pairs">
                    {d.items.detail.pairs.map(([k, v]) => <div key={k} className="gwui-tb-pair"><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                </div>
                <div className="gwui-tb-detail-side">
                  <p className="gwui-tb-nextband"><strong>Next:</strong> {d.items.detail.next}</p>
                  <Button kind="quiet">{d.items.detail.button}</Button>
                </div>
              </div>
            </Panel>
            <p className="t-small mut">{d.items.detail.foot}</p>
          </Stack>
        </Section>

        {d.team && (
          <Section heading={d.team.heading} note={d.team.note}>
            <Stack gap={10}>
              <Table
                caption={d.team.heading}
                phone="stack"
                hideHeader
                columns={[
                  { key: 'name', header: 'Person', rowHeader: true, width: '12%' },
                  { key: 'line', header: 'Their line', width: '27%' },
                  { key: 'tag', header: 'Where they are', width: '22%' },
                  { key: 'sessions', header: 'Their last 10 check-ins', width: '16%' },
                  { key: 'up', header: 'What keeps coming up' },
                ]}
                rows={d.team.rows.map((r) => ({ name: r.name, line: r.line, tag: { tag: r.tag, tone: r.tone }, sessions: <Squares s={r.sessions} />, up: r.comingUp ?? '' }))}
              />
              <p className="t-small mut">{d.team.foot}</p>
            </Stack>
          </Section>
        )}

        <ShapeSection shape={d.shape} maxCause={maxCause} />

        {d.groups && (
          <Section heading={d.groups.heading}>
            <div className="gwui-tb-cards">
              {d.groups.cards.map((c) => (
                <Panel key={c.title}>
                  <h3 className="gwui-tb-card-title">{c.title}</h3>
                  <p className="gwui-tb-stats">{c.stats.map((s) => <span key={s.l} className="gwui-tb-stat"><span className="gwui-tb-stat-n">{s.n}</span><span className="gwui-tb-stat-l">{s.l}</span></span>)}</p>
                  <p className="gwui-tb-card-text">{c.text}</p>
                  <p className="gwui-tb-card-names">{c.names}</p>
                </Panel>
              ))}
            </div>
          </Section>
        )}

        {d.who && (
          <Section heading={d.who.heading} note={d.who.note}>
            <Panel>
              <dl className="gwui-tb-who">
                {d.who.rows.map((r) => <React.Fragment key={r.name}><dt>{r.name}</dt><dd><Squares s={r.sessions} large /></dd></React.Fragment>)}
              </dl>
            </Panel>
          </Section>
        )}

        <Section heading={d.blockers.heading} note={d.blockers.note}>
          <Stack gap={12}>
            {d.blockers.rows.map((b) => (
              <Panel key={b.title}>
                <div className="gwui-tb-blocker-head"><h3 className="gwui-tb-card-title" style={{ margin: 0 }}>{b.title}</h3><Tag tone={b.tone}>{b.tag}</Tag></div>
                <div className="gwui-tb-facts">
                  <span><span className="gwui-tb-fact-k">Waiting on:</span> {b.waiting}</span>
                  <span><span className="gwui-tb-fact-k">Raised:</span> {b.raised}</span>
                  <span><span className="gwui-tb-fact-k">Affects:</span> {b.affects}</span>
                  {b.promised && <span className="gwui-tb-facts-one"><span className="gwui-tb-fact-k">Promised:</span> {b.promised}</span>}
                  <span className="gwui-tb-facts-one"><span className="gwui-tb-fact-k">What the proof shows:</span> {b.proof}</span>
                </div>
                <p className="gwui-tb-clear"><strong>Would clear it:</strong> {b.clear}</p>
              </Panel>
            ))}
          </Stack>
        </Section>

        <Section heading={d.keeps.heading} note={d.keeps.note}>
          <Stack gap={10}>
            <div className="gwui-two-up gwui-two-up-top">
              <Panel>
                <SubHeading as="h3" tone="kicker">{d.keeps.personHeading}</SubHeading>
                {d.keeps.people.length > 0
                  ? <Table onPanel={false} caption={d.keeps.personHeading} hideHeader phone="stack" columns={[{ key: 'n', header: 'Person', rowHeader: true, width: '25%' }, { key: 't', header: 'What keeps coming up' }]} rows={d.keeps.people.map((p) => ({ n: p.name, t: p.text }))} />
                  : <p className="gwui-panel-text-muted">{d.keeps.peoplePlain}</p>}
              </Panel>
              <Panel>
                <SubHeading as="h3" tone="kicker">{d.keeps.sayHeading}</SubHeading>
                <ul className="gwui-tb-lines">
                  {d.keeps.say.map((s) => <li key={s.title}><h4 className="gwui-table-lead">{s.title}</h4><p>{s.text} <em>{s.who}</em></p></li>)}
                </ul>
              </Panel>
            </div>
            <p className="t-small mut">{d.keeps.foot}</p>
          </Stack>
        </Section>

        <Stack gap={18}>
          <h2 className="gwui-tb-plain-h">{d.overTime}</h2>
          <Section heading={d.reports.heading} note={d.reports.note}>
            <Table
              caption={d.reports.heading}
              phone="stack"
              hideHeader
              columns={[{ key: 'n', header: 'Report', rowHeader: true, width: '24%' }, { key: 't', header: 'What it holds' }, { key: 'o', header: 'Open', width: '12%' }]}
              rows={d.reports.rows.map((r) => ({ n: r.name, t: r.text, o: <a className="gwui-tb-link" href="#open">{d.reports.open}</a> }))}
            />
          </Section>
        </Stack>

        {d.askedOf && (
          <Section heading={d.askedOf.heading}>
            <Panel>
              <div className="gwui-tb-ask">
                <div className="gw-min0"><h3 className="gwui-table-lead">{d.askedOf.title}</h3><p className="gwui-panel-text-muted">{d.askedOf.text}</p></div>
                <Button kind="secondary">{d.askedOf.button}</Button>
              </div>
            </Panel>
          </Section>
        )}

        <Stack gap={12}>
          <p className="t-small mut">{d.everySession}</p>
          <Section heading={d.others.heading}>
            <ul className="gwui-tb-boards">
              {d.others.rows.map((o) => (
                <li key={o.name} className="panel">
                  <h3 className="gwui-table-lead">{o.name}</h3>
                  {o.tone === 'sand' ? <Chip>{o.tag}</Chip> : <Tag tone={o.tone}>{o.tag}</Tag>}
                </li>
              ))}
            </ul>
          </Section>
        </Stack>

        <Section heading={d.heading.heading} note={d.heading.note}>
          <div className="gwui-two-up gwui-two-up-top">
            <div>
              <SubHeading as="h3" tone="kicker">{d.heading.outcomesLabel}</SubHeading>
              <ul className="gwui-scn-outcomes" aria-label={d.heading.outcomesLabel}>
                {d.heading.outcomes.map((o) => <li key={o} className="panel gwui-scn-outcome">{o}</li>)}
              </ul>
            </div>
            <div>
              <SubHeading as="h3" tone="kicker">{d.heading.signalsLabel}</SubHeading>
              <Stack gap={12}>
                <Table
                  onPanel={false}
                  caption={d.heading.signalsLabel}
                  hideHeader
                  phone="stack"
                  columns={[{ key: 'signal', header: 'Signal', rowHeader: true }]}
                  rows={d.heading.signals.map((s) => ({
                    signal: <><Dot filled={s.onRecord} /><span className="gwui-table-lead gwui-table-inline">{s.line}</span>{s.from && <span className="gwui-table-sub gwui-table-indent">{s.from}</span>}{s.text && <span className="gwui-table-sub gwui-table-indent">{s.text}</span>}</>,
                  }))}
                />
                <Panel>
                  <h3 className="gwui-table-lead">{d.heading.settleLabel}</h3>
                  <p className="gwui-panel-text">{d.heading.settle}</p>
                </Panel>
                <Panel className="gwui-panel-dark">
                  <h3 className="gwui-table-lead gwui-table-on-dark">{d.heading.decider}</h3>
                  <p className="gwui-table-on-dark-sub">{d.heading.deciderNote}</p>
                  <Button kind="secondary">{d.heading.button}</Button>
                </Panel>
              </Stack>
            </div>
          </div>
        </Section>

        <Panel>
          <div className="gwui-tb-ask">
            <span className="gwui-panel-text-muted">{d.askBox.placeholder}</span>
            <Button kind="primary">{d.askBox.button}</Button>
          </div>
        </Panel>
      </Stack>
    </ScenarioBoardFrame>
  )
}

function ShapeSection({ shape: s, maxCause }: { shape: Shape; maxCause: number }) {
  if (s.kind === 'bars') {
    return (
      <Section heading={s.heading} note={s.note}>
        <Stack gap={12}>
          <Panel>
            <ul className="gwui-tb-bars" aria-label={s.heading}>
              {s.rows.map((r) => (
                <li key={r.label} className="gwui-tb-bars-row">
                  <span>{r.label}</span>
                  <span className="gwui-tb-bars-track">{r.fill > 0 && <span className="gwui-tb-bars-fill" style={{ width: `${r.fill}%` }} />}</span>
                  <span>{r.count}</span>
                </li>
              ))}
            </ul>
            <p className="t-small mut" style={{ marginTop: 14 }}>{s.key}</p>
          </Panel>
          <p className="t-small mut">{s.foot}</p>
        </Stack>
      </Section>
    )
  }
  if (s.kind === 'heat') {
    return (
      <Section heading={s.heading} note={s.note}>
        <Stack gap={12}>
          <Table
            caption={s.heading}
            phone="scroll"
            minWidth={520}
            columns={[{ key: 'site', header: 'Site', rowHeader: true, width: '14%' }, ...s.columns.map((c, i) => ({ key: `c${i}`, header: c }))]}
            rows={s.rows.map((r) => ({
              site: r.site,
              ...Object.fromEntries(r.counts.map((n, i) => [`c${i}`, <span key={i} className={`gwui-tb-heat gwui-tb-heat-${Math.min(n, 3)}`}>{n > 0 ? n : <span className="gwui-sr-only">0</span>}</span>])),
            }))}
          />
          <p className="t-small mut">{s.foot}</p>
        </Stack>
      </Section>
    )
  }
  if (s.kind === 'weeks') {
    return (
      <Section heading={s.heading} note={s.note}>
        <Stack gap={12}>
          <div className="gwui-two-up gwui-two-up-top">
            <Table
              caption={s.weekHeading}
              phone="scroll"
              minWidth={320}
              columns={s.weekColumns.map((c, i) => ({ key: `k${i}`, header: c, rowHeader: i === 0 }))}
              rows={s.weeks.map((w) => Object.fromEntries(w.map((v, i) => [`k${i}`, i === 2 ? <span className="gwui-tb-week-done">{v}</span> : i === 3 ? <span className="gwui-tb-week-carried">{v}</span> : i === 4 ? <span className="gwui-tb-week-dropped">{v}</span> : v])))}
            />
            <Panel>
              <SubHeading as="h3" tone="kicker">{s.assumeHeading}</SubHeading>
              {s.assumptions.map((a) => (
                <div key={a.title} className="gwui-tb-assume">
                  <h4 className="gwui-table-lead">{a.title}</h4>
                  <span className="gwui-tb-assume-sub">{a.sub}</span>
                  {a.tone === 'plain' ? <Chip>{a.tag}</Chip> : <Tag tone={a.tone}>{a.tag}</Tag>}
                </div>
              ))}
            </Panel>
          </div>
          <p className="t-small mut">{s.foot}</p>
        </Stack>
      </Section>
    )
  }
  return (
    <Section heading={s.heading} note={s.note}>
      <Stack gap={12}>
        <div className="gwui-two-up gwui-two-up-top">
          <Panel>
            <ul className="gwui-tb-volume">
              {s.numbers.map((n) => (
                <li key={n.l}>
                  <span className="gwui-tb-volume-n">{n.n}</span>
                  <span className="gwui-tb-volume-l">{n.l}</span>
                  <span className="gwui-tb-volume-src"><Dot filled={n.on} />{n.src}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <SubHeading as="h3" tone="kicker">{s.causesHeading}</SubHeading>
            {s.causes.map((c) => (
              <div key={c.name} className="gwui-tb-cause">
                <div className="gwui-tb-cause-row"><span>{c.name}</span><strong>{c.n}</strong></div>
                <span className="gwui-tb-cause-track"><span className="gwui-tb-cause-fill" style={{ width: `${(c.n / maxCause) * 100}%` }} /></span>
                <span className="gwui-tb-assume-sub">{c.note}</span>
              </div>
            ))}
          </Panel>
        </div>
        <p className="t-small mut">{s.foot}</p>
      </Stack>
    </Section>
  )
}
