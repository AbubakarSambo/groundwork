import { Stack, SubHeading, Note, Tag, FlexRow, Text } from '@/components/gw/ui'

/**
 * AN ITEM'S OWN EVIDENCE, BESIDE IT ON THE BOARD (Release 1B, pull request 2 of 3; references-upload-in-check-in.txt: "On Grace's
 * board, a moment later ... Signed order, 13 October"). The server sends `evidence` on a row only while the organisation's Release
 * 1B switch is on, and only the pieces this reader may read (the lead every piece, a person only what they added), so this draws
 * what it is given and nothing when there is none.
 */
export type AnItemsEvidence = { id: string; documentId: string; readAs: string; countsAsProof: boolean; shows: string | null; addedOn: string; addedBy: string }

export function ItsEvidence({ evidence }: { evidence?: AnItemsEvidence[] | null }) {
  if (!evidence?.length) return null
  return (
    <div data-gw-item-evidence>
      <SubHeading as="h3">Evidence</SubHeading>
      <Stack gap={6}>
        {evidence.map((e) => (
          <div key={e.id} data-gw-item-evidence-piece={e.id}>
            <FlexRow gap={6} align="center" wrap>
              <Text size="14" as="span">{`${e.readAs}, added by ${e.addedBy === 'You' ? 'you' : e.addedBy} on ${e.addedOn}.`}</Text>
              <Tag tone={e.countsAsProof ? 'proven' : 'plain'}>{e.countsAsProof ? 'Counts as proof' : 'Not proof'}</Tag>
            </FlexRow>
            {e.shows && <Note tone="muted">{e.shows}</Note>}
          </div>
        ))}
      </Stack>
    </div>
  )
}
