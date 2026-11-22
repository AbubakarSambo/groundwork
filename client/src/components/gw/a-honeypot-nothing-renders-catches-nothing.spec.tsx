/**
 * A HONEYPOT NOTHING RENDERS CATCHES NOTHING.
 *
 * The API has accepted `_hp` since sign-up was written, on two endpoints no client form has ever
 * posted to — so the protection sat on the paths nobody walks, and the live sign-up route had a
 * rate limit and nothing else. This asserts BOTH halves, because either one alone is a comment
 * about a defence rather than a defence.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { useTheTrap, THE_TRAP_FIELD } from './a-field-nobody-can-see'

function Harness() {
  const trap = useTheTrap()
  return <form>{trap.field}<output>{trap.filled}</output></form>
}

const root = path.join(__dirname, '..', '..')

describe('the field itself', () => {
  it('is out of the tab order and hidden from screen readers', () => {
    render(<Harness />)
    const field = document.getElementById(THE_TRAP_FIELD) as HTMLInputElement
    expect(field).toBeTruthy()
    expect(field.tabIndex).toBe(-1)
    expect(field.closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('tells the browser not to fill it, which would lock a real person out', () => {
    render(<Harness />)
    const field = document.getElementById(THE_TRAP_FIELD) as HTMLInputElement
    expect(field.getAttribute('autocomplete')).toBe('off')
  })

  it('is off-screen rather than display:none, which some fillers skip', () => {
    render(<Harness />)
    const box = document.getElementById(THE_TRAP_FIELD)!.closest('div')!
    expect(box.style.position).toBe('absolute')
    expect(box.style.display).not.toBe('none')
  })

  it('starts empty, so a person who never touches it sends nothing', () => {
    render(<Harness />)
    expect(screen.getByRole('status', { hidden: true }).textContent ?? '').toBe('')
  })
})

describe('and it is rendered on the forms that actually create accounts', () => {
  const pages = [
    'pages/auth/AuthPage.tsx',
    'pages/enter/EntryChatPage.tsx',
  ]

  it.each(pages)('%s renders the trap and sends it', (rel) => {
    const src = fs.readFileSync(path.join(root, rel), 'utf8')
    expect(src, 'the field must be rendered').toContain('{trap.field}')
    expect(src, 'and the value must reach the API').toContain('trap.filled')
  })

  it('every entrySave call site passes it', () => {
    const calls: string[] = []
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walk(full); continue }
        if (!/\.tsx?$/.test(e.name) || e.name.includes('.spec.')) continue
        const text = fs.readFileSync(full, 'utf8')
        /* Paren-MATCHED, not regex-truncated: `entrySave(email.trim().toLowerCase(), …)` closes a
           paren inside its own first argument, so a lazy `\)` ends the match two arguments early
           and the honeypot looks absent on a call that passes it. */
        let at = text.indexOf('authApi.entrySave(')
        while (at !== -1) {
          let depth = 0
          let end = at + 'authApi.entrySave'.length
          for (; end < text.length; end++) {
            if (text[end] === '(') depth++
            else if (text[end] === ')') { depth--; if (depth === 0) break }
          }
          calls.push(`${path.relative(root, full)}: ${text.slice(at, end + 1).replace(/\s+/g, ' ')}`)
          at = text.indexOf('authApi.entrySave(', end)
        }
      }
    }
    walk(path.join(root, 'pages'))
    expect(calls.length, 'no entrySave calls found — this test has stopped testing anything').toBeGreaterThan(2)
    const missing = calls.filter((c) => !c.includes('trap.filled'))
    expect(missing, 'these sign-up calls send no honeypot').toEqual([])
  })
})

describe('and the server refuses to take the field on trust', () => {
  const api = path.join(root, '..', '..', 'api', 'src', 'modules', 'auth')

  it('the live route has a DTO, not an inline body type', () => {
    const controller = fs.readFileSync(path.join(api, 'auth.controller.ts'), 'utf8')
    const from = controller.indexOf("@Post('entry-save')")
    const block = controller.slice(from, from + 900)
    expect(block).toContain('@Body() dto: EntrySaveDto')
    expect(block).toContain('dto._hp')
  })

  it('and the DTO validates the address rather than accepting any string', () => {
    const dto = fs.readFileSync(path.join(api, 'dto', 'entry-save.dto.ts'), 'utf8')
    expect(dto).toContain('@IsEmail')
    expect(dto).toContain('_hp')
  })
})
