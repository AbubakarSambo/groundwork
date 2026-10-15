import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { ShareSection } from './ShareSection'

vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,QR') }, toDataURL: () => Promise.resolve('data:image/png;base64,QR') }))

/*
 * "OR SHARE A LINK" ON THE CHECK-IN'S SETUP, AS THE LEAD READS IT (U.6, B1). Word for word against
 * docs/prototype/screens/B1-starting-a-check-in/setup.txt, less the two lines nothing backs yet.
 */
describe('share a link, as the lead reads it', () => {
  it('reads the prototype’s words, and offers the QR code to download', async () => {
    render(<ShareSection joinToken="abc123" />)
    const box = screen.getByRole('region', { name: 'Or share a link' })
    expect(within(box).getByText('For events, posters and groups where you don’t have everyone’s details.')).toBeTruthy()
    expect(within(box).getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(within(box).getByText(/\/answer\?t=abc123$/)).toBeTruthy()
    const download = await within(box).findByRole('link', { name: 'Download the QR code' })
    expect(download.getAttribute('download')).toBe('check-in-qr-code.png')
    expect(within(box).getByText('Anyone with the link can answer without an account and says who they are at the end.')).toBeTruthy()
    for (const notBacked of ['Turn the link off', 'take a seat', 'Broadcast link']) {
      expect(box.textContent, notBacked).not.toContain(notBacked)
    }
  })
})

describe('where people answer, on the same Setup', () => {
  it('is only offered while WhatsApp is switched on, as well as connected', () => {
    /*
     * REPOINTED (People and setup rebuild, 29 Sept): GroundAdminPage.tsx still reads whether
     * WhatsApp is switched on (`useWhatsAppIsOn`) and hands it to CheckInPeopleAndSetup.tsx as
     * `whatsAppIsOn`, which is where the "Where people answer" row's own gate now lives.
     */
    const admin = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
    const page = readFileSync(join(__dirname, 'CheckInPeopleAndSetup.tsx'), 'utf8')
    expect(admin).toContain('const whatsAppIsOn = useWhatsAppIsOn()')
    expect(page).toContain('props.whatsAppIsOn && (ground as any)?.orgHasWhatsApp && (')
  })
})
