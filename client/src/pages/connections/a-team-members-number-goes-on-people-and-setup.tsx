import { Link } from 'react-router-dom'

/**
 * WHERE A TEAM MEMBER'S NUMBER GOES (Drop Access, 21 October 2026). The organisation's own-number setup is for a WhatsApp Business
 * number. A lead who wants a team member to check in on WhatsApp adds their number on People and setup, in the check-in. The server
 * says this in its refusal; wherever it is shown, the words "People and setup" open the check-ins, where each one's People and setup is.
 */
export const THIS_IS_FOR_YOUR_OWN_NUMBER =
  "This is for connecting your organisation's own WhatsApp Business number. To let a team member check in on WhatsApp, add their number on People and setup."

export function WithPeopleAndSetupLinked({ text }: { text: string }) {
  const at = text.lastIndexOf('People and setup')
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <Link className="gwui-plain-link" to="/grounds">People and setup</Link>
      {text.slice(at + 'People and setup'.length)}
    </>
  )
}
