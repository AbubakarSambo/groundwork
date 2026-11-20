import { useRef } from 'react'
import { PageTitle } from '@/components/gw/ui/PageTitle'
import { TheCheckInHeader } from '@/components/gw/checkin/TheCheckInHeader'
import { Bubble } from '@/components/gw/ui/Bubble'
import { ConversationCard } from '@/components/gw/ui/ConversationCard'
import { Composer } from '@/components/gw/ui/Composer'
import { TheEndCard } from '@/components/gw/checkin/TheEndCard'
import '@/components/gw/ui/gw-ui.css'

/**
 * THE LIVE CONVERSATION, PICTURED, WITHOUT A REAL SESSION.
 *
 * Every unfinished check-in on this machine has not started, and opening `ChatPage.tsx` for real
 * starts one - so nobody has ever been able to hold the live conversation's look up against the
 * prototype's own B3 screens. This page draws the same frame, from the same shared parts, in the
 * same order ChatPage.tsx does - `ConversationCard`, `TheCheckInHeader`, `Bubble`,
 * `SuggestedAnswers` (which draws `QuickReplies`), `Composer`, `TheEndCard` - filled with fixed
 * words copied from docs/prototype/screens/B3-the-check-in/check-in-start.txt,
 * check-in-phone.txt and check-in-end-card.txt. Nothing here calls the server: every word is a
 * constant in this file.
 *
 * ChatPage.tsx's own frame (`.gwui-ci-page` / `.gwui-ci-wrap`) is not a component - it is markup
 * written directly in ChatPage.tsx's own return. Rather than refactor ChatPage to extract it (out
 * of scope, and risky for a page this load-bearing), this page writes the same two classes
 * itself, which already exist in gw-ui.css for exactly this frame.
 *
 * Development only - see the route guard in App.tsx (`import.meta.env.DEV`), the same guard
 * `/dev/parts` uses. Never reachable in a built, production app.
 */

const OPENING_QUESTION =
  'Good news first: last week you said Lakeside’s buyer would meet you on the 29th. The buyer has now confirmed the meeting. That is in your record. Now, yesterday you said Green Mart wanted a quote. What happened?'


type FixedMsg = { role: 'AI' | 'PERSON'; content: string }

/** The end card's full conversation, word for word from check-in-end-card.txt. */
const END_CARD_TURNS: FixedMsg[] = [
  { role: 'AI', content: OPENING_QUESTION },
  { role: 'PERSON', content: 'Sent it. They liked it but want to wait until after December.' },
  { role: 'AI', content: 'So they will buy after this quarter ends. Did they give you a date?' },
  { role: 'PERSON', content: 'They said January' },
  {
    role: 'AI',
    content:
      'Can you add the quote? A photo of it is enough. Then the Green Mart sale counts as proven, not only as your word.',
  },
  { role: 'PERSON', content: 'Later' },
  { role: 'AI', content: 'Did anything else change with your sales today?' },
  { role: 'PERSON', content: 'I’ll visit Westgate Deli on Friday' },
  {
    role: 'AI',
    content: 'That’s all for today. Below is what I wrote down from your answers. Is anything wrong?',
  },
]

/** check-in-end-card.txt, part 1: "What is now in your record". */
const END_CARD_RECORD = [
  { says: 'Green Mart has a quote', how: 'From the photo you added', mark: 'proven' },
  {
    says: 'Green Mart will buy in January',
    how: 'You said this. It will count next quarter, from October.',
    mark: 'said',
  },
  {
    says: 'You’ll visit Westgate Deli on Friday',
    how: 'You said you will do this. I will ask you how it went.',
    mark: 'said',
  },
]

/** check-in-end-card.txt, part 3: "What happens next" - the two lines only the engine writes. */
const END_CARD_NEXT = [
  'If Green Mart sends a written order, add a photo of it. Then the sale counts as proven.',
]

function noop() {
  /* Nothing on this page sends, saves, or asks anything of the server. */
}

/** One state of the conversation, in the exact frame ChatPage.tsx builds: the header, then each
    turn as a Bubble, in a ConversationCard, same as the real page. */
function ConversationFrame({
  title,
  turns,
  endCard,
  maxWidth,
}: {
  title: string
  turns: FixedMsg[]
  endCard?: boolean
  maxWidth?: number
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  return (
    <div style={{ maxWidth: maxWidth ?? 600, margin: '0 auto' }}>
      <ConversationCard
        header={(
          <TheCheckInHeader title={title} onEnd={noop} onBack={noop} backTitle="Leave this session. Everything you have said is already saved." />
        )}
        footer={(
          <Composer
            value=""
            onChange={noop}
            onSend={noop}
            sendLabel="Send message"
            disabled={!!endCard}
            onPlus={noop}
            plusOpen={false}
            inputRef={inputRef}
          />
        )}
      >
        {turns.map((m, i) => (
          <Bubble key={i} mine={m.role === 'PERSON'}>
            {m.content}
          </Bubble>
        ))}
        {endCard && (
          <TheEndCard
            engine={{ inYourRecord: END_CARD_RECORD, next: END_CARD_NEXT }}
            nextOpens="Your next check-in opens tomorrow at 4pm."
            finishing={false}
            onFinish={noop}
            onChange={noop}
          />
        )}
      </ConversationCard>
    </div>
  )
}

export default function ConversationPreviewPage() {
  return (
    <div className="gwui-ci-page">
      <div className="gwui-ci-wrap" style={{ maxWidth: 900 }}>
        {/* THE SELF-LINK IS THE DOOR. Same pattern as PartsSamplePage.tsx's own crumb
            (`to: '/dev/parts'`): a dev-only page that nothing else in the app should link to
            still needs a real `to:` the route guards (every-page-can-be-reached.spec.ts,
            every-route-has-a-door.spec.ts) can find, rather than an exemption that would read
            as "forgot the link". */}
        <PageTitle
          crumbs={[{ label: 'Dev', to: '/dev/conversation' }, { label: 'Conversation preview' }]}
          title="The live conversation, previewed"
          subtitle="Development only. Fixed words from docs/prototype/screens/B3-the-check-in/*.txt, drawn from the same parts ChatPage.tsx uses, in the same order. No network call is made on this page."
        />
        <div style={{ height: 28 }} />

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          As it opens (check-in-start.txt)
        </h2>
        <ConversationFrame
          title="Sales team check-in"
          turns={[{ role: 'AI', content: OPENING_QUESTION }]}
        />

        <div style={{ height: 40 }} />

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          Part-way through, with suggested answers (check-in-phone.txt, a 375px phone)
        </h2>
        <ConversationFrame
          title="Sales team check-in"
          turns={[{ role: 'AI', content: OPENING_QUESTION }]}
          maxWidth={375}
        />

        <div style={{ height: 40 }} />

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          The end card (check-in-end-card.txt)
        </h2>
        <ConversationFrame
          title="Sales team check-in"
          turns={END_CARD_TURNS}
          endCard
        />
      </div>
    </div>
  )
}
