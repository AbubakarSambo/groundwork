import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, beforeEach } from 'vitest'
import { isTheDesignPassOn, readTheSwitchFromTheAddress, applyTheDesignPass, theDesignPassAppliesHere, isABoardPage } from './the-design-pass'

/**
 * THE DESIGN PASS IS A SWITCH, OFF UNTIL THIS BROWSER TURNS IT ON (Hafsah, 21 November 2026), AND
 * IT NEVER REACHES A BOARD.
 */
/** A selector list split at its own commas, not at the commas inside :is(), :not() or :where(). */
function topLevelParts(sel: string): string[] {
  const parts: string[] = []
  let depth = 0
  let from = 0
  for (let i = 0; i < sel.length; i++) {
    if (sel[i] === '(') depth++
    else if (sel[i] === ')') depth--
    else if (sel[i] === ',' && depth === 0) { parts.push(sel.slice(from, i)); from = i + 1 }
  }
  parts.push(sel.slice(from))
  return parts
}

describe('the design pass switch', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('is off by default, and nothing is put on the page', () => {
    expect(isTheDesignPassOn()).toBe(false)
    applyTheDesignPass('/today')
    expect(document.documentElement.classList.contains('design-pass')).toBe(false)
  })

  it('?design=on turns it on for this browser, and ?design=off turns it off again', () => {
    readTheSwitchFromTheAddress('?design=on')
    expect(localStorage.getItem('gw-design-pass')).toBe('on')
    applyTheDesignPass('/today')
    expect(document.documentElement.classList.contains('design-pass')).toBe(true)

    readTheSwitchFromTheAddress('?design=off')
    expect(localStorage.getItem('gw-design-pass')).toBeNull()
    applyTheDesignPass('/today')
    expect(document.documentElement.classList.contains('design-pass')).toBe(false)
  })

  it('an address without ?design leaves the switch as it is', () => {
    readTheSwitchFromTheAddress('?design=on')
    readTheSwitchFromTheAddress('?tab=record')
    expect(isTheDesignPassOn()).toBe(true)
  })

  it('never applies on a board page, with the switch on', () => {
    localStorage.setItem('gw-design-pass', 'on')
    for (const board of ['/boards', '/grounds/abc/board', '/grounds/abc/person/p1', '/grounds/abc/trace', '/scenario-boards', '/scenario-boards/sales']) {
      expect(isABoardPage(board), board).toBe(true)
      expect(theDesignPassAppliesHere(board), board).toBe(false)
      applyTheDesignPass(board)
      expect(document.documentElement.classList.contains('design-pass'), board).toBe(false)
    }
    for (const page of ['/today', '/company', '/grounds/abc', '/grounds/abc/report', '/suite/leave', '/settings/suites']) {
      expect(theDesignPassAppliesHere(page), page).toBe(true)
    }
  })

  it('every rule in its stylesheet is under html.design-pass, so the switch off changes nothing', () => {
    const css = readFileSync(join(__dirname, '..', 'styles', 'the-design-pass.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...css.matchAll(/([^{}@]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter(Boolean)
    expect(selectors.length).toBeGreaterThan(20)
    for (const sel of selectors) {
      for (const part of topLevelParts(sel)) expect(part.trim(), part).toMatch(/^(:where\()?html\.design-pass\b/)
    }
  })
})
