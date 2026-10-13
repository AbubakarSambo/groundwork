import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { scenarioLabel, SCENARIO_KEYS, SCENARIO_LABELS } from './scenario-catalog'
import { SITUATION_CARDS } from '@/pages/enter/EntryChatPage'
import { MyParticipation } from '@/components/gw/MyParticipation'

/**
 * REQUEST 165, PIECE B (docs/answers-from-engine.md, 6 October): the anchor check-in's own
 * situation, `HELP_TEAM_UNDERSTAND`, has a name - "Help my team understand" - but no card, because
 * nobody picks it from a situation picker; it is set only by the anchor's own path (the anchor
 * landing page's button). Every place that prints a situation's name from the one catalogue, with
 * `ground.scenario` itself as the fallback, used to print the raw key instead.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('HELP_TEAM_UNDERSTAND reads as a sentence, everywhere a situation’s name is printed', () => {
  it('scenarioLabel(), the one lookup every reader of the catalogue goes through', () => {
    expect(scenarioLabel('HELP_TEAM_UNDERSTAND')).toBe('Help my team understand')
  })

  it('is not in SCENARIO_LABELS, SCENARIO_KEYS or SITUATION_CARDS, so no picker offers it', () => {
    expect('HELP_TEAM_UNDERSTAND' in SCENARIO_LABELS).toBe(false)
    expect(SCENARIO_KEYS).not.toContain('HELP_TEAM_UNDERSTAND')
    expect(SITUATION_CARDS.some((c) => c.scenario === 'HELP_TEAM_UNDERSTAND')).toBe(false)
  })

  it('the admin "Situation" row (CheckInPeopleAndSetup.tsx) reads it through scenarioLabel(), not a raw lookup with the key as its own fallback', () => {
    const src = readFileSync(join(__dirname, '../pages/grounds/CheckInPeopleAndSetup.tsx'), 'utf8')
    const i = src.indexOf('label="Situation"')
    const around = src.slice(Math.max(0, i - 50), i + 200)
    expect(around).toMatch(/scenarioLabel\(ground\.scenario/)
    expect(around).not.toMatch(/SCENARIO_LABELS\[ground\.scenario.*\?\?\s*ground\.scenario/)
  })

  it('the participant’s own "Situation" row (MyParticipation.tsx) reads "Help my team understand", rendered', () => {
    render(
      <MyParticipation
        viewer={{ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' }}
        ground={{ label: 'An anchor check-in', scenario: 'HELP_TEAM_UNDERSTAND' }}
        myParticipant={null}
        completedCount={0}
        totalSessions={null}
      />,
    )
    expect(screen.getByText('Situation').nextSibling?.textContent).toBe('Help my team understand')
    expect(screen.queryByText('HELP_TEAM_UNDERSTAND')).toBeNull()
  })
})
