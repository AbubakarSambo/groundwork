import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'
import { HOW_TO_STEPS } from './how-a-check-in-is-run'
import { Button } from './ui/Button'

/**
 * FIVE, AND THE FIFTH IS THE ONLY ONE THAT SAYS WHAT TO DO NEXT.
 *
 * The four before it all answer "what is this". None answered "how do I see it work before I ask my
 * team to put their work into it", which is the question somebody has after reading the other four.
 *
 * "Try it" rather than "Try it yourself": five labels share one row, and the row is the thing that
 * gets bulky. At 12px the five come to roughly 340px of a 560px modal, so nothing is squeezed and
 * none of the existing labels had to be shortened to make room.
 *
 * "WHEN TO USE IT", NOT "USE CASES" (walkthrough pass 2, item 1). "Use cases" is the kind of word
 * nobody says out loud about their own work; the question somebody actually has is when they'd
 * reach for this.
 */
const TABS = ['What it is', 'How to use it', 'When to use it', 'Reports', 'Try it'] as const

/**
 * SCREEN FAULT 5: THIS MODAL WAS WRITTEN FOR A LEAD, AND A MEMBER CANNOT TELL.
 *
 * "When to use it" and "Try it" are both about STARTING a check-in - reasons to open one, and how
 * to trial the whole thing by running both sides yourself. Neither means anything to somebody who
 * cannot open a check-in (`mayOpenCheckIns === false`): "Try one on your own" already only offers
 * that tab to somebody who may (GroundsListPage.tsx), so a member reaching it by pressing the tab
 * bar directly, rather than that link, is the one door left open. Dropped for them below, the
 * same gate "1. Start a check-in" already used on Tab0.
 */

const RES_PILLS: { label: string; bg: string; color: string }[] = [
  { label: 'Alignment confirmed',            bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
  { label: 'Continue current course',        bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
  { label: 'Realignment needed',             bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
  { label: 'Additional support required',    bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
  { label: 'Promotion recommended',          bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Compensation review recommended',bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Equity discussion recommended',  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Brief revised',                  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Scope adjustment required',      bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Gaps identified and addressed',  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Escalation required',            bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
  { label: 'Mutual exit agreed',             bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
]

function Tab0({ onNext, mayStart }: { onNext: () => void; mayStart: boolean }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/*
          * "START A CHECK-IN" ONLY FOR SOMEBODY WHO MAY (walkthrough pass 2, item 1). Telling
          * somebody who cannot open a check-in to go and start one points them at a page the server
          * will refuse them on.
          */}
        {mayStart && (
          <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-navy)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>1. Start a check-in</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>Pick the situation, set how long it runs and how often people check in, then add the people. Takes about two minutes.</div>
          </div>
        )}
        <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-green-b)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>{mayStart ? '2. ' : ''}Everyone answers on their own</div>
          {/*
            * WHAT PEOPLE SAY CAN BE SHOWN TO THE OTHERS IN THE CHECK-IN (Hafsah's privacy decision).
            * "Nobody sees anybody else's answers, including you" was not true: the report shows
            * everybody's answers, word for word, to everybody in that check-in once it is ready.
            */}
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>Each person gets a link and answers Groundwork one to one. What you say may be quoted word for word to the other people in your check-in, in its report.</div>
        </div>
        <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-amber-b)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>{mayStart ? '3. ' : ''}Read the report together</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>It releases to everyone at once and shows where people agree and where they do not. The gaps are the conversation.</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button onClick={onNext}>How to use it</Button>
      </div>
    </div>
  )
}


/**
 * SCREEN FAULT 5: A MEMBER'S OWN VERSION OF "HOW TO USE IT" - answering, reading your report, Ask.
 * `HOW_TO_STEPS` (how-a-check-in-is-run.ts) is written for whoever is running the check-in
 * ("open a check-in", "say what you want to be true at the end") and is also sent as its own page
 * to leads (`/org/guide`), so it stays theirs; this is the shorter, true version of the same two
 * steps everybody shares, plus the one a lead's version has no need to mention.
 */
const MEMBER_HOW_TO_STEPS = [
  {
    title: 'Answer your check-in on your own, and be specific',
    body: 'You get a link and answer Groundwork one to one, in your own words. A vague answer makes a weak record, so the more specific you are, the more useful the report will be.',
  },
  {
    title: 'Read the report once everyone has answered',
    body: 'It puts what everybody said in one place, and shows where your answers and theirs agree and where they differ. You see the same report as everybody else in that check-in.',
  },
  {
    title: 'Ask Groundwork if anything is unclear',
    body: 'Ask is in your own menu, wherever you are in the app. It can explain what a question meant, or what a part of your report is saying.',
  },
]

function Tab1({ onBack, onNext, mayStart }: { onBack: () => void; onNext: () => void; mayStart: boolean }) {
  const steps = mayStart ? HOW_TO_STEPS : MEMBER_HOW_TO_STEPS
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, background: 'var(--gw-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button kind="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>{mayStart ? 'When to use it' : 'Reports'}</Button>
      </div>
    </div>
  )
}

