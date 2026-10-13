import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TheEndCard } from './TheEndCard'

/**
 * A PERSON WHO IS THE ONLY ONE ANSWERING IS NOT TOLD THEIR WORDS STAY THEIRS ALONE (release check, 8 October 2026).
 *
 * On test bed copy a, Juma finished the first week of Amina's "Help my team understand". Amina runs it and never
 * answers (the anchor's lead is managing only), so `aTeamReportComes` was false, and Juma's end card said: "Nobody else
 * answers this check-in, so what you said today stays yours alone." Amina reads his words on the board and the report,
 * as his invitation had told him. The sentence now names who reads it whenever the reader is not the lead.
 */
const base = { engine: null, leadName: null, nextOpens: null, finishing: false, onFinish: () => {}, onChange: () => {} }

describe('the end card, where nobody else answers', () => {
  it('tells a participant that the lead reads what they said', () => {
    render(<TheEndCard {...base} othersCanSeeWhatYouSay={false} whoReadsIt="Amina" />)
    expect(screen.getByText('Nobody else answers this check-in, but Amina runs it and reads what you said today.')).toBeTruthy()
    expect(screen.queryByText(/stays yours alone/)).toBeNull()
  })

  it('the check-in page passes the lead to everybody but the lead herself', () => {
    const page = readFileSync(join(__dirname, '../../../pages/chat/ChatPage.tsx'), 'utf8')
    expect(page).toMatch(/whoReadsIt=\{\(ground\.data as any\)\?\.viewerIsInitiator \? null : whoRunsThis\(ground\.data as any\)\}/)
  })
})
