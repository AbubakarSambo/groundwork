import { useState } from 'react'
import { THE_DOOR_SIGNED_IN, THE_DOOR_SIGNED_OUT, THE_EXAMPLES, RATHER_PICK } from './the-way-in'
import { Panel, PageTitle, FieldLabel, TextArea, Button, QuickReplies, Stack, Note } from '@/components/gw/ui'

/*
 * THE FIRST SCREEN OF A NEW CHECK-IN (U.6, B1): #/start signed out, #/new signed in.
 *
 * One box and one question. The examples put their words in the box; nothing is sent until the
 * person presses the button, and what they send opens the setup conversation exactly as describing
 * it in their own words always has. The list of every situation is one link away.
 *
 * REBUILT FROM THE SHARED PARTS (group 3, piece 4d-1, B1-starting-a-check-in): `Panel` for the
 * white bordered box, `FieldLabel`/`TextArea` for the question and the field, `Button` for
 * "Continue"/"Send", and `QuickReplies` (B3's own outlined pill, already the shared part for a row
 * of clickable suggestions) for the five examples - the same shape `start.jpg` draws them in. No
 * wording changed: every string still comes from `the-way-in.ts`, copied from the prototype's own
 * `start.txt`/`new.txt`.
 */
export function TheDoor({
  signedIn,
  onSend,
  onSeeEverySituation,
}: {
  signedIn: boolean
  onSend: (text: string) => void
  onSeeEverySituation: () => void
}) {
  const [text, setText] = useState('')
  const words = signedIn ? THE_DOOR_SIGNED_IN : THE_DOOR_SIGNED_OUT
  const send = () => { if (text.trim()) onSend(text.trim()) }

  return (
    <div className="gwui-door">
      <PageTitle
        crumbs={signedIn ? THE_DOOR_SIGNED_IN.crumbs.map(label => ({ label })) : undefined}
        title={words.heading}
        subtitle={words.help}
      />
      <Panel>
        <Stack gap={10}>
          {signedIn && <FieldLabel htmlFor="gw-door-box">{THE_DOOR_SIGNED_IN.question}</FieldLabel>}
          <TextArea
            id="gw-door-box"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={words.placeholder}
            aria-label={signedIn ? undefined : words.heading}
          />
          {!signedIn && (
            <QuickReplies items={[...THE_EXAMPLES]} onPick={setText} label="Examples" />
          )}
          <Button onClick={send} disabled={!text.trim()}>{words.button}</Button>
        </Stack>
      </Panel>
      <Note>
        {RATHER_PICK.before}{' '}
        <button type="button" onClick={onSeeEverySituation} className="gwui-plain-link">
          {RATHER_PICK.link}
        </button>
        .
      </Note>
    </div>
  )
}
