import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatWasTakenFromWhatYouSaid } from './WhatWasTakenFromWhatYouSaid'

/*
 * NIGHT QUALITY RUN 2, COLLINS'S REPORT. "Last week I did nine, maybe ten, so I know it works." read "This is something you got done."
 * What a line is called is filled in by the server from the record (typeSays); the page shows that, and keeps his words as they are.
 */
describe('Collins reads his own lines, called what the record holds', () => {
  it('a hedged claim is what he said happened, and a plain past-tense line is something he got done', () => {
    const rows = [
      { id: 'a', type: 'PROGRESS', text: 'Last week I did nine, maybe ten, so I know it works.', disputedAt: null, checkInId: 'c4', sessionNumber: 4, typeSays: 'This is what you said happened. It is not counted as done until something shows it.' },
      { id: 'b', type: 'PROGRESS', text: "the women's group met on Thursday.", disputedAt: null, checkInId: 'c4', sessionNumber: 4, typeSays: 'This is something you got done.' },
    ]
    render(<QueryClientProvider client={new QueryClient()}><WhatWasTakenFromWhatYouSaid rows={rows} groundId="g" sessionNumber={4} /></QueryClientProvider>)
    expect(screen.getByText('Last week I did nine, maybe ten, so I know it works.')).toBeTruthy()
    expect(screen.getAllByText('This is what you said happened. It is not counted as done until something shows it.')).toHaveLength(1)
    expect(screen.getAllByText('This is something you got done.')).toHaveLength(1)
  })
})
