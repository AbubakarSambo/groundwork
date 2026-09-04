/**
 * A page in the navigation that has no route is a dead link; a route missing
 * from the navigation is a page nobody finds.
 *
 * Both are easy to create, because they live in different files and neither
 * failure shows up until somebody clicks. Sixteen pages went in at once, which
 * is exactly the situation where one gets forgotten.
 *
 * The register is also what makes the interface honest: navigation is generated
 * from what a person holds, so somebody who brings companies in sees four items
 * rather than sixteen with locks on twelve. That only works if this list is the
 * single truth about what exists.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { OPS_PAGES, pagesFor, GROUPS } from './what-you-can-open'

const APP = readFileSync(join(__dirname, '../../App.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const routedOpsPaths = [...APP.matchAll(/<Route path="(\/ops[^"]*)"/g)].map((m) => m[1])

describe('the back office navigation and the router agree', () => {
  it('found the routes, so this cannot pass on an empty list', () => {
    expect(routedOpsPaths.length).toBeGreaterThan(5)
    expect(OPS_PAGES.length).toBeGreaterThan(5)
  })

  it('and every page in the navigation has a route', () => {
    const dead = OPS_PAGES.filter((p) => !routedOpsPaths.includes(p.path)).map((p) => p.path)
    expect(dead).toEqual([])
  })

  it('and every ops route appears in the navigation', () => {
    const unreachable = routedOpsPaths.filter((path) => !OPS_PAGES.some((p) => p.path === path))
    expect(unreachable).toEqual([])
  })

  it('and every page sits in a group the navigation renders', () => {
    const orphaned = OPS_PAGES.filter((p) => !GROUPS.includes(p.group)).map((p) => p.path)
    expect(orphaned).toEqual([])
  })
})

describe('what each person is offered', () => {
  /**
   * The numbers here are the point, not decoration. A contributor seeing four
   * items has an interface that feels intentionally small; a contributor seeing
   * sixteen, twelve of them refused, has one that tells him daily it is not for
   * him.
   */
  it('gives a contributor a small, whole interface', () => {
    const theirs = pagesFor(['sprint:read', 'contributor:self', 'spend:submit']).map((p) => p.name)
    expect(theirs).toEqual(['My board', 'The sprint', 'Commitments', 'Spend', 'Objectives'])
  })

  it('and is offered no page that would always be empty for them', () => {
    /*
     * Approvals shows the decisions you OWE, so for a contributor it never has
     * anything in it. A menu item that is permanently empty is the same failure
     * as a locked one wearing a friendlier face - it teaches somebody that
     * parts of their own interface are not worth opening.
     */
    const theirs = pagesFor(['sprint:read', 'contributor:self', 'spend:submit']).map((p) => p.path)
    expect(theirs).not.toContain('/ops/approvals')
  })

  it('never offers a contributor the fundraise or the strategy', () => {
    const theirs = pagesFor(['sprint:read', 'contributor:self', 'spend:submit']).map((p) => p.path)
    expect(theirs).not.toContain('/ops/fundraise')
    expect(theirs).not.toContain('/ops/strategy')
  })

  it('gives sales the selling pages and none of the building ones', () => {
    const theirs = pagesFor([
      'sprint:read', 'sales:read', 'sales:write', 'marketing:read', 'deployment:read', 'product:read', 'contributor:self', 'spend:submit',
    ]).map((p) => p.path)
    expect(theirs).toContain('/ops/sales')
    expect(theirs).toContain('/ops/deployment')
    expect(theirs).toContain('/ops/roadmap') // read-only: whether a company is supported is their business
    expect(theirs).not.toContain('/ops/tech')
    expect(theirs).not.toContain('/ops/ux')
  })

  it('and somebody with nothing still gets the pages that are everybodys', () => {
    const theirs = pagesFor([]).map((p) => p.path)
    expect(theirs).toContain('/ops')
    expect(theirs.length).toBeGreaterThan(0)
  })
})
