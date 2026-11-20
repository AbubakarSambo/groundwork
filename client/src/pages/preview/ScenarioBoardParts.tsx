import { Section, Panel, Button, SubHeading, FlexRow, Table, Dot, Stack, Tag, type TagTone } from '@/components/gw/ui'

/**
 * THE SECTIONS THE PROGRAMME BOARD AND THE SALES ORGANISATION BOARD SHARE (prototype: docs/prototype/screens/G1-example-check-ins/
 * programme.txt and salesorg.txt). Both pages are the same board with different words: a headline and where each target stands,
 * what needs the lead, every item and what shows it, the team today, the cards, who checked in, blockers, what keeps coming up,
 * reports, the other boards and where it is heading. Each part takes its words and numbers from the board's fixture.
 * Every part is open: nothing here folds. Classes are `gwui-scb-*` in gw-ui.css (the block for wip/scenario-boards-3).
 */
const tone = (t: string) => t as TagTone

export type Hero = { headline: string; progress: number; lines: string[]; small: string; targetsHeading: string; targets: { name: string; value: string; status: string; tone: string }[] }

/** The headline in the serif, the progress bar under it, and the card "Where each target stands" beside it. */
export function TargetHero({ hero }: { hero: Hero }) {
  return (
    <div className="gwui-scb-hero">
      <div className="gw-min0">
        <h2 className="gwui-scn-lead gwui-scb-headline">{hero.headline}</h2>
        <div className="gwui-scb-progress" role="img" aria-label={`${Math.round(hero.progress)}% of the way`}><span style={{ width: `${hero.progress}%` }} /></div>
        {hero.lines.map((l) => <p key={l} className="t-body">{l}</p>)}
        <p className="t-small">{hero.small}</p>
      </div>
      <Panel className="gwui-scb-targets">
        <h3 className="gwui-table-lead">{hero.targetsHeading}</h3>
        <ul className="gwui-scb-target-list">
          {hero.targets.map((t) => (
            <li key={t.name}>
              <div><span className="gwui-table-lead">{t.name}</span><span className="gwui-panel-text-muted">{t.value}</span></div>
              <Tag tone={tone(t.tone)}>{t.status}</Tag>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

export type Needs = { heading: string; button: string; items: { what: string; detail: string; source: string; block: boolean; edge: string }[] }

/** What needs the lead: every row open, its reason and where it comes from said under it, an Open button at the right. */
export function NeedsRows({ needs }: { needs: Needs }) {
  return (
    <Section heading={needs.heading}>
      <ul className="gwui-scb-needs">
        {needs.items.map((n) => (
          <li key={n.what} className={`gwui-scb-need gwui-scb-edge-${n.edge}`}>
            <div className="gw-min0">
              <h3 className="gwui-table-lead">{n.what}</h3>
              <p className="gwui-scb-need-text">
                {n.detail}{!n.block && <> <span className="gwui-scb-from">{n.source}</span></>}
              </p>
              {n.block && <p className="gwui-scb-from gwui-scb-from-wide">{n.source}</p>}
            </div>
            <Button kind="secondary">{needs.button}</Button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export type Proof = {
  heading: string; note: string; legend: string[]; columns: string[]
  rows: { name: string; sub?: string; subTone?: string; who: string; stage: string; onRecord: boolean; shows: string; next: string; selected?: boolean }[]
  detail: { title: string; rows: string[][]; nextLabel: string; next: string }
  correct: { button: string; foot: string }
}

/** Every item and what shows it: a legend, a real table with a ringed or filled mark by each stage, the chosen one's detail below. */
export function ProofSection({ proof }: { proof: Proof }) {
  const c = proof.columns
  return (
    <Section heading={proof.heading} note={proof.note} foot={proof.correct.foot}>
      <Stack gap={12}>
        <p className="gwui-scb-legend"><span><Dot filled />{proof.legend[0]}</span><span><Dot />{proof.legend[1]}</span></p>
        <Table
          caption={proof.heading}
          phone="stack"
          columns={[{ key: 'name', header: c[0], rowHeader: true, width: '27%' }, { key: 'who', header: c[1], width: '15%' }, { key: 'stage', header: c[2], width: '17%' }, { key: 'shows', header: c[3], width: '21%' }, { key: 'next', header: c[4] }]}
          rows={proof.rows.map((r) => ({
            name: <>{r.selected && <span className="gwui-scb-selected" aria-hidden />}<span className="gwui-table-lead gwui-table-inline">{r.name}</span>{r.sub && <span className={`gwui-table-sub gwui-scb-sub-${r.subTone}`}>{r.sub}</span>}</>,
            who: r.who,
            stage: <><Dot filled={r.onRecord} />{r.stage}</>,
            shows: r.shows,
            next: <span className="gwui-scb-next">{r.next}</span>,
          }))}
        />
        <Panel>
          <div className="gwui-scb-detail">
            <div>
              <h3 className="gwui-scb-detail-title">{proof.detail.title}</h3>
              <dl className="gwui-scb-facts">
                {proof.detail.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </div>
            <div className="gwui-scb-detail-side">
              <p className="gwui-scb-next-box"><strong>{proof.detail.nextLabel}</strong> {proof.detail.next}</p>
              <button type="button" className="gwui-scb-linkbtn gwui-scb-linkbtn-bold">{proof.correct.button}</button>
            </div>
          </div>
        </Panel>
      </Stack>
    </Section>
  )
}

/** Ten small marks for the last ten check-ins: filled when the person checked in, open when a session was missed. */
export function Pips({ pattern, label }: { pattern: string; label: string }) {
  const done = [...pattern].filter((p) => p === '1').length
  return (
    <span className="gwui-scb-pips" role="img" aria-label={`${label}: ${done} of ${pattern.length}`}>
      {[...pattern].map((p, i) => <span key={i} className={p === '1' ? 'gwui-scb-pip gwui-scb-pip-on' : 'gwui-scb-pip'} />)}
    </span>
  )
}

export type Team = { heading: string; note: string; foot: string; rows: { name: string; line: string; status: string; tone: string; pips: string; said: string }[] }

/** The team today: each person's line, a status tag, their last ten check-ins, and what keeps coming up. */
export function TeamToday({ team }: { team: Team }) {
  return (
    <Section heading={team.heading} note={team.note} foot={team.foot}>
      <Table
        caption={team.heading}
        phone="stack"
        hideHeader
        columns={[{ key: 'name', header: 'Person', rowHeader: true, width: '15%' }, { key: 'line', header: 'This week', width: '27%' }, { key: 'status', header: 'Status', width: '19%' }, { key: 'pips', header: 'Last 10 check-ins', width: '14%' }, { key: 'said', header: 'What keeps coming up' }]}
        rows={team.rows.map((r) => ({ name: r.name, line: r.line, status: { tag: r.status, tone: tone(r.tone) }, pips: <Pips pattern={r.pips} label="Last 10 check-ins" />, said: r.said }))}
      />
    </Section>
  )
}

export type Cards = { heading: string; cards: { title: string; stats: string[][]; line: string; who: string }[] }

/** One small card per county or team: three figures with their labels, one line and the names. */
export function StatCards({ cards }: { cards: Cards }) {
  return (
    <Section heading={cards.heading}>
      <ul className="gwui-scb-cards">
        {cards.cards.map((c) => (
          <li key={c.title} className="panel gwui-scb-card">
            <h3 className="gwui-table-lead">{c.title}</h3>
            <p className="gwui-scb-stats">{c.stats.map(([v, l]) => <span key={l}><strong>{v}</strong><small>{l}</small></span>)}</p>
            <p className="gwui-panel-text-muted">{c.line}</p>
            <p className="gwui-scb-who">{c.who}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export type Checked = { heading: string; note: string; foot: string; rows: { name: string; sessions: string }[] }

/** Who checked in: one row per person, one small square per session, a gap where a session was missed. */
export function CheckedIn({ checked }: { checked: Checked }) {
  return (
    <Section heading={checked.heading} note={checked.note} foot={checked.foot || undefined}>
      <div className="gwui-scb-compact">
        <Table
          caption={checked.heading}
          hideHeader
          minWidth={0}
          columns={[{ key: 'name', header: 'Person', rowHeader: true, width: '150px' }, { key: 'sessions', header: 'Last 10 sessions' }]}
          rows={checked.rows.map((r) => ({
            name: r.name,
            sessions: (
              <span className="gwui-scb-squares" role="img" aria-label={`${r.name}, last 10 sessions: ${[...r.sessions].filter((p) => p === '1').length} of ${r.sessions.length}`}>
                {[...r.sessions].map((p, i) => <span key={i} className={p === '1' ? 'gwui-scb-sq gwui-scb-sq-on' : 'gwui-scb-sq'} />)}
              </span>
            ),
          }))}
        />
      </div>
    </Section>
  )
}

export type Blockers = { heading: string; note: string; items: { title: string; tag: string; tone: string; waiting: string; raised: string; affects: string; promised: string | null; proof: string; clear: string; then: string }[] }

/** Blockers: each with who it waits on, its history, what it affects, what the proof shows and the one thing that would clear it. */
export function BlockerCards({ blockers }: { blockers: Blockers }) {
  return (
    <Section heading={blockers.heading} note={blockers.note}>
      <Stack gap={12}>
        {blockers.items.map((b) => (
          <Panel key={b.title}>
            <FlexRow justify="space-between" align="center" gap={12}>
              <h3 className="gwui-table-lead">{b.title}</h3>
              <Tag tone={tone(b.tone)}>{b.tag}</Tag>
            </FlexRow>
            <div className="gwui-scb-meta">
              <p><span>Waiting on:</span> {b.waiting}</p>
              <p><span>Raised:</span> {b.raised}</p>
              <p><span>Affects:</span> {b.affects}</p>
              {b.promised && <p className="gwui-scb-meta-wide"><span>Promised:</span> {b.promised}</p>}
              <p className="gwui-scb-meta-wide"><span>What the proof shows:</span> {b.proof}</p>
            </div>
            <p className="gwui-scb-next-box gwui-scb-clear"><strong>Would clear it:</strong> {b.clear} Then: {b.then}</p>
          </Panel>
        ))}
      </Stack>
    </Section>
  )
}

export type Keeps = {
  heading: string; note: string; foot: string
  left: { heading: string; rows: { name: string; line: string }[] }
  right: { heading: string; items: { title: string; text: string; who: string }[] }
}

/** What keeps coming up: each person's pattern in a table, and the ways what people say can run ahead of what happened. */
export function KeepsComingUp({ keeps }: { keeps: Keeps }) {
  return (
    <Section heading={keeps.heading} note={keeps.note} foot={keeps.foot}>
      <div className="gwui-two-up gwui-two-up-top">
        <Panel>
          <h3 className="gwui-subheading gwui-subheading-kicker">{keeps.left.heading}</h3>
          <div className="gwui-scb-flush"><Table onPanel={false} caption={keeps.left.heading} hideHeader phone="stack" columns={[{ key: 'name', header: 'Person', rowHeader: true, width: '27%' }, { key: 'line', header: 'What keeps coming up' }]} rows={keeps.left.rows} /></div>
        </Panel>
        <Panel>
          <h3 className="gwui-subheading gwui-subheading-kicker">{keeps.right.heading}</h3>
          <ul className="gwui-scb-ahead">
            {keeps.right.items.map((i) => (
              <li key={i.title}>
                <h4 className="gwui-table-lead">{i.title}</h4>
                <p className="gwui-panel-text-muted">{i.text} <em>{i.who}</em></p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Section>
  )
}

export type Reports = { overTime?: string; heading: string; note: string; rows: { name: string; text: string; link: string }[] }

/** Reports: each one's name, what it holds, and its Open link, in a table. */
export function ReportsTable({ reports }: { reports: Reports }) {
  const table = (
    <Section heading={reports.heading} note={reports.note}>
      <Table
        caption={reports.heading}
        phone="stack"
        hideHeader
        columns={[{ key: 'name', header: 'Report', rowHeader: true, width: '24%' }, { key: 'text', header: 'What it holds' }, { key: 'link', header: 'Open', width: '90px' }]}
        rows={reports.rows.map((r) => ({ name: r.name, text: r.text, link: <button type="button" className="gwui-scb-linkbtn">{r.link}</button> }))}
      />
    </Section>
  )
  return reports.overTime ? <Stack gap={18}><h2 className="gwui-tb-plain-h">{reports.overTime}</h2>{table}</Stack> : table
}

export type OtherBoards = { everySession?: string; heading: string; items: { name: string; tag: string; tone: string }[] }

/** The other boards the lead is in: a card each, its name and where it stands. */
export function OtherBoardCards({ boards }: { boards: OtherBoards }) {
  const cards = (
    <Section heading={boards.heading}>
      <ul className="gwui-scb-boards">
        {boards.items.map((b) => (
          <li key={b.name} className="panel gwui-scb-board">
            <h3 className="gwui-table-lead">{b.name}</h3>
            <div><Tag tone={tone(b.tone)}>{b.tag}</Tag></div>
          </li>
        ))}
      </ul>
    </Section>
  )
  return boards.everySession ? <Stack gap={12}><p className="t-small mut">{boards.everySession}</p>{cards}</Stack> : cards
}

export type Heading = {
  heading: string; note: string; outcomesLabel: string; outcomes: string[]; signalsLabel: string
  signals: { line: string; from: string; onRecord: boolean }[]
  settleLabel: string; settle: string; decider: string; deciderNote: string; button: string
}

/** Where this is heading: the possible outcomes, the signals behind them, what would settle it, and who decides. */
export function WhereHeading({ h }: { h: Heading }) {
  return (
    <Section heading={h.heading} note={h.note}>
      <div className="gwui-two-up gwui-two-up-top">
        <div>
          <SubHeading as="h3" tone="kicker">{h.outcomesLabel}</SubHeading>
          <ul className="gwui-scn-outcomes" aria-label={h.outcomesLabel}>
            {h.outcomes.map((o) => <li key={o} className="panel gwui-scn-outcome">{o}</li>)}
          </ul>
        </div>
        <div>
          <SubHeading as="h3" tone="kicker">{h.signalsLabel}</SubHeading>
          <Stack gap={12}>
            <Table
              onPanel={false}
              caption={h.signalsLabel}
              hideHeader
              phone="stack"
              columns={[{ key: 'signal', header: 'Signal', rowHeader: true }]}
              rows={h.signals.map((s) => ({ signal: <><Dot filled={s.onRecord} /><span className="gwui-table-lead gwui-table-inline">{s.line}</span><span className="gwui-table-sub gwui-table-indent">{s.from}</span></> }))}
            />
            <Panel>
              <h3 className="gwui-table-lead">{h.settleLabel}</h3>
              <p className="gwui-panel-text">{h.settle}</p>
            </Panel>
            <Panel className="gwui-panel-dark">
              <h3 className="gwui-table-lead gwui-table-on-dark">{h.decider}</h3>
              <p className="gwui-table-on-dark-sub">{h.deciderNote}</p>
              <Button kind="secondary">{h.button}</Button>
            </Panel>
          </Stack>
        </div>
      </div>
    </Section>
  )
}