const USE_CASES = [
  { accent: 'var(--gw-green-b)', accentText: 'var(--gw-green-t)', label: 'Team use',                     title: 'Get alignment across the whole team',               body: 'Start one before a new quarter, a launch, or a reshuffle. Everybody says how they see the plan, separately. You get back where people agree and where they do not, without anybody performing for the room.' },
  { accent: 'var(--gw-green-b)', accentText: 'var(--gw-green-t)', label: 'Work nobody sees',   title: 'Surface invisible work before it disappears',       body: 'Start one when you want to know what somebody is actually carrying. You get what was delivered, what nobody saw, and what they absorbed for other people. Then the conversation is about the work, not about who feels more stretched.' },
  { accent: 'var(--gw-navy)', accentText: 'var(--gw-navy)', label: 'What was agreed',               title: 'Go back to what people actually said', body: 'When people remember an agreement differently, what everybody said at the time is still there, with the date on it. Nobody has to rely on memory, and nobody has to win the argument about whose memory it is.' },
  { accent: 'var(--gw-navy)', accentText: 'var(--gw-navy)', label: 'Work terms and conditions',     title: 'Say out loud what you each expect', body: 'Start one to get what each of you expects, what you are each taking on, and what good looks like. It is not a contract and it is not an HR file. It moves as the work moves, and both of you write your own.' },
  { accent: 'var(--gw-amber-b)', accentText: 'var(--gw-amber-t)', label: 'Project alignment',             title: 'Agree on what success looks like before the work starts', body: 'The brief you gave and the brief they heard are almost never the same. Open a check-in before the project starts. Everybody says what they are building and what done looks like. The gap shows up now rather than at month three.' },
  { accent: 'var(--gw-amber-b)', accentText: 'var(--gw-amber-t)', label: 'Pre-agreed resolution',         title: 'Agree on the resolution state before the check-in opens', body: 'Everybody picks what they are aiming at before the first session. Agreeing on where you are trying to get to changes how the whole thing feels: it becomes something you are doing together rather than something being done to somebody.' },
]

