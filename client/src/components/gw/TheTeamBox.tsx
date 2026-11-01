import { useEffect, useRef, useState } from 'react'
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
 * Each place says what adding means there. People and setup adds them to the check-in through `onAdd`, and gives back the lines it
 * could not add (somebody with no email who is not in the organisation yet), which stay in the box with one sentence saying what they
 * need. The setup's save card has no button of its own (Hafsah's blocker of 31 October 2026, "nothing anyone says in setup is ever
 * lost"): the lines in the box ARE the team, and the press that saves the check-in takes them, so the page holds the box's words
 * (`text`, `onText`) and says what a line still needs (`said`).
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

/** The box's words with anybody named since added on a line of their own, never over what was typed. Matched by the name before the first comma. */
export function withTheNamedAdded(now: string, prefilled: string[]): string {
  const have = new Set(now.split('\n').map((l) => l.split(',')[0].trim().toLowerCase()).filter(Boolean))
  const more = prefilled.filter((l) => !have.has(l.split(',')[0].trim().toLowerCase()))
  return [now.trim(), ...more].filter(Boolean).join('\n')
}

/** How many people the box holds now: one per line with something on it. */
export function linesInTheBox(text: string): number {
  return text.split('\n').filter((l) => l.trim()).length
}

/** The sentence for the lines a save cannot take yet: "Add an email for Brian Kiprop, or take them off the list." */
export function addAnEmailFor(people: APersonOnALine[]): string {
  const names = people.map((p) => p.name ?? p.phone ?? '').filter(Boolean)
  return names.length ? `Add an email for ${andList(names)}, or take them off the list.` : 'Add an email on every line, or take that line off the list.'
}

export function TheTeamBox({ prefilled, onAdd, adding, heading, text: textGiven, onText, said, disabled }: {
  /** One line per person already named, with what is known of them. */
  prefilled: string[]
  /** Adds everyone it can; gives back the people it could not add because they need an email. Without it the box has no button. */
  onAdd?: (people: APersonOnALine[]) => Promise<APersonOnALine[]> | APersonOnALine[]
  adding?: boolean
  heading?: string
  /** The box's words, when the page holds them (the setup's save card). */
  text?: string
  onText?: (text: string) => void
  /** What a line still needs, said by the page that holds the words. */
  said?: string
  /** While the check-in is being saved, nothing more can be typed into a list that is already on its way. */
  disabled?: boolean
}) {
  const [textHeld, setTextHeld] = useState(prefilled.join('\n'))
  const text = textGiven ?? textHeld
  const textRef = useRef(text)
  textRef.current = text
  const setText = (t: string) => { textRef.current = t; if (onText) onText(t); else setTextHeld(t) }
  const [needEmail, setNeedEmail] = useState<string[]>([])
  const [reading, setReading] = useState(false)
  const whatsappOn = useWhatsAppIsOn()
  /* Somebody named later (a new name in the setup, a colleague invited meanwhile) is added to the box, never over what was typed. */
  const prefilledKey = prefilled.join('\n')
  useEffect(() => {
    const next = withTheNamedAdded(textRef.current, prefilled)
    if (next !== textRef.current) setText(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledKey])

  async function addEveryone() {
    if (!onAdd || !text.trim()) return
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
        disabled={disabled || busy}
        rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
      />
      {needEmail.length > 0 && (
        <Note tone="muted">{`Add an email for ${andList(needEmail)}, then press Add everyone again.`}</Note>
      )}
      {said && <Note tone="muted">{said}</Note>}
      {onAdd && (
        <div>
          <Button kind="secondary" onClick={addEveryone} disabled={busy || !text.trim()}>{busy ? 'Adding…' : 'Add everyone'}</Button>
        </div>
      )}
    </div>
  )
}
