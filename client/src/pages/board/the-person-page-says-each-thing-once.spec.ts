import { describe, it, expect } from 'vitest'
import { oneOfEach } from './ThePersonPage'

describe('a day on the person page says each thing once (26 October 2026)', () => {
  it('Kevin\'s 16 October reads each sentence once, without "Kevin Omondi has reported progress."', () => {
    expect(oneOfEach([
      'Ngong Road Minimart paid for the 5 units yesterday, on Thursday, not today.',
      'Kevin Omondi has reported progress.',
      'Savannah Cafe paid the remaining KES 15,000 today. Ngong Road Minimart paid for the 5 units yesterday, on Thursday, not today.',
      'Ngong Road Minimart paid for the 5 units yesterday, on Thursday, not today.',
    ])).toEqual([
      'Ngong Road Minimart paid for the 5 units yesterday, on Thursday, not today.',
      'Savannah Cafe paid the remaining KES 15,000 today.',
    ])
  })
})
