/**
 * PAGE AUDIT, 24 NOVEMBER, ROW 11, AS THE LEAD READS IT: "Who checked in" listed "Juma" three times, for Juma Otieno and two people
 * called Juma Test, with no way to tell them apart. A first name alone, and the whole name where somebody else on the check-in has
 * the same first name (lib/names-that-tell-people-apart.ts).
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WhoCheckedIn } from './pictured/ThePicturedSalesBoard'

const people = [
  { id: 'p-juma', name: 'Juma Otieno' },
  { id: 'p-amani', name: 'Amani Wekesa' },
  { id: 'p-juma-2', name: 'Juma Test' },
  { id: 'p-juma-3', name: 'Juma Test' },
  { id: 'p-wairimu', name: 'Wairimu Njoroge' },
]
const b = {
  myParticipantId: 'p-wairimu',
  participants: people,
  checkInGrid: { sessions: [1, 2], rows: people.map((p) => ({ participantId: p.id, name: p.name, cells: { 1: 'done', 2: 'missed' } })) },
}

describe('who checked in, as the lead reads it', () => {
  it('tells the three people called Juma apart, and calls everybody else by their first name', () => {
    const { container } = render(<WhoCheckedIn b={b} />)
    const names = [...container.querySelectorAll('.pb-who-grid > span:not(.pb-squares)')].map((n) => n.textContent)
    expect(names).toEqual(['Juma Otieno', 'Amani', 'Juma Test', 'Juma Test', 'You'])
  })
})
