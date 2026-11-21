import { useState } from 'react'
import { Link } from 'react-router-dom'
import { directionApi } from '@/api/direction'
import { policyApi } from '@/api/policy'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  companyApi, type CompanyPage as Page, type CompanyPriority, type CompanyLevel, type DeskDocument, type DirectoryEntry, type NotYourDesk,
} from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import { useTheDesignPass } from '@/lib/the-design-pass'
import { ChooseAFile } from '@/components/gw/ChooseAFile'
import {
  Page as PageFrame, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row, SubHeading, Skeleton, FieldLabel, TextField, TextArea,
} from '@/components/gw/ui'
import { TheGoalsYouCanChange } from './TheGoalsYouCanChange'

/**
 * THE DESK (S7, 20 November 2026), at #/company: the Company page renamed, with #/company/context folded into it (that
 * route now comes here). Hafsah: "Rebuild it as the Desk, as designed: the organisation's shared context (policies,
 * handbook, procedures, documents, the directory), clear and simple."
 *
 * TOP TO BOTTOM:
 *   1. The organisation's policies, handbook, procedures and documents, each with the summary the server kept when it was
 *      added, opening to the full text. An admin or a lead can add one here, as a file or pasted text.
 *   2. Who works here: the directory everyone in the organisation reads (name, job title, team, who they report to, and
 *      their phone number where they have one).
 *   3. The strategy sections that were here before, for the same readers (the server decides), drawn once: the
 *      priorities, where the strategy isn't reaching the work, what more than one team named, what you say next to what
 *      the check-ins show, and what was kept from check-ins.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /company). The page adds nothing to what it is given and hides nothing
 * it was given. Somebody who does not work here is served one plain sentence, and reads only that. No privacy notes, no
 * colon labels: every line is a plain sentence.
 */
export function CompanyPage() {
  const user = useAuthStore(s => s.user)
  const showAsk = useAskStore(s => s.show)
  /* The design pass: Ask is the prototype's secondary button, so the page has no navy button above its own content. */
  const designPass = useTheDesignPass()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['company'],
    queryFn: companyApi.get,
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  })
  const outsider = data && 'outsider' in data ? (data as NotYourDesk) : null
  const page = data && !outsider ? (data as Page) : null
  const name = data?.name || user?.organizationName || 'your organisation'
  const directionOn = useQuery({ queryKey: ['direction'], queryFn: directionApi.read, retry: false, staleTime: 60_000, enabled: !!page }).data?.on === true
  const policyOn = useQuery({ queryKey: ['policy'], queryFn: policyApi.board, retry: false, staleTime: 60_000, enabled: !!page }).data?.on === true

  return (
    <PageFrame>
      <PageTitle eyebrow="Desk" title={data?.name || user?.organizationName || 'Desk'} />

      {isLoading && <Skeleton what="Getting the Desk" shape="cards" />}
      {isError && (
        <div>
          <Note tone="error">The Desk did not load.</Note>
          <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
        </div>
      )}

      {outsider && <Note>{outsider.outsider}</Note>}

      {page && (
        <>
          <p className="gwui-panel-text">This is where {name} keeps its policies, handbook, procedures and documents, and a list of everyone who works here.</p>
          <div className="gwui-sentence-row">
            <Button kind={designPass ? 'secondary' : 'primary'} onClick={showAsk}>Ask about the whole organisation</Button>
            {/* Release 6 and release 9: each only where it is switched on (the server says). */}
            {directionOn && <Link className="gwui-plain-link" to="/direction">The company’s direction, and what it means for each team</Link>}
            {policyOn && <Link className="gwui-plain-link" to="/policies">The policy board, with every rule the organisation runs on</Link>}
          </div>
          {page.line && <Note>{page.line}</Note>}

          <TheDocuments name={name} documents={page.desk?.documents ?? []} mayAdd={page.desk?.mayAdd === true} />
          <TheDirectory people={page.desk?.directory ?? []} />
          <TheStrategy p={page} />
          <TheGoalsYouCanChange />
        </>
      )}
    </PageFrame>
  )
}

/* ---------- 1. Policies, handbook, procedures and documents ---------- */

