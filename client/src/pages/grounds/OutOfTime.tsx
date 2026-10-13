import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, Mark, PageTitle, Panel, SubHeading, Button, Tag, Note, Stack } from '@/components/gw/ui'

/**
 * "THIS CHECK-IN REACHED ITS END DATE" (A3, #/join/outoftime), for a person taking part. The words
 * are join-outoftime.txt's, with one change said here:
 *
 *   - "She gets your request" becomes the lead's name: the product does not know pronouns.
 *
 * "ALL 38 OF YOUR CHECK-INS" (Hafsah, 29 September, item 11) used to be left out: it counted
 * sessions (CheckIn rounds) as check-ins, which waited on a decision about what "check-in" means.
 * It now reads the server's own `checkInsCount` (asking-for-more-time.service.ts), which counts
 * distinct Grounds this person has ever been part of - never the sessions inside them.
 *
 * "Ask Wairimu for more time" is once a day, enforced on the server (asking-for-more-time.service.ts).
 *
 * Rebuilt from `components/gw/ui` only (design-audit.md section 4; the invitation task): the small
 * `Mark`, `PageTitle`, the shared `Tag` and `Panel`/`SubHeading`, the standard `Button`.
 *
 * Hafsah's first review (U.20 sixth round): this used to render inside `GroundParticipantPage`,
 * which is always inside `AppShell`'s sidebar (its route is not in `CHROMELESS`) - so the person
 * saw two Groundwork marks, this component's own and the rail's, where the prototype draws a bare
 * narrow page. `.gwui-full-page-cover` (a fixed, full-viewport div, the same trick `Modal` already
 * uses to sit above everything) covers the frame rather than reworking which routes get a sidebar
 * for one state inside one of them. Also from that review: the tag sits 12px above the title, the
 * facts panel 18px below the line under it, the button 18px below the panel, and 10px between the
 * two buttons and the note under them - the prototype's own gaps, not the page's flat 30.
 *
 * Hafsah's re-review (U.20 eighth round): the cover hid the app frame but did not stop it taking
 * keyboard focus - Tab still walked through the sidebar's links, which were invisible under the
 * cover. Fixed properly rather than patched: this now renders through a `Portal`, a body-level
 * container of its own, outside `AppShell`'s tree entirely, and while it is mounted every OTHER
 * direct child of `<body>` (the app's own root, and anything else already there) is marked
 * `inert`, restored the moment this unmounts. Nothing behind the cover can be reached at all,
 * by mouse, keyboard or a screen reader, while it is up.
 *
 * Hafsah's last check (U.20 ninth round): `inert` stopped the floating feedback button doing
 * anything, but it still SHOWED, on top of the cover - it is `zIndex: 100` (AppShell.tsx), the
 * cover is 40. The prototype's bare page has no such button, so it is hidden outright, not merely
 * made unusable: `<body>` carries `.gwui-cover-open` for exactly as long as this is mounted, and
 * gw-ui.css hides `.gw-feedback-btn` while that class is on.
 */
export function OutOfTime({ groundId, onOpenMyWork }: { groundId: string; onOpenMyWork: () => void }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const { data } = useQuery({ queryKey: ['more-time', groundId], queryFn: () => groundsApi.moreTime(groundId), retry: false })
  const ask = useMutation({
    mutationFn: () => groundsApi.askForMoreTime(groundId),
    onSuccess: () => { setProblem(''); void qc.invalidateQueries({ queryKey: ['more-time', groundId] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'Your request did not send. Try again.'),
  })
  const container = useOwnBodyContainer()

  const lead = data?.leadFirstName ?? null
  const until = data?.ranUntil
    ? whenItWas(data.ranUntil, 'dayAndMonthLong', 'UTC')
    : null
  const sub = `${until ? `It ran until ${until}. ` : ''}Nothing new can be added until ${lead ?? 'the person who runs it'} gives it more time.`
  const asked = !!data?.askedAt || ask.isSuccess
  const yourAnswersAreKept = theirAnswersAreKept()

  return createPortal(
    <div className="gwui-full-page-cover">
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <Stack gap={12}>
            <p><Tag tone="attention">Out of time</Tag></p>
            <PageTitle title="This check-in reached its end date" subtitle={sub} subtitleTone="ink" />
          </Stack>
          <Stack gap={18}>
            <Panel>
              <SubHeading>Your answers are kept</SubHeading>
              <p className="gwui-panel-text-muted">{yourAnswersAreKept}</p>
            </Panel>
            <Stack gap={10}>
              {problem && <Note tone="error">{problem}</Note>}
              {asked && <Note>{`${lead ?? 'The person who runs it'} has your request.`}</Note>}
              <Button size="big" wide onClick={() => ask.mutate()} disabled={asked || ask.isPending}>
                {`Ask ${lead ?? 'them'} for more time`}
              </Button>
              <Button kind="secondary" size="big" wide onClick={onOpenMyWork}>Open my work</Button>
              <p className="gwui-fine" style={{ textAlign: 'center' }}>
                {`${lead ?? 'They'} ${lead ? 'gets' : 'get'} your request with one button to extend it.`}
              </p>
            </Stack>
          </Stack>
        </Stack>
      </Page>
    </div>,
    container,
  )
}

/**
 * B-233: this screen reads for ONE check-in that ran out of time, never for every check-in the
 * person has ever been part of. The prototype's own join-outoftime.txt says "All 38 of your
 * check-ins and your history stay as they are," but that line fits only the prototype's own story,
 * where the whole org's check-ins ended together - it does not fit a person such as Dov, who has 11
 * check-ins in total and only this one ran out. Said with the server's count, "All 11 of your
 * check-ins stay as they are" reads as if all 11 had run out, which is not true. This now says only
 * what is true for this one check-in, regardless of how many others the person has.
 */
export function theirAnswersAreKept(): string {
  return 'What you have said in this check-in stays as it is.'
}

/**
 * A CONTAINER OF OUR OWN, APPENDED TO `<body>`, AND EVERYTHING ELSE MADE `inert` WHILE IT EXISTS.
 *
 * Not `document.body` itself (a `createPortal` target) - a fresh element we own, so we can tell it
 * apart from whatever else is already a child of `<body>` (the app's own root div, and anything
 * else's portal) and leave that alone, marking only the OTHERS `inert`. Restored in the cleanup, so
 * a person who reaches "Open my work" and leaves this screen gets their sidebar back exactly as it
 * was.
 */
function useOwnBodyContainer(): HTMLDivElement {
  const [el] = useState(() => document.createElement('div'))
  useEffect(() => {
    document.body.appendChild(el)
    document.body.classList.add('gwui-cover-open')
    const others = Array.from(document.body.children).filter((c) => c !== el)
    others.forEach((c) => c.setAttribute('inert', ''))
    return () => {
      others.forEach((c) => c.removeAttribute('inert'))
      document.body.classList.remove('gwui-cover-open')
      document.body.removeChild(el)
    }
  }, [el])
  return el
}
