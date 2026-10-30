import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi } from '@/api/board'

/**
 * DROP THE EXPORT IN AND GET THE NUMBERS BACK.
 *
 * A chief of staff with ten salespeople and one committed total asked the check-in for each
 * person's number four times. It restated the question twice, then listed the inputs and called
 * them targets, then gave three names out of ten. She ended up with nothing, and typing ten people
 * into a chat box was never the job anyway.
 *
 * So: paste the CSV your CRM already exports, say the total, and read ten numbers with the reason
 * beside each. Nothing is saved. She is going to argue with these in front of the people they
 * belong to, so she changes them first and then sets each one through the ordinary control, which
 * is also what keeps every target something a person chose rather than a formula assigned.
 *
 * WHAT IT READ IS SHOWN BEFORE WHAT IT CONCLUDED. A wrong column is the likeliest thing to go
 * wrong with a pasted file and the hardest to spot in a number, so the count of people it found
 * and anything it could not find sit above the table.
 */
const boxClass = 'gwui-rule gwui-fs-13 gwui-ink-text gwui-pt-9 gwui-pr-11 gwui-pb-9 gwui-pl-11'
const boxStyle: React.CSSProperties = { width: '100%', borderRadius: 8, fontFamily: 'inherit', background: 'white' }

/** A pasted CSV or a spreadsheet copy. Tabs and commas both, because both are what people paste. */
export function rowsFromPaste(text: string): (string | number | null)[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim().replace(/^"|"$/g, '')))
}

export function SplitOneTotalAcrossPeople({ groundId }: { groundId: string }) {
  const [total, setTotal] = useState('')
  const [paste, setPaste] = useState('')
  const [open, setOpen] = useState(false)

  const propose = useMutation({
    mutationFn: () => boardApi.proposeObjectives(groundId, { total: Number(total), rows: rowsFromPaste(paste) }),
    onError: () => toast.error('That did not come back. What you pasted is still here - try again.'),
  })
  const out = propose.data

  if (!open) {
    /* Board review, 1 October, item 8: this only opens the form below (a fold) - "Nothing is
       saved here" until its own Propose action is pressed - drawn with one-off classes instead
       of the shared `gwui-plain-link` quiet-text-link class. */
    return (
      <button onClick={() => setOpen(true)} className="gwui-plain-link gwui-fs-13 gwui-mb-10">
        Split one total across people
      </button>
    )
  }

  return (
    <div className="gwui-rule gwui-pt-16 gwui-pr-16 gwui-pb-16 gwui-pl-16 gwui-mb-10" style={{ borderRadius: 12, background: 'white' }}>
      <div className="gwui-fs-13-5 gwui-ink-dark gwui-mb-4" style={{ fontWeight: 700 }}>Split one total across people</div>
      <div className="gwui-fs-13 gwui-ink-sub gwui-mb-12" style={{ lineHeight: 1.55, maxWidth: '68ch' }}>
        Paste the export your CRM already gives you. First row the headings, then one row per
        person: their name, what they closed, and how long they have been doing the job. Nothing is
        saved here.
      </div>

      <div className="gwui-gap-9" style={{ display: 'grid' }}>
        <label className="gwui-gap-4 gwui-fs-13 gwui-ink-sub" style={{ display: 'grid' }}>
          The number the whole team has to reach
          <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" placeholder="270" className={boxClass} style={{ ...boxStyle, width: 140 }} />
        </label>
        <label className="gwui-gap-4 gwui-fs-13 gwui-ink-sub" style={{ display: 'grid' }}>
          The export
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            placeholder={'Sales Rep, Units Closed, Months With Us\nMusa, 31, 4 years\nAmina, 14, 11 months'}
            className={boxClass}
            style={{ ...boxStyle, resize: 'vertical' }}
          />
        </label>
        <button className="btn pri"
          onClick={() => propose.mutate()}
          disabled={!total.trim() || !paste.trim() || propose.isPending}
          style={{ justifySelf: 'start' }}
        >
          {propose.isPending ? 'Working it out…' : 'Show me the numbers'}
        </button>
      </div>

      {out && (
        <div className="gwui-rule-top gwui-mt-14 gwui-pt-12">
          {/* What it read, above what it concluded. A wrong column is the likeliest fault and the
              hardest to see in a number. */}
          {out.readFromTheFile && (
            <div className={`gwui-fs-13 gwui-mb-10 ${out.readFromTheFile.missing.length ? 'gwui-ink-amber' : 'gwui-ink-sub'}`} style={{ lineHeight: 1.5 }}>
              Read {out.readFromTheFile.people} {out.readFromTheFile.people === 1 ? 'person' : 'people'}
              {out.readFromTheFile.skipped ? `, skipped ${out.readFromTheFile.skipped} row${out.readFromTheFile.skipped === 1 ? '' : 's'} with nothing in them` : ''}
              {out.readFromTheFile.missing.length ? `. No column for: ${out.readFromTheFile.missing.join(', ')}.` : '.'}
            </div>
          )}

          <div className="gwui-gap-11" style={{ display: 'grid' }}>
            {out.shares.map((s) => (
              <div key={s.key}>
                <div className="gwui-gap-12" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="gwui-fs-14 gwui-ink-dark" style={{ fontWeight: 700 }}>{s.key}</span>
                  {/* Board review, 30 September, item 9: a bare number ("4100") beside a comma-
                      grouped one elsewhere on the board ("6,000") reads as two different systems.
                      Thousands take a comma everywhere - TargetsBand.tsx already does this with
                      `toLocaleString('en-GB')`, so this matches it. */}
                  <span className="gwui-fs-15 gwui-ink-dark" style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{s.target.toLocaleString('en-GB')}</span>
                </div>
                <div className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: 1.5, maxWidth: '68ch' }}>
                  {s.because}
                  {/* Said where it matters: a tenure nobody gave was read as a full year, and that
                      moved this person's number. */}
                  {!s.monthsKnown && <span className="gwui-ink-amber"> Tenure was not in the file, so this reads them as a full year.</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="gwui-fs-13 gwui-ink-text gwui-mt-12" style={{ lineHeight: 1.55, maxWidth: '68ch' }}>{out.saying}</div>
          <div className="gwui-fs-13 gwui-ink-sub gwui-mt-6" style={{ lineHeight: 1.5, maxWidth: '68ch' }}>
            Add the ones you want below, and say whose each is. Nothing here has been saved.
          </div>
        </div>
      )}
    </div>
  )
}
