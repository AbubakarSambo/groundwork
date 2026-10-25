import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { documentsApi, type GroundDocument } from '@/api/documents'

/**
 * ADD A DOCUMENT: WHAT WAS READ, WHAT IT IS FOR, AND WHO CAN READ IT (U.7, B2).
 *
 * The prototype's screen #/c/sales/upload (docs/prototype/screens/B2-context/upload.txt). The file
 * is really uploaded first, private to the uploader as every upload is, and then read. This step
 * shows what the read found, asks what it is for, and asks who can read it. "Add it to Context"
 * keeps it; "Cancel" removes it again.
 *
 * WHAT IS LEFT OUT, AND WHY.
 *  - The prototype's page count, "What it left out", and the page beside each item need the engine's
 *    read to return them item by item (requests-to-engine.md, request 6). They show when they arrive.
 *    Until then "What it took from the document" lists what the read already says the document
 *    suggests.
 *  - "One thing doesn’t match what you’ve told it", with its three answers, needs the engine to find
 *    the mismatch and somewhere to keep the answer. Not drawn until both exist (request 6).
 *  - Under "Only you" the prototype says "The check-in still uses it for everyone’s questions, but
 *    only you can open it." Today a private document shapes only its uploader's own questions, so
 *    that sentence would be untrue. The product's own sentence for a private document is used
 *    instead, until Hafsah decides (morning-report-ui.md).
 *  - "You can remove it later; what was taken from it goes with it." Only the first half is always
 *    true: numbers already confirmed into targets stay when a document is removed.
 */
export function AddADocument({
  groundId,
  docId,
  fileName,
  contextEnabled,
  startingNote,
  onChooseAnother,
  onClose,
}: {
  groundId: string
  docId: string
  fileName: string
  contextEnabled: boolean
  /** What they said they would show, where the upload was started from a promise. */
  startingNote?: string
  onChooseAnother: () => void
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [note, setNote] = useState(startingNote ?? '')
  const [who, setWho] = useState<'OWN' | 'OPEN'>('OWN')

  /* The same list the Documents band reads, asked again every two seconds until the read lands. */
  const { data: docs = [] } = useQuery({
    queryKey: ['docs', groundId],
    queryFn: () => documentsApi.list(groundId),
    refetchInterval: (q) => {
      const d = (q.state.data as GroundDocument[] | undefined)?.find((x) => x.id === docId)
      return d && !d.holds && !d.assessment && d.stillReading !== false ? 2000 : false
    },
  })
  const doc = (docs as GroundDocument[]).find((d) => d.id === docId)
  const isRead = !!(doc?.holds || doc?.assessment || doc?.read)
  const took = doc?.read?.took?.length
    ? doc.read.took
    : (doc?.assessment?.suggests ?? []).filter(Boolean).map((what) => ({ what, detail: null, page: null }))
  const leftOut = doc?.read?.leftOut ?? []
  const pages = doc?.read?.pages

  const keep = useMutation({
    mutationFn: async () => {
      /* The upload already carried the starting note, so only a change is sent. */
      if (note.trim() !== (startingNote ?? '').trim()) await documentsApi.setNote(groundId, docId, note.trim())
      if (contextEnabled && who === 'OPEN') await documentsApi.setVisibility(groundId, docId, 'OPEN')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docs', groundId] })
      toast.success(`${fileName} is in Context.`)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. The document is still here and still private to you, so try again.'),
  })
  const drop = useMutation({
    mutationFn: () => documentsApi.remove(groundId, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs', groundId] }); onClose() },
    onError: () => toast.error('It was not removed. It is still here and still private to you, so try again.'),
  })
  const another = useMutation({
    mutationFn: () => documentsApi.remove(groundId, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs', groundId] }); onChooseAnother() },
    onError: () => toast.error('It was not removed. It is still here and still private to you, so try again.'),
  })

  return (
    <section aria-label="Add a document" style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--gw-serif, Georgia, serif)', fontSize: 22, fontWeight: 400, color: 'var(--gw-dark)', margin: 0, wordBreak: 'break-word' }}>{fileName}</h2>
        <button
          onClick={() => another.mutate()}
          disabled={another.isPending || keep.isPending}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Choose a different file
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 4 }}>
        {!isRead
          ? 'Reading it now.'
          : `${pages ? `${pages} pages, read just now.` : 'Read just now.'} Here’s what the check-in will use${leftOut.length ? ', and what it won’t' : ''}.`}
      </div>

      <label htmlFor="gw-add-doc-note" style={{ display: 'block', fontSize: 13, color: 'var(--gw-text)', margin: '16px 0 6px' }}>
        <b>What should it be used for?</b> One line is enough; you can skip it.
      </label>
      <input className="gwui-input"
        id="gw-add-doc-note"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: '100%' }}
      />

      {isRead && took.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', margin: '18px 0 6px' }}>What it took from the document</h3>
          <div>
            {took.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 0', borderTop: '1px solid var(--gw-line)', flexWrap: 'wrap' }}>
                <span aria-hidden style={{ color: 'var(--gw-green-t)' }}>{'✓'}</span>
                <span style={{ flex: '1 1 200px', fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>{t.what}</span>
                {t.detail && <span style={{ flex: '1 1 160px', fontSize: 13, color: 'var(--gw-text)' }}>{t.detail}</span>}
                {t.page != null && <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>Page {t.page}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {isRead && leftOut.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', margin: '18px 0 6px' }}>What it left out</h3>
          <div>
            {leftOut.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 0', borderTop: '1px solid var(--gw-line)', flexWrap: 'wrap' }}>
                <span aria-hidden style={{ color: 'var(--gw-muted)' }}>{'○'}</span>
                <span style={{ flex: '1 1 200px', fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>{t.what}</span>
                {t.page != null && <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>Page {t.page}</span>}
                <span style={{ flex: '1 1 160px', fontSize: 13, color: 'var(--gw-sub)' }}>{t.why}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', margin: '18px 0 6px' }}>Who can read it</h3>
      {contextEnabled ? (
        <div role="radiogroup" aria-label="Who can read it" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { v: 'OWN', title: 'Only you', says: 'Only you can open it. It shapes the questions in your own check-in.' },
            { v: 'OPEN', title: 'Everyone in this check-in', says: 'They can open it from Context and resources.' },
          ] as const).map((o) => (
            <label key={o.v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: who === o.v ? '2px solid var(--gw-dark)' : '1px solid var(--gw-border)' }}>
              <input type="radio" name="gw-add-doc-who" checked={who === o.v} onChange={() => setWho(o.v)} style={{ marginTop: 3 }} />
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)' }}>{o.title}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{o.says}</span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>Only you can open it.</div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
        <button className="btn pri"
          onClick={() => keep.mutate()}
          disabled={keep.isPending || drop.isPending}
        >
          {keep.isPending ? 'Saving…' : 'Add it to Context and resources'}
        </button>
        <button
          onClick={() => drop.mutate()}
          disabled={keep.isPending || drop.isPending}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--gw-sub)' }}>You can remove it later.</span>
      </div>
    </section>
  )
}