function TheDocuments({ name, documents, mayAdd }: { name: string; documents: DeskDocument[]; mayAdd: boolean }) {
  return (
    <Section heading="Policies, handbook and documents">
      {mayAdd && <AddADocument />}
      {documents.length === 0 ? (
        <Empty>Nothing has been added to the Desk yet.</Empty>
      ) : (
        <RowList label={`${name} documents`}>
          {documents.map(d => <ADocument key={d.key} d={d} />)}
        </RowList>
      )}
    </Section>
  )
}

function ADocument({ d }: { d: DeskDocument }) {
  const [open, setOpen] = useState(false)
  const full = useQuery({ queryKey: ['desk-document', d.key], queryFn: () => companyApi.document(d.key), enabled: open, retry: false, staleTime: 60_000 })
  return (
    <Row columns="minmax(0, 1fr)">
      <div>
        <h3 className="t-h3">{d.title}</h3>
        <p className="gwui-panel-text">{d.summary ?? 'There is no summary of this document yet. Open it to read it in full.'}</p>
        {d.added && <p className="gwui-panel-text-muted">{d.added}</p>}
        <Button kind="quiet" size="small" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'Close it' : 'Read it in full'}
        </Button>
        {open && full.isLoading && <Skeleton what={`Getting ${d.title}`} shape="lines" />}
        {open && full.isError && <Note tone="error">{d.title} did not open. Try again in a moment.</Note>}
        {open && full.data && <div className="gwui-panel-text gwui-pre-line" aria-label={`${d.title} in full`}>{full.data.text}</div>}
      </div>
    </Row>
  )
}

function AddADocument() {
  const qc = useQueryClient()
  const designPass = useTheDesignPass()
  /* The design pass: the form is folded behind one button until somebody wants it, so the documents themselves come first. */
  const [adding, setAdding] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const add = useMutation({
    mutationFn: () => companyApi.addDocument({ file, title, text: file ? '' : text }),
    onSuccess: () => {
      setFile(null); setTitle(''); setText(''); setInputKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['company'] })
    },
  })
  const said = (add.error as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message
  const ready = !!file || (!!title.trim() && !!text.trim())
  if (designPass) {
    if (!adding && !add.isSuccess) return <div className="dp-add"><Button kind="secondary" onClick={() => setAdding(true)}>Add a document</Button></div>
    return (
      <Panel as="section" aria-label="Add a document">
        <div className="dp-form">
          <SubHeading as="h3">Add a document</SubHeading>
          <p className="gwui-panel-text">Choose a file, or give it a title and paste the text. It is read, a short summary is written, and both are kept on the Desk.</p>
          <div className="dp-field">
            <FieldLabel htmlFor="desk-file">A file (PDF, Word or text)</FieldLabel>
            <ChooseAFile id="desk-file" inputKey={inputKey} accept=".pdf,.doc,.docx,.txt,.md,.rtf,application/pdf,text/plain" file={file} onChoose={setFile} />
          </div>
          <div className="dp-field">
            <FieldLabel htmlFor="desk-title">Its title</FieldLabel>
            <TextField id="desk-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={file ? 'The file’s own name is used if you leave this empty' : 'For example, Leave policy'} />
          </div>
          {!file && (
            <div className="dp-field">
              <FieldLabel htmlFor="desk-text">Or paste the text</FieldLabel>
              <TextArea id="desk-text" value={text} onChange={e => setText(e.target.value)} rows={6} />
            </div>
          )}
          <div className="gwui-sentence-row">
            <Button kind="primary" onClick={() => add.mutate()} disabled={!ready || add.isPending}>
              {add.isPending ? 'Reading it' : 'Add it to the Desk'}
            </Button>
            <Button kind="quiet" onClick={() => { setAdding(false); add.reset() }}>Cancel</Button>
          </div>
          {add.isError && <Note tone="error">{Array.isArray(said) ? said.join(' ') : said || 'That document was not added. Try again in a moment.'}</Note>}
          {add.isSuccess && <Note tone="green" role="status">{add.data.title} is on the Desk now.</Note>}
        </div>
      </Panel>
    )
  }
  return (
    <Panel as="section" aria-label="Add a document">
      <SubHeading as="h3">Add a document</SubHeading>
      <p className="gwui-panel-text">Choose a file, or give it a title and paste the text. It is read, a short summary is written, and both are kept on the Desk.</p>
      <FieldLabel htmlFor="desk-file">A file (PDF, Word or text)</FieldLabel>
      <input key={inputKey} id="desk-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf,application/pdf,text/plain" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <FieldLabel htmlFor="desk-title">Its title</FieldLabel>
      <TextField id="desk-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={file ? 'The file’s own name is used if you leave this empty' : 'For example, Leave policy'} />
      {!file && (
        <>
          <FieldLabel htmlFor="desk-text">Or paste the text</FieldLabel>
          <TextArea id="desk-text" value={text} onChange={e => setText(e.target.value)} rows={6} />
        </>
      )}
      <div className="gwui-sentence-row">
        <Button kind="secondary" onClick={() => add.mutate()} disabled={!ready || add.isPending}>
          {add.isPending ? 'Reading it' : 'Add it to the Desk'}
        </Button>
      </div>
      {add.isError && <Note tone="error">{Array.isArray(said) ? said.join(' ') : said || 'That document was not added. Try again in a moment.'}</Note>}
      {add.isSuccess && <Note tone="green" role="status">{add.data.title} is on the Desk now.</Note>}
    </Panel>
  )
}

