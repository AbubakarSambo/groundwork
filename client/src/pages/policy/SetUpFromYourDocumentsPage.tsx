import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { policyApi } from '@/api/policy'
import { askNameFor } from '@/lib/ask-name'
import { Page, PageTitle, Section, Note, EdgeList, EdgeRow, Panel, Button } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'

const fail = (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again.')

/**
 * SET UP FROM YOUR DOCUMENTS (Release 9; the Check-in Reports file's "Set up from your documents"), for an admin. Drop in what you
 * already have; Groundwork shows what it will set up, area by area, and where each part came from. Two documents that disagree are
 * decided first. Nothing is set up until an area is approved.
 */
export function SetUpFromYourDocumentsPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['policy', 'setup'], queryFn: policyApi.setup, retry: false })
  const org = (useAuthStore((s) => s.user) as any)?.organization?.name ?? ''
  const eyebrow = org ? `${org}, the organisation’s context, for admins` : 'The organisation’s context, for admins'
  const done = () => { qc.invalidateQueries({ queryKey: ['policy'] }) }
  const decide = useMutation({ mutationFn: (ruleId: string) => policyApi.decide(ruleId), onSuccess: () => { toast.success('Decided.'); done() }, onError: fail })
  const approve = useMutation({ mutationFn: (a: { area: string; heading: string }) => policyApi.approve(a.area), onSuccess: (_d, a) => { toast.success(`${a.heading} is approved.`); done() }, onError: fail })
  if (q.isLoading) return <Page><PageTitle eyebrow={eyebrow} title="Set up from your documents" /><Note>Loading.</Note></Page>
  /* Off for this organisation, or not theirs: the page is not there, and nothing says a switch exists (switches are Groundwork's own, 25 October). */
  if (q.isError || !q.data?.setup) return <NotFoundPage />
  const s = q.data.setup
  return (
    <Page>
      <PageTitle eyebrow={eyebrow} title={s.title} subtitle={s.intro} />
      {s.added && <p className="t-small">{s.added}</p>}
      <AddADocument onAdded={done} />
      {s.decideFirst.length > 0 && (
        <Section heading={s.decideFirst.length === 1 ? 'One thing to decide first' : `${s.decideFirst.length === 2 ? 'Two' : s.decideFirst.length} things to decide first`}>
          <EdgeList label="To decide first">
            {s.decideFirst.map((d) => (
              <EdgeRow key={d.measure} kind="concern" reason="Two documents disagree." title={d.title} detail={d.says}
                actions={<>{d.choices.map((c) => <Button key={c.ruleId} kind="secondary" size="small" onClick={() => decide.mutate(c.ruleId)} disabled={decide.isPending}>{c.label}</Button>)}</>} />
            ))}
          </EdgeList>
        </Section>
      )}
      {(s.cannotBeSetYet ?? []).length > 0 && (
        <Section heading="Not a setting yet">
          <EdgeList label="Not a setting yet">
            {(s.cannotBeSetYet ?? []).map((x) => <EdgeRow key={x} kind="concern" reason={null} title={x} />)}
          </EdgeList>
        </Section>
      )}
      {s.areas.map((a) => (
        <Panel key={a.area}>
          <div className="gw-pt-row">
            <h2 className="t-h2">{a.heading}</h2>
            {a.approved
              ? <span className="t-small">Approved.</span>
              : <Button kind="primary" size="small" onClick={() => approve.mutate({ area: a.area, heading: a.heading })} disabled={!!a.waitsOn || approve.isPending}>Approve</Button>}
          </div>
          <p className="gwui-panel-text">{a.says}</p>
          <p className="t-small">{a.from}</p>
          {a.waitsOn && <p className="t-small t-red">{a.waitsOn}</p>}
        </Panel>
      ))}
      <p className="t-small">{s.noDocuments.replace(/Ask .*\.$/, '')}<Link to="/ask" className="gw-link">{org ? askNameFor(org) : 'Ask'}</Link>.</p>
      <Link to="/policies" className="gw-link t-small gw-start">See the policy board</Link>
    </Page>
  )
}

/** One document at a time: its name and its words, pasted or read from a text file. */
function AddADocument({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const add = useMutation({ mutationFn: () => policyApi.addDocument({ name, text }), onSuccess: () => { toast.success(`${name} is read. Its rules are below, waiting for you to approve them.`); setName(''); setText(''); onAdded() }, onError: fail })
  const fromAFile = (f: File | undefined) => {
    if (!f) return
    if (!name) setName(f.name.replace(/\.[a-z0-9]{1,5}$/i, ''))
    f.text().then(setText).catch(() => toast.error('That file could not be read. Paste its words instead.'))
  }
  return (
    <Section heading="Add a document">
      <Panel>
        <label className="t-small" htmlFor="policy-doc-name">What it is called</label>
        <input id="policy-doc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave policy" />
        <label className="t-small" htmlFor="policy-doc-text">Its words</label>
        <textarea id="policy-doc-text" className="input" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the document here, or choose a text file." />
        <div className="gw-pt-row">
          <label className="gw-link t-small">Choose a text file<input type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(e) => fromAFile(e.target.files?.[0])} /></label>
          <Button kind="primary" onClick={() => add.mutate()} disabled={!name.trim() || !text.trim() || add.isPending}>{add.isPending ? 'Reading it' : 'Read it'}</Button>
        </div>
      </Panel>
    </Section>
  )
}
