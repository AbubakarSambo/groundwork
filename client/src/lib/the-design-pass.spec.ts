import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, beforeEach } from 'vitest'
import { isTheDesignPassOn, readTheSwitchFromTheAddress, applyTheDesignPass, theDesignPassAppliesHere } from './the-design-pass'

/**
 * THE DESIGN PASS IS A SWITCH, OFF UNTIL THIS BROWSER TURNS IT ON (Hafsah, 21 November 2026). Since
 * the afternoon it reaches the boards too, so the boards can be brought to the prototype behind it.
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

  it('reaches the boards when it is on, and nothing when it is off', () => {
    const pages = ['/boards', '/grounds/abc/board', '/grounds/abc/person/p1', '/grounds/abc/trace', '/scenario-boards', '/today', '/company']
    for (const page of pages) {
      expect(theDesignPassAppliesHere(page), page).toBe(false)
      applyTheDesignPass(page)
      expect(document.documentElement.classList.contains('design-pass'), page).toBe(false)
    }
    localStorage.setItem('gw-design-pass', 'on')
    for (const page of pages) {
      expect(theDesignPassAppliesHere(page), page).toBe(true)
      applyTheDesignPass(page)
      expect(document.documentElement.classList.contains('design-pass'), page).toBe(true)
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