function Tab2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {USE_CASES.map((c, i) => (
          <div key={i} style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.accentText, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>{c.body}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button kind="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Reports</Button>
      </div>
    </div>
  )
}

const REPORT_ITEMS = [
  { title: 'Resolution summary',          body: 'One sentence. Auto-generated. The thing neither party named directly but both records implied. This is the most valuable line in the report. It is what the conversation needs to be about.' },
  { title: 'Where you agreed', body: 'What you genuinely agree on. Plain language, and everybody in it sees the same list.' },
  { title: 'Where you saw it differently', body: 'What each party said. Where the difference lies. Not which party is right. Groundwork never decides. It describes.' },
  { title: 'Resolution state',            body: 'What everybody agreed they were aiming at before it started. The report closes on that, and says whether what people described actually gets you there.' },
  { title: 'The credential',              body: 'A shareable verified record. End state. Alignment status. Duration. Confirmed by everybody in it, and everybody keeps it permanently. It belongs to the people who built it.' },
]

function Tab3({ onBack, onNext, mayStart, onClose }: { onBack: () => void; onNext: () => void; mayStart: boolean; onClose: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 14 }}>What the report contains</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {REPORT_ITEMS.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: i < 4 ? 'var(--gw-navy)' : 'var(--gw-green-b)', flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 8 }}>Resolution states available</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {RES_PILLS.map((p) => (
            <span key={p.label} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: p.bg, color: p.color }}>{p.label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button kind="secondary" onClick={onBack}>Back</Button>
        {/* "Try it" is a way to START a check-in - a member cannot, so this is their last tab and
            closes the modal instead (screen fault 5). */}
        {mayStart ? <Button onClick={onNext}>Try it</Button> : <Button onClick={onClose}>Got it</Button>}
      </div>
    </div>
  )
}


/**
 * SEEING IT WORK BEFORE ASKING ANYBODY ELSE TO.
 *
 * A check-in needs two people to produce anything, so somebody evaluating this alone cannot get to
 * a report at all - and one session with nobody to compare against is the worst possible first
 * impression of a product whose whole point is comparing two accounts of the same thing.
 *
 * Three facts unlock the whole trial, and none of them was anywhere in the product:
 *
 *   they can be both people from one inbox
 *   a rhythm exists with no clock on it, so a second round can happen today
 *   shortening the run is how you reach the ending, which is otherwise months away
 *
 * Everything else somebody needs is the product itself, and explaining the picker next to the
 * picker is how a help screen turns into a manual nobody reads. So this tab is those three and
 * nothing else.
 */
const TRY_IT = [
  {
    title: 'Be both people from one inbox',
    body: 'Add anything after a + in your own address and it still arrives with you, but Groundwork treats it as somebody else. Invite you+sam@ as the second person, and open their invitation in a private window. You cannot be both people in one browser.',
  },
  {
    title: 'Do the second session today',
    body: 'On the Setup tab, set the rhythm to "When the lead checks in". There is no clock on that one, so the next session opens the moment you finish yours. The second session is where Groundwork starts referring back to what was said the first time.',
  },
  {
    title: 'See how it ends',
    body: 'Also on Setup, shorten the timeframe so the run is two or three sessions. On the last one everybody is asked how it should close. Almost nobody reaches that screen on a trial, and it is the one that shows what you are left holding.',
  },
]

function Tab4({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 16 }}>
        A check-in needs two people to produce a report, so trying it alone means being two. About an
        hour, using a situation you actually have.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TRY_IT.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, background: 'var(--gw-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      {/* The one thing that decides whether the hour was worth anything, and the easiest to get
          wrong: answering as yourself twice produces two identical accounts and no report worth
          reading. */}
      <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 14, marginTop: 16, fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>
        Answer as the other person would, not as yourself. If both sides say the same thing there is
        nothing for the report to find.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button kind="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onClose}>Got it</Button>
      </div>
    </div>
  )
}

