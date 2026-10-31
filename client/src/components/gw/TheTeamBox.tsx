import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { entryApi } from '@/api/entry'
import { Button, TextArea, Note } from '@/components/gw/ui'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'

/**
 * ADDING A TEAM, ONE WAY, EVERYWHERE (Hafsah, 31 October 2026: "Make adding a team the top pattern for the next round ... make it
 * quick and easy for an impatient lead. Judge it by how fast a lead can get their whole team in, with phone numbers, without repeating
 * themselves.").
 *
 * A founder in round 3 named his four people with their numbers in the setup conversation, then typed them three more times: on
 * People, on the save card ("Add them" four times, an email each, then a "What do they do" step each), and on the check-in's People and
 * setup ("Add people", one at a time). The team is one list, so it is added in one box: one person per line, "name, email, phone
 * number", read by the server's one reader (POST /entry/people-on-lines, the same reader the organisation's invite box uses), and
 * everyone goes on in one press. The box comes filled with the people already named, with the numbers already given, so the lead
 * types only what is missing. Their role is added after, on People and setup; nobody is asked "What do they do" here.
 *
 * Each place says what adding means there through `onAdd`: the save card puts them on the list it saves, People and setup adds them
 * to the check-in. `onAdd` gives back the lines it could not add (somebody with no email who is not in the organisation yet), and
 * those stay in the box with one sentence saying what they need.
 */
export interface APersonOnALine { name: string | null; email: string | null; phone: string | null }

export function readTheLines(pasted: string): Promise<APersonOnALine[]> {
  return entryApi.peopleOnLines(pasted)
}

/** One line for a person: "Sarah Chebet, sarah@x.com, +254 712 345 678", with whatever is known. */
export function aLineFor(p: { name?: string | null; email?: string | null; phone?: string | null }): string {
  return [p.name, p.email, p.phone].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ')
}

/** The names, in a sentence. */
function andList(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function TheTeamBox({ prefilled, onAdd, adding, heading }: {
  /** One line per person already named, with what is known of them. */
  prefilled: string[]
  /** Adds everyone it can; gives back the people it could not add because they need an email. */
  onAdd: (people: APersonOnALine[]) => Promise<APersonOnALine[]> | APersonOnALine[]
  adding?: boolean
  heading?: string
}) {
  const [text, setText] = useState(prefilled.join('\n'))
  const [needEmail, setNeedEmail] = useState<string[]>([])
  const [reading, setReading] = useState(false)
  const whatsappOn = useWhatsAppIsOn()
  /* Somebody named later (a new name in the setup, a colleague invited meanwhile) is added to the box, never over what was typed. */
  const prefilledKey = prefilled.join('\n')
  useEffect(() => {
    setText((now) => {
      const have = new Set(now.split('\n').map((l) => l.split(',')[0].trim().toLowerCase()).filter(Boolean))
      const more = prefilled.filter((l) => !have.has(l.split(',')[0].trim().toLowerCase()))
      return [now.trim(), ...more].filter(Boolean).join('\n')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledKey])

  async function addEveryone() {
    if (!text.trim()) return
    setReading(true)
    try {
      const people = await readTheLines(text)
      const left = await onAdd(people)
      setText(left.map(aLineFor).join('\n'))
      setNeedEmail(left.map((p) => p.name ?? p.phone ?? '').filter(Boolean))
    } catch {
      toast.error('That did not go through, and nobody was added. Try again.')
    } finally {
      setReading(false)
    }
  }

  const busy = reading || !!adding
  return (
    <div className="gwui-team-box">
      {heading && <p className="gwui-switch-row-title">{heading}</p>}
      <label htmlFor="the-team-box" className="gwui-note">
        One per line: a name, an email and a phone number. Or paste a list from a spreadsheet.
        {/* WhatsApp is named only while it is on (Hafsah's rule of 26 September). */}
        {whatsappOn ? ' With a phone number, their check-ins can also reach them on WhatsApp.' : ''}
      </label>
      <TextArea
        id="the-team-box"
        aria-label="Your team, one per line"
        placeholder={'Sarah Chebet, sarah@company.com, +254 712 345 678\nDavid Kariuki, david@company.com, +254 722 111 222'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
      />
      {needEmail.length > 0 && (
        <Note tone="muted">{`Add an email for ${andList(needEmail)}, then press Add everyone again.`}</Note>
      )}
      <div>
        <Button kind="secondary" onClick={addEveryone} disabled={busy || !text.trim()}>{busy ? 'Adding…' : 'Add everyone'}</Button>
      </div>
    </div>
  )
}
