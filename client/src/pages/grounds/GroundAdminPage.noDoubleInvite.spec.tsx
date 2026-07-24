import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Found while wiring #1c end-to-end: approveRequest's mutationFn called
 * BOTH participantRequestsApi.update(..., 'APPROVED') AND a second, separate
 * groundsApi.addParticipant(...) - but the server's update() already invites
 * the person on APPROVED (participant-requests.controller.ts). The redundant
 * client call hit the "unaccepted invite" branch in grounds.service.ts and
 * silently re-sent a second invite email for the same approval. Confirmed
 * live: without the fix, approving a request sends 2 emails; with it, 1.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundAdminPage.tsx'),
  'utf8',
)

describe('approving a participant request sends exactly one invite', () => {
  it('approveRequest does not call groundsApi.addParticipant a second time', () => {
    const block = src.slice(src.indexOf('const approveRequest = useMutation('), src.indexOf('const dismissRequest = useMutation('))
    expect(block).toMatch(/participantRequestsApi\.update/)
    expect(block).not.toMatch(/groundsApi\.addParticipant/)
  })
})