/* ---------- 2. Who works here ---------- */

/** One person's line in plain sentences: "Sales lead in Sales. Reports to Grace Wanjiru. Their phone number is +254 700 000 001." */
export function aDirectoryLine(p: DirectoryEntry): string {
  const where = p.jobTitle && p.team ? `${p.jobTitle} in ${p.team}.` : p.jobTitle ? `${p.jobTitle}.` : p.team ? `Works in ${p.team}.` : ''
  const to = p.reportsTo ? `Reports to ${p.reportsTo}.` : ''
  const phone = p.phone ? `Their phone number is ${p.phone}.` : ''
  return [where, to, phone].filter(Boolean).join(' ')
}

function TheDirectory({ people }: { people: DirectoryEntry[] }) {
  return (
    <Section heading="Who works here">
      {people.length === 0 ? (
        <Empty>Nobody is listed here yet.</Empty>
      ) : (
        <RowList label="Who works here">
          {people.map(p => (
            <Row key={p.id} columns="minmax(0, 1fr) minmax(0, 2fr)">
              <b>{p.name}</b>
              <span className="gwui-panel-text">{aDirectoryLine(p)}</span>
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  )
}

/* ---------- 3. The strategy, for the readers who were given it before ---------- */

function TheStrategy({ p }: { p: Page }) {
  return (
    <>
      <Section heading="Is the strategy moving?">
        {!p.priorities?.length ? (
          <Empty>No priorities yet.</Empty>
        ) : (
          <div className="gwui-cards-3">
            {p.priorities.map(pr => <Priority key={pr.id} pr={pr} />)}
          </div>
        )}
      </Section>

      {!!p.notReaching?.length && (
        <Section heading="Where the strategy isn’t reaching the work" note="Questions for the person who can answer each one">
          <RowList label="Where the strategy isn’t reaching the work">
            {p.notReaching.map(o => (
              <Row key={o.id} columns="minmax(0, 1fr) auto">
                <span><b>{o.observation}</b><br />{o.question}</span>
                <span className="gwui-panel-text-muted">{o.forWhom}</span>
              </Row>
            ))}
          </RowList>
        </Section>
      )}

      {!!p.namedByTeams?.length && (
        <Section heading="Named by more than one team" note="Nobody on a single team would see this">
          {p.namedByTeams.map(n => (
            <Panel as="section" key={n.id} aria-label={n.title}>
              <h3 className="t-h3">{n.title}</h3>
              {n.touches && <p className="gwui-panel-text-muted">{n.touches}</p>}
              <div className="gwui-cards-3">
                {n.teams.map(t => (
                  <div key={t.team} className="gwui-team-col">
                    <b>{t.team}</b>
                    <p>{t.says}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </Section>
      )}

      {!!p.saidAndShown?.length && (
        <Section heading="What you say, and where the time goes">
          <table className="gwui-compare-table">
            <thead><tr><th scope="col"><span className="gwui-sr-only">Priority</span></th><th scope="col">You said</th><th scope="col">The check-ins show</th></tr></thead>
            <tbody>
              {p.saidAndShown.map(s => (
                <tr key={s.id}><th scope="row">{s.area}</th><td>“{s.youSaid}”</td><td>{s.checkInsShow}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* What a lead confirmed is true of the whole company, already kept on their yes in the conversation. Served only
          to the readers the server allows; absent, not empty, for everyone else. */}
      {!!p.whatWeKeep?.items?.length && (
        <Section heading="Kept from check-ins">
          <RowList label="Kept from check-ins">
            {p.whatWeKeep.items.map(k => (
              <Row key={k.id} columns="minmax(0, 1fr)">
                <div>
                  <p className="gwui-panel-text">{/[.!?]$/.test((k.says ?? '').trim()) ? (k.says ?? '').trim() : `${(k.says ?? '').trim()}.`}</p>
                  <p className="gwui-panel-text-muted">{k.source}</p>
                </div>
              </Row>
            ))}
          </RowList>
        </Section>
      )}
    </>
  )
}

/** What success looks like, in the server's own words for the measure and the target. Served to admins only (decision 86, item 3). */
export function whatSuccessLooksLike(measure?: string | null, target?: string | null): string {
  /* A measure that begins "Qualified enterprise deals" reads after "measured by" in lower case; an acronym stays. */
  const inSentence = (x?: string | null) => { const v = x?.trim() ?? ''; return /^[A-Z][a-z]/.test(v) ? `${v[0].toLowerCase()}${v.slice(1)}` : v }
  const m = inSentence(measure)
  const t = target?.trim()
  if (m && t) return `It is measured by ${m}, and the target is ${t}.`
  if (m) return `It is measured by ${m}.`
  if (t) return `The target is ${t}.`
  return ''
}

function Priority({ pr }: { pr: CompanyPriority }) {
  const tag = pr.reading?.tag ?? pr.tag
  const success = whatSuccessLooksLike(pr.measure, pr.target)
  const levels = pr.levels ?? []
  /* The priority alone, with nothing under it and nothing that changed, says nothing more than its card. */
  const showLevels = levels.length > 1 || levels.some(l => l.changedHere)
  return (
    <Panel as="section" aria-label={`Priority ${pr.number}`}>
      <div className="gwui-priority-top">
        <span className="gwui-note">Priority {pr.number}</span>
        {tag && <Tag tone="attention">{tag}</Tag>}
      </div>
      <h3 className="t-h3">{pr.title}</h3>
      {/* Who owns it, as a sentence (it was "Owner: Wairimu Kamau" on company context). "Nobody owns it yet" is its tag. */}
      {pr.owner && <p className="gwui-panel-text">{pr.owner} is responsible for this.</p>}
      {pr.reading?.says && <p className="gwui-panel-text">{pr.reading.says}</p>}
      {pr.staleSays && <p className="gwui-panel-text-muted">{pr.staleSays}</p>}
      {pr.fedBy && <p className="gwui-panel-text-muted">{pr.fedBy}</p>}
      {success && <p className="gwui-panel-text">{success}</p>}
      {showLevels && (
        <>
          <SubHeading as="h3" tone="kicker">What each level understood</SubHeading>
          <RowList label={`What each level understood, priority ${pr.number}`}>
            {levels.map(l => <ALevel key={l.id} l={l} />)}
          </RowList>
        </>
      )}
    </Panel>
  )
}

function ALevel({ l }: { l: CompanyLevel }) {
  return (
    <Row columns="auto minmax(0, 1fr)">
      <span className="gwui-panel-text-muted">{l.level}</span>
      <div>
        <b>{l.title}</b>
        {l.changedHere && <p className="gwui-panel-text">{l.changedHere}</p>}
        {l.fedBy && <p className="gwui-panel-text-muted">{l.fedBy}</p>}
      </div>
    </Row>
  )
}
