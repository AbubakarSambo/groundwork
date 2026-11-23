import { expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

/** Ask's box, once Ask has loaded and takes a question. Its hint ("Ask a question", or "Ask about this check-in") shows
    while it loads too, so a test that reads what the panel says waits for the box to be ready, not only to be there. */
export async function askIsReady(): Promise<HTMLTextAreaElement> {
  const box = (await screen.findByPlaceholderText(/^Ask (a question|about this check-in)$/, undefined, { timeout: 5000 })) as HTMLTextAreaElement
  await waitFor(() => expect(box).not.toBeDisabled(), { timeout: 5000 })
  return box
}
