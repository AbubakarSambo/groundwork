import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EquipmentPage } from './EquipmentPage'
import { useAuthStore } from '@/stores/auth'
import type { EquipmentBoard } from '@/api/suites'

/**
 * EQUIPMENT (E10, #/suite/equipment), AS AN ADMIN SEES IT, AND WHAT EVERYBODY ELSE READS. Who is served
 * what is tested on the server (api/src/modules/suites/the-equipment-as-each-reader-reads-it.spec.ts).
 * Here: the prototype's words (suite-equipment.txt), word for word, adding and changing an item, and
 * no label.
 */
vi.mock('@/api/suites', () => ({ equipmentApi: { get: vi.fn(), add: vi.fn(), change: vi.fn() } }))
import { equipmentApi } from '@/api/suites'

const PEOPLE = [{ id: 'p-faith', name: 'Faith Kerubo' }, { id: 'p-kamau', name: 'Kamau Njenga' }, { id: 'p-kwame', name: 'Kwame Boateng' }, { id: 'p-miriam', name: 'Miriam Wanjiku' }]
const BOARD: EquipmentBoard = {
  items: [
    { id: 'e-7', name: 'Laptop 07', holderId: 'p-faith', holder: 'Faith Kerubo', condition: 'New. Given out on Monday.' },
    { id: 'e-12', name: 'Phone 12', holderId: 'p-kwame', holder: 'Kwame Boateng', condition: 'Working.' },
    { id: 'e-f', name: 'Demo freezer, 300 litres', holderId: 'p-miriam', holder: 'Miriam Wanjiku', condition: 'At Westgate Deli for a trial.' },
    { id: 'e-3', name: 'Laptop 03', holderId: 'p-kamau', holder: 'Kamau Njenga', condition: 'Broken screen.' },
    { id: 'e-9', name: 'Spare phone', holderId: null, holder: null, condition: null },
  ],
  people: PEOPLE,
}
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(user: any, served: EquipmentBoard | Error) {
  if (served instanceof Error) (equipmentApi.get as any).mockRejectedValue(served)
  else (equipmentApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/equipment']}><EquipmentPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const rows = () => [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].slice(0, 3).map(c => c.textContent))

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(GRACE, BOARD)
    expect(await screen.findByRole('table')).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Equipment')
    expect(screen.getByRole('heading', { level: 1, name: 'Equipment' })).toBeInTheDocument()
    expect(screen.getByText('See who has each laptop, phone and demo freezer, and what needs fixing. People update it by telling Groundwork.')).toBeInTheDocument()
  })

  it('reads each item, who has it and how it is, as the prototype writes them', async () => {
    open(GRACE, BOARD)
    await screen.findByRole('table')
    expect([...document.querySelectorAll('thead th')].slice(0, 3).map(th => th.textContent)).toEqual(['Item', 'Who has it', 'How it is'])
    expect(rows()).toEqual([
      ['Laptop 07', 'Faith Kerubo', 'New. Given out on Monday.'],
      ['Phone 12', 'Kwame Boateng', 'Working.'],
      ['Demo freezer, 300 litres', 'Miriam Wanjiku', 'At Westgate Deli for a trial.'],
      ['Laptop 03', 'Kamau Njenga', 'Broken screen.'],
      ['Spare phone', 'Nobody', ''],
    ])
    expect(screen.queryByText('Book a repair')).toBeNull()
    expect(screen.queryByText('How people use it')).toBeNull()
  })

  it('gives Laptop 03 to Faith and says it is fixed', async () => {
    (equipmentApi.change as any).mockResolvedValue(BOARD)
    open(GRACE, BOARD)
    fireEvent.click(await screen.findByRole('button', { name: 'Change Laptop 03' }))
    fireEvent.change(screen.getByLabelText('Who has Laptop 03'), { target: { value: 'p-faith' } })
    fireEvent.change(screen.getByLabelText('How Laptop 03 is'), { target: { value: 'Fixed.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(equipmentApi.change).toHaveBeenCalledWith('e-3', { holderId: 'p-faith', condition: 'Fixed.' }))
  })

  it('adds an item, and reads the server’s words when it is refused', async () => {
    (equipmentApi.add as any).mockRejectedValue(refusal(400, 'There is already an item with that name.'))
    open(GRACE, BOARD)
    const form = within(await screen.findByRole('region', { name: 'Add an item' }))
    fireEvent.change(form.getByLabelText('Item'), { target: { value: 'Laptop 03' } })
    fireEvent.change(form.getByLabelText('Who has it'), { target: { value: 'p-kamau' } })
    fireEvent.click(form.getByRole('button', { name: 'Add it' }))
    await waitFor(() => expect(equipmentApi.add).toHaveBeenCalledWith({ name: 'Laptop 03', holderId: 'p-kamau', condition: null }))
    expect(await form.findByRole('alert')).toHaveTextContent('There is already an item with that name.')
  })

  it('reads a plain sentence when nothing is listed, and can add the first item', async () => {
    open(GRACE, { items: [], people: PEOPLE })
    expect(await screen.findByText('No equipment is listed yet.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Add an item' })).toBeInTheDocument()
  })

  it('no label on anybody', async () => {
    open(GRACE, BOARD)
    await screen.findByRole('table')
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('everybody else', () => {
  it('Wairimu, a lead, reads the server’s refusal, and no way to add anything', async () => {
    open(WAIRIMU, refusal(403, 'Only an admin can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin can open this board.')
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Add an item' })).toBeNull()
  })

  it('while the suite is off, the server says so', async () => {
    open(GRACE, refusal(404, 'The equipment suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The equipment suite is not switched on.')
  })
})
