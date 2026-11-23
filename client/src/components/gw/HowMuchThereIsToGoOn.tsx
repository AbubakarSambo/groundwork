/**
 * CONFIDENCE IN THIS REPORT. THE OTHER METER, AND DELIBERATELY NOT THE SAME COMPONENT.
 *
 * Specificity asks how much one person gave. It is feedback to them, it lives on their private
 * half, and it is a three-step meter about a person.
 *
 * This asks how much basis there is to build a good shared report at all. It is scoped to
 * everybody plus what the record rests on, it lives at the top of the shared half, and it is a
 * reading on the document. Nobody is being marked.
 *
 * So it is drawn as a bar with a band and a list of reasons, not as steps. If the two ever start
 * looking like the same widget, a reader will take the document's score personally, which is the
 * one thing this must never do.
 *
 * THE REASONS ARE THE POINT. "Every account this session was from memory. Nobody attached
 * anything." used to be its own section eight positions down the page. It is a reason a report
 * cannot be trusted, so it belongs here, phrased as the thing somebody can go and do.
 */
import { Stack, Text } from './ui'

export interface ConfidenceRead {
  score: number
  band: 'thin' | 'partial' | 'solid'
  saying: string
  reasons: string[]
}

/*
 * PAGE AUDIT, 24 NOVEMBER, ROW 6 (approved by Hafsah). This drew "There is a partial amount to go on." as its heading, then a bar,
 * then the server's own "There is enough here to talk about.", so the report said "partial" beside "enough". The server's sentence
 * is the one reading now, said once, with its reasons under it. The note explaining that these are lines taken from what people
 * said has gone from the server.
 */
export function HowMuchThereIsToGoOn({ read, saidAbove = false }: { read: ConfidenceRead; /** The reading is already the line this sits under. */ saidAbove?: boolean }) {
  return (
    <Stack gap={8}>
      {!saidAbove && <Text size="body" as="p">{read.saying}</Text>}
      {read.reasons.map((r, i) => <Text size="secondary" as="p" key={i}>{r}</Text>)}
    </Stack>
  )
}
