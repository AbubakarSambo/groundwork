import { Note } from '@/components/gw/ui/NoteEmpty'
import { YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP } from '@/lib/answer-on-whatsapp-instead'

/**
 * "YOU CAN ALSO CHECK IN ON WHATSAPP", AND THE WAY TO CONNECT (fix list, item 5). One quiet line with one quiet button,
 * the same on the check-in page, at the end of a session and on Today. Drawn only when the server served a link: the
 * server serves one only where WhatsApp is on for the organisation, and not to somebody who already writes from their
 * number.
 */
export function CheckInOnWhatsApp({ link, label, testId, says = YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP }: { link: string; label: string; testId?: string; says?: string }) {
  return (
    <Note>
      {says}{' '}
      <a className="gw-link" href={link} target="_blank" rel="noopener" data-testid={testId}>
        {label}
      </a>
    </Note>
  )
}
