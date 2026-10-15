import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { whatAnAdminHereCanSee } from '@/lib/what-an-admin-here-can-see'

vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn(), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: {} }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
/* The bands this spec is not about, each tested on its own. */
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

/*
 * THE CONTEXT PAGE, READ AS EACH PERSON READS IT (U.7, B2 Context).
 *
 * What the prototype's Context page says (docs/prototype/screens/B2-context/context.txt), rendered:
 * the brief with "Your words, from setup. Everyone reads this before they answer." and "Rewrite";
 * the documents as cards, each with what it is for and who reads it; and "Add a document" with "It
 * starts private to you. You choose who can read it."
 */
const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  { id: 'p-aisha', userId: 'u-aisha', partyType: 'PARTY', user: { firstName: 'Aisha', lastName: 'Otieno' } },
]
const ground = {
  id: 'g1',
  contextEnabled: true,
  brief: 'Twenty-five freezer sales this quarter, mostly butcheries and supermarkets.',
  participants: people,
  objectives: [],
  contextItems: [],
  commitments: [],
  leadContextNotes: [],
}
/* What the server sends the lead: her own price list, private, with what it is for. */
const leadsDocs = [
  { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: true, usedFor: 'Checks the product and price in each deal' },
  { id: 'd2', name: 'Q3 price list.pdf', uploadedAt: '2026-09-20T10:00:00Z', visibility: 'OWN', mine: true, usedFor: 'Checks price objections' },
]
/* What the server sends Aisha: the shared brochure, without the lead's line about what it is for. */
const aishasDocs = [
  { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false },
]

const draw = (role: 'lead' | 'admin' | 'party', viewerUserId: string, over: Record<string, any> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ContextPage ground={{ ...ground, ...over }} role={role} viewerUserId={viewerUserId} />
    </QueryClientProvider>,
  )
}
const whose = () => [...document.querySelectorAll('[data-gw-brief-whose]')].map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
const card = (id: string) => document.querySelector(`[data-gw-document="${id}"]`)?.textContent ?? ''

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, who leads it', () => {
  it('reads the brief in quotes, whose words they are, and can rewrite it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    /* U.7 review: under it, the truthful sentence about who reads it. */
    draw('lead', 'u-lead', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: true, briefChangedBy: null })
    expect(screen.getByText('“Twenty-five freezer sales this quarter, mostly butcheries and supermarkets.”')).toBeTruthy()
    expect(whose()).toEqual(['Your words, from setup. This is what everyone in this check-in reads before they answer.'])
    expect(screen.getByText('Rewrite')).toBeTruthy()
  })

  /* U.7 review: the lead was told "Everyone reads this" over her words while her people read another text. */
  it('reads what her people read, where Groundwork wrote it from her words, and her own words below it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead', { briefAsEveryoneReadsIt: 'This check-in follows the sales team this quarter.', briefIsTheLeadsOwnWords: false, briefChangedBy: null })
    expect(screen.getByText('“This check-in follows the sales team this quarter.”')).toBeTruthy()
    expect(whose()).toEqual(['Groundwork wrote this from your words. This is what everyone in this check-in reads before they answer.'])
    expect(screen.getByText('What you wrote')).toBeTruthy()
    expect(document.body.textContent).toContain('Twenty-five freezer sales this quarter, mostly butcheries and supermarkets.')
    expect(document.body.textContent).not.toContain('Your words, from setup')
  })

  it('reads who changed it, where an admin did', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: false, briefChangedBy: { firstName: 'Otieno', isYou: false, isTheLead: false } })
    expect(whose()).toEqual(['Otieno changed this. This is what everyone in this check-in reads before they answer.'])
    expect(document.body.textContent).not.toContain('Your words')
  })

  it('saves with "Save", and is told who reads it now', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    ;(groundsApi as any).update = vi.fn().mockResolvedValue({})
    draw('lead', 'u-lead', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: true })
    fireEvent.click(screen.getByText('Rewrite'))
    fireEvent.change(document.querySelector('textarea') as HTMLTextAreaElement, { target: { value: 'Twenty-five sales this quarter.' } })
    fireEvent.click(screen.getByText('Save'))
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Saved. Everyone in this check-in now reads this.'))
    expect(document.body.textContent).not.toContain('Everyone here reads this')
  })

  it('reads each document with what it is for, shared ones first, and Add a document last', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead')
    await screen.findByText('Q3 price list.pdf')
    expect(card('d1')).toContain('Checks the product and price in each deal')
    expect(card('d2')).toContain('Checks price objections')
    expect(screen.getByText('Add a document')).toBeTruthy()
    expect(screen.getByText('It starts private to you. You choose who can read it.')).toBeTruthy()
    const order = [...document.querySelectorAll('[data-gw-document]')].map((n) => n.getAttribute('data-gw-document'))
    expect(order).toEqual(['d1', 'd2'])
  })
})

