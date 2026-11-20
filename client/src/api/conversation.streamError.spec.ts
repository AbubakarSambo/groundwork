import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamMessage } from './conversation'

/**
 * Run 4 (18 November): typing "That's right, finish." on a check-in already closed left the waiting bubble on "Groundwork is writing"
 * for ever. The server answered with an error event; the handler that throws on it was inside the try that ignores malformed keepalive
 * lines, so the refusal was swallowed and the page never took its way out.
 */
function streamOf(...blocks: string[]) {
  const enc = new TextEncoder()
  return new Response(new ReadableStream({ start(c) { for (const b of blocks) c.enqueue(enc.encode(b)); c.close() } }), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe('a stream that says it failed', () => {
  it('reaches the page: the handler that refuses is heard, not swallowed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamOf('data: {"type":"error","code":"stream_failed","message":"The reply could not be finished. Send that again."}\n\n', 'data: [DONE]\n\n')))
    const onError = (m: string) => { throw new Error(m) }
    await expect(streamMessage('c1', 'That is right, finish.', { onDelta: () => {}, onDone: () => {}, onError })).rejects.toThrow('The reply could not be finished. Send that again.')
  })
  it('still ignores a line that is not a message at all (a keepalive)', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async () => streamOf('data: not json\n\n', 'data: {"type":"delta","text":"Hello"}\n\n', 'data: [DONE]\n\n')))
    await streamMessage('c1', 'Hi', { onDelta: (t) => seen.push(t), onDone: () => {} })
    expect(seen).toEqual(['Hello'])
  })
})
