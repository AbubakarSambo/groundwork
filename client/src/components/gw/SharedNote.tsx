import { Section } from '@/components/gw/ui'

/**
 * THE LEAD'S FRAMING OF THE SITUATION, READ BY EVERYONE.
 *
 * The gap that made the whole Context page confusing. Every note was lead-only, so a lead who wanted
 * to tell the team what this is about in words had no way to - the only shareable context was a file,
 * which they then had to remember to open. So they wrote a private note and reasonably expected it to
 * be seen.
 *
 * SHOWN WITH ITS AUTHOR ATTACHED, always. "We are deciding whether to renew" read as a neutral
 * statement of the situation is a very different thing from the same words read as the lead's framing
 * of it, and only the second is true. That is the same rule the report follows for documents: who put
 * it there is part of what it is.
 *
 * VISIBLE TO ALL, QUOTABLE BY NONE. Nothing about being readable makes this evidence - it is the
 * lead's words about a situation, so the sessions may let it shape what they ask and may never put it
 * to anybody as established. The enforcement is in the prompt block that carries the text and in the
 * query that fetches it, not here; this component only has to avoid implying otherwise, which is why
 * it never presents the note as a fact about the check-in.
 */
export function SharedNote({ text, leadName, isViewerTheLead }: { text?: string | null; leadName?: string | null; isViewerTheLead?: boolean }) {
  const body = text?.trim()
  if (!body) return null

  const who = leadName?.trim()
  /* To the lead, these are her own words read back at her, not a third person's (walkthrough pass
     2, item 1): "Your words", never "Rukia Otieno's words" to Rukia herself. */
  const whoseWords = isViewerTheLead ? 'Your words' : who ? `${who}'s words` : 'the lead’s words'
  return (
    <div style={{ marginBottom: 22 }}>
      <Section heading="How this is being framed" note={`${whoseWords}, read by everyone here`} />
      <div
        style={{
          background: 'white',
          border: '1px solid var(--gw-border)',
          borderLeft: '2px solid var(--gw-navy)',
          borderRadius: 8,
          padding: '13px 15px',
          fontSize: 14,
          color: 'var(--gw-text)',
          lineHeight: '23px',
        }}
      >
        {body}
      </div>
      {/*
        The one sentence that has to be here. Somebody reading this needs to know it is not a finding
        about them and that disagreeing with it is a normal thing to do in their own session.
      */}
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', marginTop: 7 }}>
        This is how the situation has been described to everyone, not a finding about anybody. If you
        see it differently, say so in your check-in and that goes on the record too.
      </div>
    </div>
  )
}