describe('adding a document from the page', () => {
  it('uploads the file privately, then shows what was read and asks who can read it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    ;(documentsApi.upload as any).mockResolvedValue({ id: 'd3', name: 'Sales playbook.docx', visibility: 'OWN', mine: true })
    draw('lead', 'u-lead')
    const file = new File(['x'], 'Sales playbook.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    fireEvent.change(document.getElementById('ga-doc-upload') as HTMLInputElement, { target: { files: [file] } })
    expect(await screen.findByText('Add it to Context and resources')).toBeTruthy()
    expect(documentsApi.upload).toHaveBeenCalledWith('g1', file, false, undefined)
    expect(screen.getByText('Who can read it')).toBeTruthy()
  })
})

describe('Aisha, who takes part', () => {
  it('reads the brief as Wairimu’s words, and cannot rewrite it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha', { briefIsTheLeadsOwnWords: true })
    expect(whose()).toEqual(['Wairimu’s words, from setup. This is what everyone in this check-in reads before they answer.'])
    expect(screen.queryByText(/Your words, from setup/)).toBeNull()
    expect(screen.queryByText('Rewrite')).toBeNull()
  })

  it('reads no claim about whose words it is, where they are not Wairimu’s own', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha', { brief: 'This check-in follows the sales team this quarter.', briefIsTheLeadsOwnWords: false })
    expect(screen.getByText('“This check-in follows the sales team this quarter.”')).toBeTruthy()
    expect(whose()).toEqual(['This is what everyone in this check-in reads before they answer.'])
  })

  it('reads the shared brochure and nothing about what Wairimu said it is for', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha')
    await screen.findByText('Freezer range brochure.pdf')
    expect(document.body.textContent).not.toContain('Checks the product and price')
    expect(document.body.textContent).not.toContain('Q3 price list.pdf')
    /* Not hers, so not hers to move or delete. */
    expect(card('d1')).not.toContain('Delete')
  })
})

describe('an admin reading a check-in somebody else leads', () => {
  /* Hafsah, 1 October: the brief follows the same rule as every other setup change. Only the lead
     rewrites it, unless the lead has left the organisation; then an admin may (request 104). */
  it('reads the brief as the lead’s words, and is not offered to rewrite it while the lead is here', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('admin', 'u-admin', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: true, briefChangedBy: null })
    expect(whose()).toEqual(['Wairimu’s words, from setup. This is what everyone in this check-in reads before they answer.'])
    expect(screen.queryByText('Rewrite')).toBeNull()
  })

  it('and may rewrite it once the lead has left, when the server says so', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('admin', 'u-admin', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: true, briefChangedBy: null, mayChangeSetup: true })
    expect(screen.getByText('Rewrite')).toBeTruthy()
  })

  it('and the server is believed both ways: told no, even the lead is not offered it', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: true, briefChangedBy: null, mayChangeSetup: false })
    expect(screen.queryByText('Rewrite')).toBeNull()
  })

  it('and reads "You changed this." once he has', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('admin', 'u-admin', { briefAsEveryoneReadsIt: ground.brief, briefIsTheLeadsOwnWords: false, briefChangedBy: { firstName: 'Otieno', isYou: true, isTheLead: false } })
    expect(whose()).toEqual(['You changed this. This is what everyone in this check-in reads before they answer.'])
  })
})

/*
 * U.7 REVIEW: AN ADMIN WHO IS NOT IN THE CHECK-IN IS NOT SENT TO OPEN ITS DOCUMENTS. Otieno read the
 * toast "That one is not yours to open" twice, under a banner saying he could see everything. The
 * server still refuses him; the page does not ask, and says why in the documents band.
 */
