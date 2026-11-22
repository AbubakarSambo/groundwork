import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A BUTTON NOBODY CAN PRESS IS NOT SHOWN.
 *
 * The client decided who was allowed from initiatorId and role, in three places, and the server
 * decided differently: an org admin was offered the "whoever runs this check-in" document setting
 * and refused on press; a demoted admin kept admin lists for the rest of the page session; the
 * integrations page mounted for a member and then refused them (fix plan A12). The server now says
 * who the viewer is to a check-in, and each gated control reads that.
 */
const SRC = join(__dirname, '..', '..')
const API = join(SRC, '..', '..', 'api', 'src', 'modules')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(join(SRC, rel), 'utf8'))

describe('who the viewer is to a check-in', () => {
  it('is said by the server, from the two booleans its routes test', () => {
    const grounds = strip(readFileSync(join(API, 'grounds', 'grounds.service.ts'), 'utf8'))
    const ret = grounds.slice(grounds.indexOf('peersVisibleEffective: peersVisible,'), grounds.indexOf('peersVisibleEffective: peersVisible,') + 600)
    expect(ret).toContain('viewerIsInitiator,')
    expect(ret).toContain('viewerRunsThisGround,')
  })

  it('and both pages that run a check-in read the server\'s answer first', () => {
    const admin = read('pages/grounds/GroundAdminPage.tsx')
    expect(admin).toMatch(/const isInitiator = \(ground as any\)\?\.viewerIsInitiator \?\?/)
    expect(admin).toMatch(/const canRunThisGround = \(ground as any\)\?\.viewerRunsThisGround \?\?/)
    const page = read('pages/grounds/GroundPage.tsx')
    expect(page).toMatch(/viewerRunsThisGround/)
  })
})

describe('each gated control', () => {
  it('the initiator-only document setting is offered only to the initiator', () => {
    const ctx = read('components/gw/ContextPage.tsx')
    expect(ctx).toMatch(/\(isTheLead \|\| \(doc as any\)\.visibility === 'CLOSED'\) && \(/)
    expect(ctx).toMatch(/<option value="CLOSED" disabled=\{!isTheLead\}>/)
  })

  it('the integrations page is behind the same door as the members page', () => {
    const app = read('App.tsx')
    const route = (p: string) => app.slice(app.indexOf(`path="${p}"`), app.indexOf('/>', app.indexOf(`path="${p}"`)))
    /* U.18: Connections moved to the prototype's three addresses; each is behind the same door. */
    for (const p of ['/settings/connections', '/settings/whatsapp', '/settings/tools']) expect(route(p)).toContain('<AdminsOnly')
    /* Changed 22 November 2026: People has its own door since "who can add people" (an admin, or anybody the organisation lets add people), so it is
       no longer AdminsOnly; the connections pages above still are. */
    expect(route('/org/members')).toContain('<WhoMayAddPeople')
  })

  it('a role that changes empties the query cache, so nothing answers from the old role', () => {
    const store = read('stores/auth.ts')
    const update = store.slice(store.indexOf('updateUser: (userData) =>'), store.indexOf('updateUser: (userData) =>') + 500)
    expect(update).toMatch(/roleChanged/)
    expect(update).toContain('queryClient.invalidateQueries()')
  })
})
