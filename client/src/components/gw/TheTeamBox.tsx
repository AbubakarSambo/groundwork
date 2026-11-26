import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { entryApi } from '@/api/entry'
import { Button, TextArea, Note } from '@/components/gw/ui'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { roleAndTeam, type APerson } from '@/components/gw/PeoplePicker'

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
  return entryApi.peopleOnLines(pasted).then((people) => withTheNameOnTheirLine(people, pasted))
}

/**
 * THE NAME ON THEIR OWN LINE, WHERE THE TEAM READER KEPT NONE (staging check S10, 4 November 2026). The one team reader keeps a name
 * beside an address only when it is two words or more, so "oops, b@x.com" is never somebody called Oops. The setup page writes a line for
 * each person the conversation named, and Stella named her reps "Rita" and "Remy": their lines came back with no name, so the first
 * press of "Send 2 invitations" read them as left out and saved nothing, and the invitations went without their names. Here the name
 * is the first part of the line the address is on, exactly as the line says it.
 */
export function withTheNameOnTheirLine<T extends { name: string | null; email: string | null }>(people: T[], lines: string): T[] {
  const each = lines.split('\n')
  return people.map((p) => {
    if (p.name || !p.email) return p
    const line = each.find((l) => l.toLowerCase().includes(p.email!.toLowerCase()))
    const first = line?.split(',')[0]?.trim() ?? ''
    return first && !first.includes('@') ? { ...p, name: first } : p
  })
}

/** One line for a person: "Sarah Chebet, sarah@x.com, +254 712 345 678", with whatever is known. */
export function aLineFor(p: { name?: string | null; email?: string | null; phone?: string | null }): string {
  return [p.name, p.email, p.phone].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ')
}

