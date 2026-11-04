import { useState } from 'react'
import { Button, Stack } from '@/components/gw/ui'
import { whoWasNotInvited, thatIsDealtWith, whatToSayAboutThem } from './who-was-not-invited'

/**
 * WHO WAS NOT INVITED, WHERE THE LEAD IS. Adding people is refused one at a time (a seat limit, an address already on the
 * check-in), and each refusal was a toast the lead was navigated away from a moment later, so her list of five became three
 * and nothing said so (who-was-not-invited.ts). The names are kept until she says she has dealt with them, and shown on
 * the check-in's page and on its board, which is where "Send N invitations" now lands her (the approved journey, stage 9).
 *
 * Not <Callout>: its children render inside one <p>, and a <ul> cannot sit inside a <p>. Builds the same tinted box
 * directly from the shared classes instead.
 */
export function TheyWereNotInvited({ groundId }: { groundId: string }) {
  /* Read from where they are kept on every draw, so a refusal kept after the page opened shows too. */
  const [, drawAgain] = useState(0)
  const notInvited = whoWasNotInvited(groundId)
  if (!notInvited.length) return null
  return (
    <div className="gwui-callout gwui-callout-warning">
      <p className="gwui-callout-title">{whatToSayAboutThem(notInvited)}</p>
      <Stack gap={10}>
        <ul>
          {notInvited.map((f) => (
            <li key={f.email}>{f.email}, {f.because}</li>
          ))}
        </ul>
        <Button kind="quiet" size="small" onClick={() => { thatIsDealtWith(groundId); drawAgain((n) => n + 1) }}>
          I have dealt with this
        </Button>
      </Stack>
    </div>
  )
}