describe('Otieno, an admin who is not in the check-in, and its documents', () => {
  it('reads one plain sentence in the documents band, no toast, and the page never asks for them', async () => {
    ;(documentsApi.list as any).mockRejectedValue({ response: { status: 403 } })
    draw('admin', 'u-otieno')
    expect(screen.getByText('Documents here are shared by the people in this check-in, so you cannot open them from here.')).toBeTruthy()
    expect(documentsApi.list).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(screen.queryByText('Add a document')).toBeNull()
  })

  it('and Aisha, who is in it, still reads the documents and no such sentence', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha')
    await screen.findByText('Freezer range brochure.pdf')
    expect(screen.queryByText(/so you cannot open them from here/)).toBeNull()
  })

  it('a refusal that still comes is said in the band, not as a toast', async () => {
    ;(documentsApi.list as any).mockRejectedValue({ response: { status: 403 } })
    draw('party', 'u-aisha')
    expect(await screen.findByText('Documents here are shared by the people in this check-in, so you cannot open them from here.')).toBeTruthy()
    expect(documentsApi.list).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('the banner an admin reads over a check-in somebody else leads', () => {
  it('says what Otieno can and cannot see, not that he can see everything', () => {
    expect(whatAnAdminHereCanSee({ leadName: 'Wanjiru Mwangi', leadFirstName: 'Wanjiru', inIt: false })).toBe(
      'You can read this check-in’s board and reports. Wanjiru Mwangi runs it. You cannot see Wanjiru’s private notes, anyone’s share of a target, or the documents people add here. Sharing the report and ending the check-in are Wanjiru’s to decide, and nothing you do here is hidden from Wanjiru.',
    )
    expect(whatAnAdminHereCanSee({ leadName: 'Wanjiru Mwangi', leadFirstName: 'Wanjiru', inIt: true })).toBe(
      'You can read this check-in’s board and reports. Wanjiru Mwangi runs it. You cannot see Wanjiru’s private notes, or anyone else’s share of a target. Sharing the report and ending the check-in are Wanjiru’s to decide, and nothing you do here is hidden from Wanjiru.',
    )
  })
})

/*
 * U.7 REVIEW: THE DOCUMENT CARD IS THE PROTOTYPE'S. The file, what it is for, and who can read it
 * ("Everyone" or "Only you"); what Groundwork took from it is folded under the card, not printed on
 * its face in pieces joined with colons.
 */
describe('a document card, as each reader sees it', () => {
  const read = {
    assessment: { suggests: ['It sets the lowest price for each freezer.'], willDo: [] },
    theContextWeHave: 'Here is the context we have from Q3 price list.pdf.\n\nFor the whole check-in:\n- Lowest price for the 600L: 76,000',
    holds: { forEverybody: [{ what: 'Lowest price for the 600L', target: 76000 }], forOnePerson: [], dates: [], unmatched: [] },
  }
  const face = (id: string) => {
    const el = document.querySelector(`[data-gw-document="${id}"]`) as HTMLElement
    const fold = el.querySelector('[data-gw-document-took]')
    return (el.textContent ?? '').replace(fold?.textContent ?? '', '')
  }

  it('Wairimu reads the name, what it is for, and "Only you", with what was taken folded away', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ ...leadsDocs[1], ...read }])
    draw('lead', 'u-lead')
    await screen.findByText('Q3 price list.pdf')
    expect(face('d2')).toContain('Q3 price list.pdf')
    expect(face('d2')).toContain('Checks price objections')
    expect((screen.getByLabelText('Who can read Q3 price list.pdf') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Only you')
    expect(face('d2')).not.toMatch(/Read from it|For the whole check-in|Lowest price/)
    expect(screen.getByText('What Groundwork took from it')).toBeTruthy()
    expect(card('d2')).toContain('It sets the lowest price for each freezer.')
    expect(document.body.textContent).not.toContain('Only me')
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 3: A <p> NESTED INSIDE A <p>, found live on a participant's Context
   * tab (console error, "<p> cannot contain a nested <p>"). "What Groundwork took from it" put a
   * `Note` (which renders its own <p>) inside this same paragraph when the document held something
   * owed to one person or to everybody - fixed by drawing the wrapper as a <div>.
   */
  it('never nests a <p> inside a <p>, even when the document holds something owed to somebody', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ ...leadsDocs[1], ...read }])
    draw('lead', 'u-lead')
    await screen.findByText('What Groundwork took from it')
    const fold = document.querySelector('[data-gw-document-took]') as HTMLElement
    expect(fold.querySelectorAll('p p').length).toBe(0)
    expect(fold.textContent).toContain('These are on the board and in the report, against the people who hold them.')
  })

  it('and the note on her first document says each choice in a full sentence', async () => {
    ;(documentsApi.list as any).mockResolvedValue([leadsDocs[1]])
    draw('lead', 'u-lead')
    await screen.findByText('Q3 price list.pdf')
    expect(document.body.textContent).toContain('Everything you add starts private to you. If you choose Everyone, everyone in this check-in can read it. If you choose Only you, nobody else can open it. If you choose Whoever runs this check-in, the person running it can read it, so it stays readable if someone else takes the check-in over from you.')
  })

  it('Aisha reads her own file as "Only you", with a button to share it', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ id: 'd5', name: 'My visits.pdf', uploadedAt: '2026-09-22T10:00:00Z', visibility: 'OWN', mine: true }])
    draw('party', 'u-aisha')
    await screen.findByText('My visits.pdf')
    expect(face('d5')).toContain('Only you')
    expect(document.body.textContent).toContain('If you choose Only you, nobody else can open it.')
    expect(document.body.textContent).not.toContain('Whoever runs this check-in')
  })
})

