import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { AskGroundwork } from '@/components/gw/AskGroundwork'
import { useAskStore } from '@/stores/ask'

/**
 * #/chat (D1, ask-on-a-phone.txt): Ask Groundwork as a page of its own, which is how a phone opens
 * it from "Chat" in the bottom bar. On a computer the same panel opens beside any page.
 *
 * PHONE CHECK, ITEM 1: a question typed elsewhere (the header's "Ask", the board's own Ask bar, a
 * Company page button) is kept in `pendingMessage` and handed in here as `initialMessage`, the same
 * way AppShell's desktop drawer already does - AppShell redirects here instead of opening that
 * drawer once the screen is phone width. Read and consumed once, so it is never re-sent.
 *
 * "I CAN HELP YOU DO THAT" (docs/answers-from-engine.md, 8 October, point 3 of "the engagement
 * work"): `/chat?about=<check-in id>` opens Ask with a question already put, so a first-insight
 * mail can hand a lead straight into the conversation worth having rather than an empty box.
 * The real finding is read from GET /grounds/:id/report/finding (request 198), the same sentence the
 * mail's subject says. Where the reader has none yet (the picture is not released to them, or it names
 * nothing open), the question stays the neutral one naming the check-in. `about` is read once; a second visit with the same
 * query string (the browser back button) does not ask it again, because `pendingMessage` already
 * carries whatever the panel is showing by then.
 */
export function AskPage() {
  const pendingAskMessage = useAskStore(s => s.pendingMessage)
  const consumePendingAskMessage = useAskStore(s => s.consumePendingMessage)
  /* B-210: this page IS the panel, so it must only queue the message, never also open the
     desktop drawer beside itself (see queueMessage's own note in stores/ask.ts). */
  const queueMessage = useAskStore(s => s.queueMessage)
  const [searchParams] = useSearchParams()
  const about = searchParams.get('about')
  /*
   * B-224: `?ground=` CARRIES WHICH CHECK-IN TO OPEN FOCUSED ON, WITHOUT ALSO ASKING ITS OWN
   * CANNED QUESTION. Set only by AppShell's phone redirect (see its own note), when "Ask" is
   * pressed on a `/grounds/:id` page at phone width - a separate name from `about`, which already
   * means something else here (B-210's first-insight link, which also queues its own opening
   * question below). A board's own typed question is already queued in the store by the time this
   * page mounts (`showWith`, called before the redirect); this only has to make sure that question
   * is sent WITH the check-in it was about, not with none at all.
   */
  const groundOnly = searchParams.get('ground')
  const askedAboutRef = useRef<string | null>(null)
  const { data: ground, isFetched, isError: groundErrored } = useQuery({
    queryKey: ['ask-about-ground', about],
    queryFn: () => groundsApi.get(about!),
    enabled: !!about,
    retry: false,
  })
  /* The real finding (request 198), when the shared picture has one for this reader. Without it the question stays the neutral one. */
  const { data: found, isFetched: foundFetched } = useQuery({
    queryKey: ['ask-about-finding', about],
    queryFn: () => groundsApi.finding(about!),
    enabled: !!about,
    retry: false,
  })

  useEffect(() => {
    if (!about || askedAboutRef.current === about || !isFetched || !foundFetched) return
    askedAboutRef.current = about
    /*
     * B-210: AN ID THE READER MAY NOT SEE, OR A MADE-UP ONE. `groundsApi.get` errors (it is the
     * same read the check-in's own page makes), and nothing should be asked or said about a
     * check-in this reader cannot open - not even the neutral "Help me prepare for this
     * conversation.", which still named a conversation they have no business being told exists.
     */
    if (groundErrored) return
    const name = ground?.label ? `the conversation about ${ground.label}` : 'this conversation'
    const message = found?.finding
      ? `Help me with what the shared picture found about ${found.label || ground?.label || 'this conversation'}. ${found.finding}`
      : `Help me prepare for ${name}.`
    /*
     * B-210 (REVIEW 4): SENT ONCE PER LINK, NOT ONCE PER VISIT. `askedAboutRef` only guards a
     * second run of this SAME mount's effect (StrictMode's double invoke) - a reload, or Back to
     * this address, is a fresh mount with a fresh ref, so `queueMessage` ran again and
     * `AskGroundwork`'s own `sentInitial` ref (also fresh) sent it again, piling up in the
     * reader's own private Ask history every time they came back to the same mail link. Walked
     * live: reload #/chat?about=<id> twice, two more "Help me prepare for..." questions each time.
     *
     * `sessionStorage` is kept per tab already - the one thing a reload and Back share, and the
     * one thing a fresh click on the email link in a NEW tab does not - so remembering the sent
     * flag there, keyed by the check-in and the exact question asked, sends it again only when
     * either actually changes (a different check-in, or a different finding to ask about).
     */
    const sentKey = `gw-ask-sent:${about}:${message}`
    try {
      if (sessionStorage.getItem(sentKey)) return
      sessionStorage.setItem(sentKey, '1')
    } catch {
      /* Private browsing or a blocked sessionStorage: fall through and send once for this mount,
         same as before this fix - no worse than the old behaviour, never better here. */
    }
    queueMessage(message)
  }, [about, isFetched, foundFetched, groundErrored, ground, found, queueMessage])

  return (
    /* The prototype's #/chat: the page title "Chat", then the assistant's own panel (.chatpage) under it. */
    <div className="main"><div className="wrap">
      <h1 className="t-title gw-chat-title">Chat</h1>
        <AskGroundwork
          initialMessage={pendingAskMessage}
          onSentInitialMessage={consumePendingAskMessage}
          /* B-210: "About" is set to the check-in this page opened on, the same way a board's own
             page already focuses Ask on itself - only once the reader is confirmed able to see it.
             B-224: or, with no "about" link to confirm, the check-in AppShell's phone redirect
             carried across in "ground" - see its own note on the redirect, and on `groundOnly`
             above. */
          aboutGroundId={about && !groundErrored ? about : (groundOnly || null)}
        />
    </div></div>
  )
}
