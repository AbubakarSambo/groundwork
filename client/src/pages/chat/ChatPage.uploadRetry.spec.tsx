import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #19: a failed document upload used to unconditionally drop the pending file
 * and typed context, with no way to retry without re-picking the file. This
 * locks that the upload mutation's onError restores that state instead of
 * discarding it.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ChatPage.tsx'),
  'utf8',
)

describe('#19 upload failure preserves pending doc/context for retry', () => {
  it('restores pendingDoc and docContext in the uploadDoc onError handler', () => {
    const uploadDocBlock = src.slice(src.indexOf('const uploadDoc = useMutation('), src.indexOf('// Resume an in-progress check-in'))
    expect(uploadDocBlock).toMatch(/onError:/)
    expect(uploadDocBlock).toMatch(/setPendingDoc\(file\)/)
    expect(uploadDocBlock).toMatch(/setDocContext\(ctx\)/)
  })
})