/* U.7 review: the bands' lines are full sentences, said to whoever is reading. */
describe('the lines under each band', () => {
  const withRecord = {
    contextItems: [{ id: 'l1', kind: 'WAY_OF_WORKING', text: 'Log every visit the same day.', audience: 'EVERYONE' }],
    commitments: [{ id: 'k1', participantId: 'p-aisha', text: 'Visit Green Mart on Friday.', explicit: false, status: 'UNKNOWN' }],
  }
  it('Wairimu, who leads it', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead', withRecord)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Open a card to see that person’s numbers, to-dos and what they said they would show.')
    expect(text).toContain('Nobody is marked as having done these. The check-ins ask about them.')
    expect(text).toContain('What you put here guides every check-in. You can change any line in it.')
    expect(text).toContain('These are the rules, as you wrote them.')
    expect(text).toContain('These are your words, not theirs.')
    expect(text).not.toMatch(/·|what they owe a look at|a click/)
  })
  it('Aisha, who takes part', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('party', 'u-aisha', withRecord)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Your card is open. Open anyone else’s card to see what is on it.')
    expect(text).toContain('What Wairimu put here guides the check-ins. It is never quoted as something anyone found.')
    expect(text).toContain('These are the rules, as Wairimu wrote them.')
    expect(text).toContain('These are Wairimu’s words, not yours.')
    expect(text).not.toMatch(/your words, not theirs|the lead’s framing|·/)
  })
  it('an admin who is not in it', async () => {
    draw('admin', 'u-otieno', withRecord)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Open a card to see that person’s numbers, to-dos and what they said they would show.')
    expect(text).toContain('These are Wairimu’s words, not theirs.')
    expect(text).not.toContain('These are your words')
  })
})

/*
 * U.7 RE-CHECK: "WHAT YOU WROTE" IS WHAT SHE WROTE. The fold held the brief setup put together from
 * her answers ("It matters now because whether to confirm him."). Her own words from setup are sent
 * to her alone, and the brief is headed for what it is.
 */
