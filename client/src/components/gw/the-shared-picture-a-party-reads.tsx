import { TwoAccountsSideBySide } from './two-accounts-side-by-side'
import { WhatTheNetworkSaid } from './WhatTheNetworkSaid'
import { WhatToSettleTogether } from './what-to-settle-together'
import { Section, Stack, Text } from './ui'

/**
 * THE SHARED REPORT, FOR THE PEOPLE IN IT (team-report-as-participant.txt).
 *
 * The team's summary in a few sentences, where people see it differently, and the one thing to
 * settle together. Nothing lead-only is here and nothing lead-only is filtered here either: the
 * server strips leadershipGaps, softSpots and the arc advisories before the payload leaves, and it
 * must stay that way.
 *
 * PAGE AUDIT, 24 NOVEMBER, ROW 5 (approved by Hafsah). This drew "What came out of it", the whole
 * stored picture, which is a paragraph for every person in the check-in (one of them twice), under
 * two "The shared picture" headings and a sentence explaining the report. The summary is now the
 * report's own opening (`theOpening`), the same team summary the board reads; each person's own
 * lines stay on the lead's report and on each person's own report.
 */
export function TheSharedPictureAPartyReads({ report }: { report: any }) {
  const divergences: any[] = report?.divergences ?? []
  const summary: string = typeof report?.theOpening === 'string' ? report.theOpening.trim() : ''
  const question: string = typeof report?.centralQuestion === 'string' ? report.centralQuestion.trim() : ''
  /* Where enough separate organisations answered, the API writes a second read of its own (a-hundred-accounts-are-not-two.ts). */
  const network: any = report?.networkPicture ?? null
  if (!summary && !divergences.length && !question && !network) return null

  return (
    <>
      {network && <WhatTheNetworkSaid picture={network} />}
      {(summary || divergences.length > 0) && (
        <Section heading="The shared picture">
          <Stack gap={12}>
            {summary && <Text size="body" as="p">{summary}</Text>}
            {divergences.map((d, i) => <TwoAccountsSideBySide key={i} difference={d} />)}
          </Stack>
        </Section>
      )}
      {/* The one component every page draws the question with (one-question-one-name). */}
      <WhatToSettleTogether question={question} />
    </>
  )
}
