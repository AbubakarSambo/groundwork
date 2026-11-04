import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StopMailPage } from './StopMailPage'
import { useAuthStore } from '@/stores/auth'

/**
 * THE UNSUBSCRIBE LINK ASKS BEFORE IT STOPS ANYTHING (decision 109), AND READS AN OLDER API TOO.
 *
 * Found on 7 October: a client running against an API from before decision 109 got `says` as one
 * string and no question, and the page broke into "That did not go through". It reads both shapes.
 */
function open(json: unknown, status = 200) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status, json: async () => json } as any)
  return render(
    <MemoryRouter initialEntries={['/unsubscribe/t1']}>
      <Routes><Route path="/unsubscribe/:token" element={<StopMailPage which="unsubscribe" />} /></Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('the unsubscribe page', () => {
  it('asks the question, with its served paragraphs and both buttons', async () => {
    open({ success: true, data: {
      title: 'Are you sure you want to stop Groundwork insight emails?',
      says: ['You may miss timely insights.', 'Emails you ask for will still reach you.'],
      keepLabel: 'Keep email insights', stopLabel: 'Turn off email insights', turnBackOnLabel: 'Turn email insights back on', stopped: false,
    } })
    expect(await screen.findByText('Are you sure you want to stop Groundwork insight emails?')).toBeTruthy()
    expect(screen.getByText(/You may miss timely insights\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn off email insights' })).toBeTruthy()
  })

  it('reads an older API that answers one sentence and no question', async () => {
    open({ success: true, data: { ok: true, already: true, says: 'That link is not one I recognise, which usually means these emails have already stopped.' } })
    expect(await screen.findByText(/That link is not one I recognise/)).toBeTruthy()
    expect(screen.queryByText('That did not go through')).toBeNull()
  })

  /*
   * UPDATED FOR B-131: an unknown token used to leave the page headed by whatever the server's own
   * `title` said (or "Done." when it sent none), with nothing to press but the logo - the same
   * dead end the deep page audit found on its sibling, Stop reminders. It now says plainly that
   * the link was not recognised, and offers a way to Settings.
   *
   * UPDATED FOR B-209: this used to overwrite the server's own title ("That link is not one we
   * recognise", the-ways-to-stop-mail.ts's NOT_A_LINK_WE_KNOW_TITLE) with this page's own borrowed
   * sentence ("We could not find those reminders", copied from StopRemindersPage) and repeated the
   * server's claim that replying to one of our emails will stop them by hand - untrue, since mail
   * from Groundwork always comes from a no-reply address. The heading now reads the server's own
   * title, and the false reply claim is gone.
   */
  it('an unknown link says plainly that the link was not recognised, with a way to Settings, never "broken"', async () => {
    open({ success: true, data: { known: false, stopped: true, title: 'That link is not one I recognise', says: ['Nothing has been changed. If emails you do not want are still arriving, reply to one and I will stop them by hand.'] } })
    expect(await screen.findByRole('heading', { name: 'That link is not one I recognise' })).toBeTruthy()
    expect(screen.queryByText(/reply to one/i)).toBeNull()
    expect(screen.getByText('Nothing has been changed.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in to change your emails in Settings' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/broken/i)
  })

  /*
   * B-209 (review round 2): SOMEBODY ALREADY SIGNED IN IS NOT TOLD TO SIGN IN TO REACH SETTINGS.
   */
  it('an unknown link, signed in, offers Settings without "sign in"', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    open({ success: true, data: { known: false, stopped: true, title: 'That link is not one I recognise', says: ['Nothing has been changed.'] } })
    await screen.findByRole('heading', { name: 'That link is not one I recognise' })
    expect(screen.getByRole('link', { name: 'Change your emails in Settings' })).toBeTruthy()
    expect(screen.queryByText(/Sign in to change/i)).toBeNull()
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any)
  })

  /* B-209: an older server that sends `known: false` with no `title` at all still gets a true
     heading - the server's own current wording for this exact case, not this page's borrowed one. */
  it('falls back to the server\'s own current wording when an older response sends no title', async () => {
    open({ success: true, data: { known: false, stopped: true, says: ['Nothing has been changed.'] } })
    expect(await screen.findByRole('heading', { name: 'That link is not one I recognise' })).toBeTruthy()
  })

  it('pressing "Turn off" posts to the unsubscribe link and then shows the served answer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true, data: {
        title: 'Are you sure you want to stop Groundwork insight emails?',
        says: ['You may miss timely insights.'],
        keepLabel: 'Keep email insights', stopLabel: 'Turn off email insights', turnBackOnLabel: 'Turn email insights back on', stopped: false,
      } }),
    } as any)
    render(
      <MemoryRouter initialEntries={['/unsubscribe/t1']}>
        <Routes><Route path="/unsubscribe/:token" element={<StopMailPage which="unsubscribe" />} /></Routes>
      </MemoryRouter>,
    )
    const stopButton = await screen.findByRole('button', { name: 'Turn off email insights' })
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true, data: { says: 'No more insight emails are going to you.' } }),
    } as any)
    fireEvent.click(stopButton)
    expect(await screen.findByText('No more insight emails are going to you.')).toBeTruthy()
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.stringContaining('/unsubscribe/t1'), { method: 'POST' })
  })

  it('turning back on posts to /undo and shows the served answer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true, data: {
        title: 'Are you sure you want to stop Groundwork insight emails?',
        says: ['You already turned these off.'],
        keepLabel: 'Keep email insights', stopLabel: 'Turn off email insights', turnBackOnLabel: 'Turn email insights back on', stopped: true,
      } }),
    } as any)
    render(
      <MemoryRouter initialEntries={['/unsubscribe/t1']}>
        <Routes><Route path="/unsubscribe/:token" element={<StopMailPage which="unsubscribe" />} /></Routes>
      </MemoryRouter>,
    )
    const onButton = await screen.findByRole('button', { name: 'Turn email insights back on' })
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true, data: { says: 'Insight emails are back on.' } }),
    } as any)
    fireEvent.click(onButton)
    expect(await screen.findByText('Insight emails are back on.')).toBeTruthy()
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.stringContaining('/unsubscribe/t1/undo'), { method: 'POST' })
  })
})
