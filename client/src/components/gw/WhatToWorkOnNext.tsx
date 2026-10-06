import { Panel, SubHeading, Tag, Note, Stack } from '@/components/gw/ui'

/**
 * THE COACHING NOTE. THE ONE PLACE ON THIS PAGE SPEAKING DIRECTLY TO THE PERSON READING IT.
 *
 * `postReportGuide` was generated at every release, per person, and rendered nowhere on the page
 * somebody lands on when they finish. That is the regression this restores, and it arrives with
 * more behind it than one session's text: what keeps showing up for this person across sessions,
 * what that means for somebody in their role at this point in the run, and the one thing to do
 * before the next one. See what-to-work-on-next.ts on the server for how it is built.
 *
 * THREE SHORT BLOCKS, NOT A WALL. Somebody reads this at the end of ten minutes of writing.
 *
 * IT IS PRIVATE AND IT IS ABOUT THEM. It never appears on the shared report, never characterises
 * anybody else, and never says what another participant should do. With no pattern confirmed yet
 * it gives the role and stage guidance instead of hiding: an empty coaching surface on session 2
 * teaches somebody the product has nothing to say to them.
 *
 * GROUP 3 DRIFT LIST, PIECE 1 (Hafsah, 1 October 2026): rebuilt from the shared parts, the same way
 * as SessionReportPage's own private half - a `Panel` with a real `Tag` reading "Only you" beside
 * its `SubHeading`, each short block label a `SubHeading` of its own (the part written for exactly
 * this: "a short label over one fact inside a panel"), body text `gwui-panel-text`, and `Stack` for
 * the gaps. No inline styles and nothing under the 13px floor.
 */
export interface CoachingNote {
  /** What is true of this reader and nobody else. Empty is normal. See what-your-own-record-says.ts. */
  aboutYou?: string[]
  showingUp: string | null
  whyItMatters: string
  /** One or two things to do. A list, because two actions run together read as one sentence. */
  beforeNextTime: string[]
  general: boolean
  /** From the role map, where a function was detected confidently. See what-to-work-on-next.ts. */
  role: {
    label: string
    onTrack: string
    goingWrong: string
    protectAgainst: string
    noticed: string | null
    lookingLike: string | null
  } | null
  /** Why there is no role map, when there is none. An absence with no reason reads as a gap. */
  whyNoRoleMap: string | null
}

export function WhatToWorkOnNext({ note, guide }: {
  note?: CoachingNote | null
  /** The three lines about the conversation to have next, when a release has produced them. */
  guide?: { openingLine?: string; questionToCarry?: string; toAcknowledge?: string } | null
}) {
  if (!note && !guide) return null
  const conversation = [
    { h: 'A way to open', text: guide?.openingLine },
    { h: 'A question worth carrying in', text: guide?.questionToCarry },
    { h: 'Something they said worth taking seriously', text: guide?.toAcknowledge },
  ].filter(r => r.text?.trim())

  return (
    <Panel>
      <Stack gap={12}>
        <div className="gwui-sentence-row">
          <SubHeading>What to work on next</SubHeading>
          <Tag>Only you</Tag>
        </div>
        <Note>Written for you. It is not part of the shared report.</Note>

        {note && (
          <Stack gap={12}>
            {/*
              WHAT IS TRUE OF YOU AND NOBODY ELSE, FIRST.

              The page used to open on the role map, which is about a KIND of person: "this kind of
              sales and expansion work often faces unfair reading, which you should consider before
              making assumptions about your current standing." Read off a real report, and true of
              every salesperson alive.

              These lines carry a figure or a thing off this reader's own record, so none of them
              could be said to anybody else. First, because a reader who opens on something that is
              plainly about them reads the rest as being about them too.
            */}
            {note.aboutYou && note.aboutYou.length > 0 && (
              <div>
                <SubHeading as="h3">Where you stand</SubHeading>
                <Stack gap={10}>
                  {note.aboutYou.map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
                </Stack>
              </div>
            )}
            {note.showingUp && (
              <div>
                <SubHeading as="h3">What keeps showing up</SubHeading>
                <p className="gwui-panel-text">{note.showingUp}</p>
              </div>
            )}
            {/*
              WHAT GOING WRONG LOOKS LIKE IN THIS KIND OF WORK, AND WHAT IT LOOKS LIKE WHEN IT DOES
              NOT. Both halves or neither: the failure signal alone is a label stapled to a person,
              and the pairing is the whole reason the map is a staircase rather than a stick.
            */}
            {note.role?.noticed && note.role.lookingLike && (
              <div>
                <SubHeading as="h3">What was noticed, and what it looks like instead</SubHeading>
                <Stack gap={10}>
                  <p className="gwui-panel-text">{note.role.noticed}.</p>
                  <p className="gwui-panel-text">
                    Done well, that is: {note.role.lookingLike.charAt(0).toLowerCase() + note.role.lookingLike.slice(1)}.
                  </p>
                </Stack>
              </div>
            )}
            <div>
              <SubHeading as="h3">{note.general ? 'Where you are' : 'Why it matters here'}</SubHeading>
              <p className="gwui-panel-text">{note.whyItMatters}</p>
            </div>
            {/*
              THE FAIRNESS HALF OF THE MAP, AND IT IS NOT OPTIONAL.

              `protectAgainst` is how this function's people get unfairly read. A coaching note that
              carries what somebody does wrong and not what they get blamed for wrongly is the stick
              without the map, and the map exists so this product is not that.
            */}
            {note.role?.protectAgainst && (
              <div>
                <SubHeading as="h3">Where this kind of work gets misread</SubHeading>
                <p className="gwui-panel-text">{note.role.protectAgainst}</p>
              </div>
            )}
            {/* An absence with no reason reads as the product having nothing to say. */}
            {!note.role && note.whyNoRoleMap && <Note>{note.whyNoRoleMap}</Note>}
            <div>
              <SubHeading as="h3">Before the next session</SubHeading>
              <Stack gap={10}>
                {(note.beforeNextTime ?? []).map((a, i) => <p key={i} className="gwui-panel-text">{a}</p>)}
              </Stack>
            </div>
          </Stack>
        )}

        {conversation.length > 0 && (
          <Stack gap={10}>
            {conversation.map((r, i) => (
              <div key={i}>
                <SubHeading as="h3">{r.h}</SubHeading>
                <p className="gwui-panel-text">{r.text}</p>
              </div>
            ))}
          </Stack>
        )}
      </Stack>
    </Panel>
  )
}
