import { describe, it, expect } from 'vitest'
import { scenarioFromParam } from './CreateGroundPage'

/**
 * THE LINK THE ASSISTANT HANDS BACK HAS TO LAND SOMEWHERE.
 *
 * Saying yes to a suggestion in chat replies with `/grounds/new?scenario=DRIFT` - the stored value,
 * because the label map lives in this file and copying it into the API would be a second list to
 * keep in step. Before this, `?scenario=DRIFT` matched nothing and the person arrived at an empty
 * picker having just said yes to something specific, which reads as the yes not being heard.
 */
describe('a suggestion link actually prefills', () => {
  it('accepts the stored value the API sends', () => {
    expect(scenarioFromParam('DRIFT')).toBe('DRIFT')
    expect(scenarioFromParam('ROLE_HANDOVER')).toBe('ROLE_HANDOVER')
    expect(scenarioFromParam('drift')).toBe('DRIFT')
  })

  it('still accepts the labels older links carry', () => {
    expect(scenarioFromParam('new hire')).toBe('NEW_HIRE')
    expect(scenarioFromParam('new+hire')).toBe('NEW_HIRE')
    expect(scenarioFromParam('pulse check')).toBe('PULSE_CHECK')
  })

  it('leaves the picker alone rather than guessing at something it does not know', () => {
    expect(scenarioFromParam(null)).toBeNull()
    expect(scenarioFromParam('')).toBeNull()
    expect(scenarioFromParam('NOT_A_SCENARIO')).toBeNull()
  })
})
