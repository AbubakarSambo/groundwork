import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { Confirm, useAreYouSure } from './a-second-press-before-it-is-gone'

/**
 * NOTHING IRREVERSIBLE HAPPENS ON ONE PRESS. Revoking a key, removing an endpoint or a target, ending
 * an engagement, throwing away an anonymous session: each fired on one click. The shape is one helper;
 * the copy is every caller's own.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'))

function Harness({ onFire }: { onFire: () => void }) {
  const sure = useAreYouSure<string>()
  return (
    <div>
      <button onClick={() => sure.arm('k1')}>Revoke</button>
      {sure.isArmed('k1') && <Confirm saying='Revoke "Workday"? It cannot be brought back.' confirmLabel="Revoke it" onConfirm={onFire} onKeep={sure.disarm} />}
    </div>
  )
}

describe('the helper', () => {
  it('one press arms and names the object; the second fires once; keep disarms without firing', () => {
    const onFire = vi.fn()
    render(<Harness onFire={onFire} />)
    fireEvent.click(screen.getByText('Revoke'))
    expect(onFire).not.toHaveBeenCalled()
    expect(screen.getByText(/Revoke "Workday"\?/)).toBeTruthy()
    fireEvent.click(screen.getByText('Keep it'))
    expect(screen.queryByText(/Revoke "Workday"\?/)).toBeNull()
    fireEvent.click(screen.getByText('Revoke'))
    fireEvent.click(screen.getByText('Revoke it'))
    expect(onFire).toHaveBeenCalledTimes(1)
  })
})

describe('the six sites', () => {
  it('each arms first and names what it would destroy', () => {
    const integrations = read('pages/org/IntegrationsPage.tsx')
    expect(integrations).toMatch(/onClick=\{\(\) => sure\.arm\(`revoke:\$\{c\.clientId\}`\)\}/)
    expect(integrations).toContain('Anything using it stops working immediately, and it cannot be brought back.')
    expect(integrations).toMatch(/onClick=\{\(\) => sure\.arm\(`rotate:\$\{e\.id\}`\)\}/)
    expect(integrations).toMatch(/onClick=\{\(\) => sure\.arm\(`remove:\$\{e\.id\}`\)\}/)
    expect(integrations).not.toMatch(/onClick=\{\(\) => (revoke|rotate|removeEndpoint)\.mutate\(/)
    const board = read('pages/board/BoardPage.tsx')
    expect(board).toMatch(/onClick=\{\(\) => sureAboutTarget\.arm\(o\.id\)\}/)
    expect(board).toMatch(/aria-label=\{`Remove target: \$\{o\.name\}`\}/)
    const panel = read('components/gw/ResolutionPanel.tsx')
    expect(panel).toMatch(/onClick=\{\(\) => picked && setConfirming\(true\)\}/)
    /* The dialog still names what the press does. The marker was "nobody closes it alone", which
       went with the agreement rule - closing is the lead's now, on every scenario. */
    expect(panel).toContain('As the lead, your answer closes this check-in.')
    const save = read('pages/home/SaveCard.tsx')
    expect(save.match(/<StartOver onClear=\{onClear\} \/>/g)?.length).toBe(2)
    expect(save).toContain('This throws away this check-in and everything in it.')
  })
  it('and every one of the three integration mutations now says when it fails', () => {
    const integrations = read('pages/org/IntegrationsPage.tsx')
    for (const name of ['revoke', 'rotate', 'removeEndpoint']) {
      const start = integrations.indexOf(`const ${name} = useMutation({`)
      const def = integrations.slice(start, integrations.indexOf('\n  const ', start + 10))
      expect(def).toContain('onError')
    }
  })
})
