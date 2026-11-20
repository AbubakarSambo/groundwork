import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { conversationApi } from '@/api/conversation'
import { justTheQuestion } from '@/pages/invite/the-link-opens-on-the-question'
import { whereAConversationLives, whereYourReportLives } from '@/pages/grounds/ground-tabs'
import { GroundGone } from '@/components/gw/GroundGone'
import { Page } from '@/components/gw/ui/Page'
import { ChatPage } from './ChatPage'
import { GETTING_YOUR_FIRST_QUESTION_READY } from '@/lib/opening-is-slow'

/**
 * `/checkin/:id` AND `/checkin/:id/report`, KEPT FOR THE LINKS ALREADY SENT (fix plan, batch 2,
 * group 5).
 *
 * The conversation used to be a page of its own here, and its report another page beside it.
 * Both now live in the check-in's own tabs: the conversation in Check-in, the report in My work.
 * These addresses only find the check-in the id belongs to and go there, carrying the rest of the
 * query (a clarification session's `clarify=true`, for one). The one exception is the bare frame,
 * a single question opened from a team update's link, which stays on its own.
 *
 * The check-in is read from the navigation when the product itself sent the person here, and
 * from the conversation's own record otherwise (an email or a WhatsApp link).
 */
export function TheConversationLivesInItsTab({ report = false }: { report?: boolean }) {
  const { checkInId } = useParams<{ checkInId: string }>()
  const location = useLocation()
  const bare = !report && justTheQuestion(location.search)
  const known: string | undefined = (location.state as any)?.groundId
  const read = useQuery({
    queryKey: ['transcript-ground', checkInId],
    queryFn: () => conversationApi.transcript(checkInId!),
    enabled: !!checkInId && !bare && !known,
    retry: false,
  })
  if (bare) return <ChatPage />
  const groundId = known ?? read.data?.checkIn?.groundId
  if (groundId && checkInId) {
    const to = report
      ? whereYourReportLives(groundId, checkInId)
      : whereAConversationLives(checkInId, groundId, new URLSearchParams(location.search))
    return <Navigate to={to} replace state={location.state} />
  }
  if (read.isError) return <GroundGone />
  /* The page's own empty frame for the moment it takes to find the check-in, never a white page. */
  return <Page><div aria-busy="true" className="gwui-fine gwui-fine-centre">{GETTING_YOUR_FIRST_QUESTION_READY}</div></Page>
}
