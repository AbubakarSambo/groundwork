import { useEffect, useState } from 'react'
import { Toast } from '@/components/gw/ui'

/**
 * B-113, THE OTHER HALF. The service worker (public/sw.js) covers a full navigation that cannot
 * reach the server at all. This covers the other case: the app is already open and the connection
 * drops under it. There is no offline queue (item 19 of the screens list), so this never promises
 * anything will be sent later - it says the one thing that is true, in the same words as
 * offline.html, and goes away on its own the moment the browser says it is back.
 *
 * `navigator.onLine` for the state at mount (so a page opened while already offline shows this
 * straight away, not only after the next drop), then the `offline`/`online` window events for
 * changes while the page stays open.
 */
export function OfflineNote() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  )

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!isOffline) return null

  return <Toast>You're offline. Groundwork will open again when you're back online.</Toast>
}
