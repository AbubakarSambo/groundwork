import { describe, it, expect } from 'vitest'
import { whatItCanSay } from './WhatTheReportCanSayYet'

/**
 * NIGHT QUALITY RUN 1, PROBLEM 7. Amina sent a photo of DN-1182 and a location pin on WhatsApp during her
 * check-in; both were kept with it. Her own record still read "Backed up" and "Nothing attached yet".
 */
describe('a file sent on WhatsApp counts as attached', () => {
  const amina = { iHaveCheckedIn: true, answered: 3, parties: 5, roundsFinished: 3, documentBackedPct: 0 }

  it('says her files are attached and not linked yet, never that nothing is attached', () => {
    const row = whatItCanSay({ ...amina, filesAttached: 2 } as any).rows.find((r) => r.says === 'Which parts have a document behind them')!
    expect(row.because).toBe('You have attached 2 files, but nothing you said is linked to one yet')
    expect(row.because).not.toBe('Nothing attached yet')
  })

  it('and still says nothing is attached when nothing is', () => {
    const row = whatItCanSay({ ...amina, filesAttached: 0 } as any).rows.find((r) => r.says === 'Which parts have a document behind them')!
    expect(row.because).toBe('Nothing attached yet')
  })

  it('YourWork hands the tile her own files from the same list the Context tab reads', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'checkin/YourWork.tsx'), 'utf8')
    expect(src).toContain("queryKey: ['docs', groundId]")
    expect(src).toContain('filesAttached: myFiles.length')
  })
})
