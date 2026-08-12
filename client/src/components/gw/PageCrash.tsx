import { Component, type ErrorInfo, type ReactNode } from 'react'

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
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>This page could not load</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 18 }}>
          Something went wrong drawing this screen. Nothing you have written is affected - check-ins
          and records are saved on our side, not in the page.
        </div>

        <button className="gw-btn" onClick={() => { window.location.href = '/' }}>
          Go to my grounds
        </button>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ fontSize: 12.5, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            Or reload this page
          </button>
        </div>

        <div
          style={{
            marginTop: 22, paddingTop: 14, borderTop: '0.5px solid var(--gw-border)',
            fontSize: 11, color: 'var(--gw-muted)', fontFamily: 'ui-monospace, monospace',
            wordBreak: 'break-word', textAlign: 'left',
          }}
        >
          {this.state.message}
        </div>
      </div>
    )
  }
}