describe('Juma’s check-in: what the lead wrote, and what Groundwork put together', () => {
  const HER_WORDS = 'Juma joined our warehouse team in January and his probation ends in March. I need to decide whether to confirm him. He is often late with the stock counts.'
  const PUT_TOGETHER = 'Juma’s performance during his probation with the warehouse team needs review. When asked who is part of this, the answer was taken to mean this. Juma and the warehouse team. When asked why this matters now, the answer was taken to mean this. Whether to confirm him. When asked what the questions should focus on, the answer was taken to mean this. He is often late with the stock counts.'
  const TOLD = 'This check-in looks at how Juma’s first months in the warehouse have gone.'
  const juma = { brief: PUT_TOGETHER, briefAsEveryoneReadsIt: TOLD, briefIsTheLeadsOwnWords: false, briefPutTogetherBySetup: true, briefChangedBy: null }
  const folds = () => [...document.querySelectorAll('[data-gw-brief-fold]')].map((d) => ({
    title: d.querySelector('summary')?.textContent,
    text: (d.textContent ?? '').replace(d.querySelector('summary')?.textContent ?? '', ''),
  }))

  it('Wairimu reads what everyone reads, her own words under "What you wrote", and the rest named for what it is', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead', { ...juma, leadsOwnSetupWords: HER_WORDS })
    expect(screen.getByText(`“${TOLD}”`)).toBeTruthy()
    expect(whose()).toEqual(['Groundwork wrote this from your words. This is what everyone in this check-in reads before they answer.'])
    /* U.7 third review: her real words, and not a second version of them beside it. */
    expect(folds()).toEqual([{ title: 'What you wrote', text: HER_WORDS }])
    expect(document.body.textContent).not.toContain('taken to mean')
  })

  /* U.7 fourth check: the text setup put together is shown to nobody, on any check-in. */
  it('on an older check-in, where her own words were not kept, she reads what everyone reads and no put-together text', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead', juma)
    expect(whose()).toEqual(['Groundwork wrote this from your words. This is what everyone in this check-in reads before they answer.'])
    expect(folds()).toEqual([])
    expect(document.body.textContent).not.toMatch(/taken to mean|put together/)
  })

  it('an admin reads what everyone reads, no setup words of hers and no put-together text, and rewrites from what everyone reads', async () => {
    /* Once the lead has left (Hafsah, 1 October): the server says so in mayChangeSetup. */
    draw('admin', 'u-otieno', { ...juma, mayChangeSetup: true })
    expect(folds()).toEqual([])
    expect(whose()).toEqual(['Groundwork wrote this from Wairimu’s words. This is what everyone in this check-in reads before they answer.'])
    expect(document.body.textContent).not.toMatch(/taken to mean|put together|Juma joined our warehouse/)
    fireEvent.click(screen.getByText('Rewrite'))
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe(TOLD)
  })

  it('an admin who rewrote it, where Groundwork wrote what everyone reads from his words, is told so', async () => {
    draw('admin', 'u-otieno', { ...juma, brief: 'Decide by March whether Juma is confirmed.', briefChangedBy: { firstName: 'Otieno', isYou: true, isTheLead: false } })
    expect(whose()).toEqual(['Groundwork wrote this from your words. This is what everyone in this check-in reads before they answer.'])
    expect(folds()).toEqual([{ title: 'What you wrote', text: 'Decide by March whether Juma is confirmed.' }])
  })

  it('and Wairimu, after he did, reads his name on both', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead', { ...juma, leadsOwnSetupWords: HER_WORDS, brief: 'Decide by March whether Juma is confirmed.', briefChangedBy: { firstName: 'Otieno', isYou: false, isTheLead: false } })
    expect(whose()).toEqual(['Groundwork wrote this from Otieno’s words. This is what everyone in this check-in reads before they answer.'])
    expect(folds()).toEqual([{ title: 'What Otieno wrote', text: 'Decide by March whether Juma is confirmed.' }])
  })

  it('Aisha reads only what everyone reads, and no fold', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha', { brief: TOLD, briefIsTheLeadsOwnWords: false })
    expect(whose()).toEqual(['This is what everyone in this check-in reads before they answer.'])
    expect(folds()).toEqual([])
  })
})

/*
 * B-151. The empty-brief panel spoke of the lead in the third person even when the lead herself
 * was the one reading it ("The lead can write a few lines...") - as though somebody else was being
 * described. Everyone else still needs the third person, since it names who they should expect
 * this from.
 */
describe('B-151: the empty-brief panel speaks to the lead directly, and about her to everyone else', () => {
  it('tells the lead "you" when she is the one reading it, with no brief written yet', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead', { brief: null, briefAsEveryoneReadsIt: null })
    expect(screen.getByText('You have not said what this check-in is for yet. Write a few lines, and everyone reads them before they answer.')).toBeTruthy()
    expect(screen.queryByText(/The lead can write a few lines/)).toBeNull()
  })

  it('still speaks of the lead in the third person to a party', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha', { brief: null, briefAsEveryoneReadsIt: null })
    expect(screen.getByText(/Nobody has said what this check-in is for yet\. The lead can write a few lines/)).toBeTruthy()
  })
})

