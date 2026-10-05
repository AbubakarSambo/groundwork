import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Page, Mark, PageTitle, Button, Note } from '@/components/gw/ui'

/**
 * NOTHING CAUGHT A RENDER ERROR, ANYWHERE. W8-63.
 *
 * The `/feed` crash - one bad read handing React an object - took the WHOLE APP to a
 * blank white page. Not the feed: everything. The rail, the ground, whatever the person
 * had open. And a search for `ErrorBoundary`, `componentDidCatch` and
 * `getDerivedStateFromError` across the entire client returned nothing, so that was the
 * behaviour for every render error in every page, not a one-off.
 *
 * A white page is worse than the dead ends in W8-62. A dead end at least tells you
 * something went wrong; this tells you the product does not exist.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not offer "try again" on the same page - the
 * state that crashed it is still there, so the same click crashes it again and the person
 * learns the button is a lie. It offers the two things that work: go somewhere else, or
 * reload from scratch.
 *
 * The error text is shown. This is a product people use at work to sort out disagreements
 * with colleagues; if it breaks, the person needs something to paste to whoever they ask
 * for help, and hiding it behind "an unexpected error occurred" helps nobody.
 *
 * WORDING, FROM THE PROTOTYPE (F4-small-states/crash.txt): the mark, "Something broke on
 * this page", "Nothing you wrote is lost; it was saved before this happened.", "Reload the
 * page" and "Go to Today". Full-page navigation, not a router `Link` - an error boundary at
 * the very top of the app is exactly the place a possibly-broken router state should not be
 * relied on.
 *
 * THE PROTOTYPE'S SECOND SENTENCE, "We've been told.", IS NOT DRAWN. It would not be true:
 * there is no client error reporting wired up (see `componentDidCatch` below) - the error
 * reaches the browser console and nowhere else. Saying "we've been told" would promise
 * somebody is already looking into it when nobody is. The API would need to receive these
 * errors (a report-a-crash endpoint) before that sentence could be shown truthfully.
 */
export class PageCrash extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The console is the only place this can go today - there is no client error
    // reporting wired up. Better here than nowhere while that is true.
    console.error('[groundwork] a page failed to render', error, info.componentStack)
  }

  render() {
    if (this.state.message === null) return this.props.children

    return (
      <Page narrow>
        <Mark />
        <PageTitle
          title="Something broke on this page"
          subtitle="Nothing you wrote is lost; it was saved before this happened."
        />
        <div className="gwui-button-row">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <Button kind="quiet" onClick={() => { window.location.href = '/today' }}>Go to Today</Button>
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace', wordBreak: 'break-word' }}>
          <Note tone="muted">{this.state.message}</Note>
        </div>
      </Page>
    )
  }
}