export function HelpModal() {
  const { open, tab, hide, setTab } = useHelpStore()
  const user = useAuthStore(s => s.user)
  const mayStart = user?.mayOpenCheckIns !== false

  if (!open) return null

  const go = (t: 0 | 1 | 2 | 3 | 4) => setTab(t)

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) hide() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.75)', zIndex: 9000, overflowY: 'auto', padding: '20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
    >
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: 'var(--gw-shadow-modal)', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: 'var(--gw-dark)', padding: '24px 24px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="20" height="15" viewBox="0 0 22 17" fill="none">
              <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
              <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
              <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-.01em' }}>Groundwork</span>
          </div>
          {/*
            * THE ? BUTTON IS PRESSED BY SOMEBODY WHO IS STUCK, NOT BY SOMEBODY BROWSING.
            *
            * This opened on a slogan and three cards about what the product believes. The verdict
            * was "tells me nothing of what I should do and sounds like generic AI BS", and that is
            * a fair reading of an answer that starts with "A shared picture, built from both
            * sides." Say what to do first. The philosophy is still here, one tab across.
            */}
          {/*
            SCREEN FAULT 5: "START A CHECK-IN, ADD THE PEOPLE IN IT" IS NOT SOMETHING A MEMBER
            CAN DO. Gated the same way Tab0's own "1. Start a check-in" already is.
          */}
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: '23px' }}>
            {mayStart
              ? 'Start a check-in, add the people in it, and everyone answers on their own. You get one report showing where those versions agree and where they differ.'
              : 'Each check-in asks you questions on your own, in your own words. Once everyone has answered, you get one report showing where your answers and theirs agree and where they differ.'}
          </div>
          {/* THE CLOSE BUTTON, AT LEAST 40x40 ON A PHONE (screen fault 5, tap-target floor). A
              fixed 28px circle at every width before this. */}
          <button
            onClick={hide}
            aria-label="Close"
            className="gwui-help-close"
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        {/* Tab bar. SCREEN FAULT 5: "When to use it" and "Try it" are both reasons and ways to
            START a check-in - dropped for a member, the same door "Try one on your own"
            (GroundsListPage.tsx) already keeps shut for them. */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gw-border)' }}>
          {TABS.map((label, i) => (
            (mayStart || (i !== 2 && i !== 4)) && (
              <button
                key={label}
                onClick={() => go(i as 0 | 1 | 2 | 3 | 4)}
                style={{
                  flex: 1, padding: '10px 6px', fontSize: 12, fontWeight: tab === i ? 700 : 500,
                  color: tab === i ? 'var(--gw-navy)' : 'var(--gw-muted)',
                  background: 'none', border: 'none',
                  borderBottom: tab === i ? '2px solid var(--gw-navy)' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
                }}
              >{label}</button>
            )
          ))}
        </div>

        {/* Panels. For a member (!mayStart), "When to use it" (2) and "Try it" (4) are never
            reached - their own tab-bar buttons are gone, and Tab1/Tab3 step over them. */}
        {tab === 0 && <Tab0 onNext={() => go(1)} mayStart={mayStart} />}
        {tab === 1 && <Tab1 onBack={() => go(0)} onNext={() => go(mayStart ? 2 : 3)} mayStart={mayStart} />}
        {tab === 2 && mayStart && <Tab2 onBack={() => go(1)} onNext={() => go(3)} />}
        {tab === 3 && <Tab3 onBack={() => go(mayStart ? 2 : 1)} onNext={() => go(4)} mayStart={mayStart} onClose={hide} />}
        {tab === 4 && mayStart && <Tab4 onBack={() => go(3)} onClose={hide} />}

        {/* "TALK TO US", ON EVERY TAB (A1: help and "Talk to us" from anywhere). The sentence is the
            one the request page itself opens with, so the promise is the same in both places. A plain
            link, so it works wherever this window is opened, inside the app's pages or not. */}
        <div className="gw-help-talk">
          <p>Tell us what you need and somebody will come back to you within two working days.</p>
          <a href="/talk-to-us" className="gw-b gw-b-secondary gw-b-small" onClick={hide}>Talk to us</a>
        </div>
      </div>
    </div>
  )
}

/*
 * THE FLOATING "?" IS GONE (U.3, Hafsah, 26 September). The prototype has no floating help button on
 * any screen, and on "Create an organisation" it covered the error message. Help is in the person's
 * own menu ("Settings, help, sign out") on a computer and on "More" on a phone, as the prototype
 * draws it. Nothing replaces it on the account-card pages, by her decision.
 */