/** The names, in a sentence. */
function andList(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The box's words with what the conversation has said about each person, never over what was typed. Matched by the name before the
 * first comma: somebody new gets a line of their own, and a line the conversation now says more about (an email or a number given
 * later in the chat) is written out in full. A line that holds anything the conversation's line does not is the lead's, and stays.
 * Plan round 32: the law firm lead named three people, then gave their emails in the chat, and the panel went on saying "Add their
 * emails here when you have them", because a name already on a line was never written again.
 */
export function withTheNamedAdded(now: string, prefilled: string[]): string {
  /*
   * WHO A LINE IS ABOUT IS THE NAME ON IT, WHETHER IT WAS TYPED "Ruth, ruth@x.com" OR "Ruth Njeri ruth@x.com +254 700 000 000", AND "Ruth" IS "Ruth Njeri"
   * (fix plan 16 November, group 3). It was the text before the first comma, so a line typed with spaces was never found, and the conversation's bare
   * "Ruth" was added under it as somebody else, and again for each name; a full name typed in the box was not the "Ruth" the conversation named.
   */
  const words = (l: string) => l.split(',')[0].split(/\s+/).filter((w) => w && !w.includes('@') && !/^\+?[\d()-]{6,}$/.test(w)).map((w) => w.toLowerCase())
  const sameName = (a: string[], b: string[]) => !!a.length && !!b.length && (a.length <= b.length ? a : b).every((w, i) => w === (a.length <= b.length ? b : a)[i])
  /* Word by word, not part by part: the conversation's "Catherine" is in "Catherine Mwangi, catherine@x.com, +254 711 000 001" (an evaluation lead,
     23 November 2026: she gave the three emails in the chat and nobody was invited, because "catherine" was compared with "catherine mwangi"). */
  const tokensOf = (l: string) => l.split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
  const lines = now.split('\n').map((l) => l.trim()).filter(Boolean)
  const kept = lines.map((l) => {
    const fuller = prefilled.find((p) => sameName(words(p), words(l)))
    return fuller && tokensOf(l).every((x) => tokensOf(fuller).includes(x)) ? fuller : l
  })
  const have = lines.map(words)
  return [...kept, ...prefilled.filter((p) => !have.some((h) => sameName(h, words(p))))].join('\n')
}

/**
 * THE LINE THE LEAD IS TYPING ON, AND WHO IN THE ORGANISATION IT COULD BE (release test 22 November, bug 36: Wairimu typed "Ol" and
 * nobody was suggested). Two letters or more of a name, with no email, comma or number on the line yet, finds the colleagues whose
 * name, or any word of it, starts with what was typed. A line that is already somebody's whole name is that person, so it suggests
 * nothing more.
 */
export function theLineBeingTyped(text: string, caret: number): { start: number; end: number; typed: string } {
  const start = text.lastIndexOf('\n', Math.max(0, caret - 1)) + 1
  const nl = text.indexOf('\n', caret)
  const end = nl === -1 ? text.length : nl
  return { start, end, typed: text.slice(start, end) }
}

export function whoItCouldBe(typed: string, people: APerson[], most = 8): APerson[] {
  const q = typed.trim().toLowerCase().replace(/\s+/g, ' ')
  if (q.length < 2 || /[@,\d]/.test(q)) return []
  const fits = people.filter((p) => {
    const name = p.name.trim().toLowerCase().replace(/\s+/g, ' ')
    if (name === q) return false
    return name.startsWith(q) || name.split(' ').some((w) => w.startsWith(q))
  })
  /* The one typed exactly is already chosen, so nobody else is offered for it. */
  if (people.some((p) => p.name.trim().toLowerCase().replace(/\s+/g, ' ') === q)) return []
  return fits.slice(0, most)
}

/** How many people the box holds now: one per line with something on it. */
export function linesInTheBox(text: string): number {
  return text.split('\n').filter((l) => l.trim()).length
}

/**
 * WHO IS NOT ON THE CHECK-IN, SAID ONCE, BY THE ONE OWNER (hotfix, live pilot: the admin typed two names with no emails and was told
 * "This was not saved"). A person cannot be on a check-in without a way to reach them, because inviting sends a message, so the save
 * goes ahead without them and says so in this sentence. Nobody is stopped from saving.
 */
export function notOnTheCheckInYet(names: string[]): string {
  const who = names.map((n) => n.trim()).filter(Boolean)
  if (!who.length) return ''
  return `${andList(who)} ${who.length === 1 ? 'is' : 'are'} not on the check-in yet, because there is no email for them. Add them under People when you have their emails.`
}

export function TheTeamBox({ prefilled, onAdd, adding, heading, text: textGiven, onText, said, disabled, colleagues, onPick }: {
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
  /** People in the organisation who could be added, suggested as their name is typed. */
  colleagues?: APerson[]
  /** Adds the colleague picked from the suggestions. */
  onPick?: (person: APerson) => Promise<void> | void
}) {
  const [textHeld, setTextHeld] = useState(prefilled.join('\n'))
  const text = textGiven ?? textHeld
  const textRef = useRef(text)
  textRef.current = text
  const setText = (t: string) => { textRef.current = t; if (onText) onText(t); else setTextHeld(t) }
  const [needEmail, setNeedEmail] = useState<string[]>([])
  /*
   * EVERY LINE TYPED IS READABLE (round 7, the law firm lead at 390px: "the list of people I just put in is still cut off"). The box was
   * as many rows as there were lines, and on a narrow screen each line of a name, an email and a number wraps onto two or three, so
   * most of what she typed sat behind a scroll inside a small box. It is now as tall as what is in it, at any width, and it follows the
   * width when the panel or the card it is in changes size.
   */
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const fitTheLines = () => {
    const el = boxRef.current
    if (!el) return
    el.style.height = 'auto'
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + 2}px`
  }
  useLayoutEffect(fitTheLines, [text])
  useEffect(() => {
    const around = boxRef.current?.parentElement
    if (!around || typeof ResizeObserver === 'undefined') return
    const watching = new ResizeObserver(() => fitTheLines())
    watching.observe(around)
    return () => watching.disconnect()
  }, [])
  const [reading, setReading] = useState(false)
  const whatsappOn = useWhatsAppIsOn()
  /* Who the line being typed could be. Shown only once the lead has typed, never over a line the box came filled with. */
  const [caret, setCaret] = useState<number | null>(null)
  const [active, setActive] = useState(-1)
  const line = caret === null ? null : theLineBeingTyped(text, caret)
  const offered = line && colleagues?.length && onPick ? whoItCouldBe(line.typed, colleagues) : []
  const open = offered.length > 0
  const listId = 'the-team-box-suggestions'
  const noteTheCaret = (el: HTMLTextAreaElement) => { setCaret(el.selectionStart ?? el.value.length); setActive(-1) }
  async function pick(person: APerson) {
    if (!line || !onPick) return
    /* The line typed goes, and so does the line the box came filled with for the same person: they are on the check-in now. */
    const same = (l: string) => l.split(',')[0].trim().toLowerCase() === person.name.trim().toLowerCase()
    const rest = (text.slice(0, line.start) + text.slice(line.end + (text[line.end] === '\n' ? 1 : 0))).split('\n').filter((l) => !same(l)).join('\n').replace(/\n+$/, '')
    setText(rest)
    setCaret(null)
    setActive(-1)
    await onPick(person)
  }
  function onKeyDown(e: import('react').KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % offered.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? offered.length - 1 : i - 1)) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); void pick(offered[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setCaret(null); setActive(-1) }
  }
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
        ref={boxRef}
        id="the-team-box"
        aria-label="Your team, one per line"
        placeholder={'Sarah Chebet, sarah@company.com, +254 712 345 678\nDavid Kariuki, david@company.com, +254 722 111 222'}
        value={text}
        onChange={(e) => { setText(e.target.value); noteTheCaret(e.target) }}
        onKeyDown={onKeyDown}
        onBlur={() => { setCaret(null); setActive(-1) }}
        disabled={disabled || busy}
        rows={Math.max(3, text.split('\n').length + 1)}
        {...(onPick ? {
          role: 'combobox',
          'aria-autocomplete': 'list' as const,
          'aria-expanded': open,
          'aria-controls': listId,
          'aria-activedescendant': open && active >= 0 ? `${listId}-${active}` : undefined,
        } : {})}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="People in your organisation" className="gwui-team-box-suggestions"
          style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', maxHeight: 260, overflowY: 'auto' }}>
          {offered.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              /* Down on the option, so the box keeps its focus and the pick is not lost to the box closing. */
              onMouseDown={(e) => { e.preventDefault(); void pick(p) }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderTop: i ? '1px solid var(--gw-border)' : 'none', background: i === active ? 'var(--gw-bg)' : 'white' }}
            >
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gw-text)' }}>{p.name}</span>
              {roleAndTeam(p) && <span style={{ display: 'block', fontSize: 12, color: 'var(--gw-muted)' }}>{roleAndTeam(p)}</span>}
            </li>
          ))}
        </ul>
      )}
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
