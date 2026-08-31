import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A RELATIVE LINK TO THE API GOES TO THE APP, AND THE APP DRAWS "NOTHING'S HERE".
 *
 * The Connect page's only link was `href="/api/docs"`. The app and the API are different origins in
 * production, so that resolved against the app, hit a router with no such route, and rendered the
 * not-found page. Reported as: clicking through to the API key "brings you to an error or nothing's
 * here page". Swagger worked the whole time - nothing pointed at it.
 *
 * IT CANNOT FAIL IN DEVELOPMENT, which is why it survived. Locally `VITE_API_URL` is unset and Vite
 * proxies `/api` to the API, so the relative path is correct. Only a deployed build breaks, and only
 * for whoever clicks it.
 */
const SRC = join(__dirname, '..')

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { tsxFiles(full, out); continue }
    if (/\.(ts|tsx)$/.test(entry) && !/\.spec\./.test(entry)) out.push(full)
  }
  return out
}

describe('a link to the api is not a link to the app', () => {
  it('never hardcodes an api path as a relative href', () => {
    const offenders: string[] = []
    for (const file of tsxFiles(SRC)) {
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      /*
       * An href or a window.location assignment whose value STARTS with /api - that is the app's
       * origin. Anything built from API_ORIGIN is fine, and so is apiClient, which has a baseURL.
       */
      for (const m of src.matchAll(/(?:href|window\.location(?:\.href)?\s*=)\s*[="]{1,2}\s*(['"`])(\/api\/[^'"`]*)\1/g)) {
        offenders.push(`${file.replace(SRC, 'src')}: ${m[2]}`)
      }
    }
    expect(offenders, [
      'This resolves against the app, not the API, so it lands on the router and draws not-found.',
      'It cannot fail locally, where Vite proxies /api - only a deployed build breaks.',
      'Build it from API_ORIGIN in lib/where-the-api-lives.ts instead.',
    ].join('\n')).toEqual([])
  })

  it('and the reference link points somewhere the api actually serves', async () => {
    const { API_DOCS_URL } = await import('./where-the-api-lives')
    /* Swagger is mounted at /api/docs by the API's own bootstrap. */
    expect(API_DOCS_URL.endsWith('/api/docs')).toBe(true)
  })

  it('has one definition of where the api lives, not one per file', () => {
    /* It was worked out separately in three files, which is how a fourth got it wrong. */
    const offenders = tsxFiles(SRC)
      .filter(f => !f.endsWith('where-the-api-lives.ts'))
      .filter(f => /const API_ORIGIN\s*=/.test(readFileSync(f, 'utf8')))
      .map(f => f.replace(SRC, 'src'))
    expect(offenders).toEqual([])
  })
})
