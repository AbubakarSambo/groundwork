import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { billingApi } from '@/api/billing'

/**
 * REVIEW ROUND 3, ITEM 2: ONE OPENING FLOW, USED BY BOTH PAGES THAT CAN OPEN A SESSION.
 *
 * `GroundParticipantPage.tsx` owned the only copy of this - the paywall-aware "open" call
 * (`POST /check-ins/:id/open`), and the tiered paywall overlay behind it (a free extension, an
 * organisation upgrade, an access code). The lead's Check-in tab on `/grounds/:id` could not open
 * a session itself, so it sent her to `/grounds/:id/p?open=1` to borrow that flow - a second page,
 * with its own header and its own "Start my check-in", for what should have been one conversation.
 *
 * Pulled out here so both pages call the same mutation and render the same modal, and neither one
 * needs the other's page to open a session. Nothing about the flow itself changed: same endpoint,
 * same paywall tiers, same access-code redemption.
 */
export function useOpenSession(groundId: string | undefined) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showPaywall, setShowPaywall] = useState(false)
  const paywallOpener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (showPaywall) paywallOpener.current = document.activeElement as HTMLElement | null
    else paywallOpener.current?.focus?.()
  }, [showPaywall])
  const [paywallFreeExtensionAvailable, setPaywallFreeExtensionAvailable] = useState(false)
  const [paywallCode, setPaywallCode] = useState('')
  const [paywallCodeMsg, setPaywallCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  /**
   * B-211 (REVIEW 4): A PLAIN ASYNC CALL, NOT `useMutation`, BECAUSE THE SESSION THAT OPENS IT
   * IS RUN FROM A SILENT EFFECT ON MOUNT - and that is exactly the moment React's development
   * mode (StrictMode) runs every effect twice: mount, clean up, mount again, all before this
   * call has a chance to answer.
   *
   * `useMutation`'s own subscription to its result follows that same mount/clean-up/mount
   * cycle (`useSyncExternalStore` underneath). Read live in this bed, 11 October, as Dov and
   * Amani: the open effect ran once (confirmed from the mutation cache and the network tab - one
   * `POST /check-ins/:id/open`, one 503), but the StrictMode clean-up that followed unsubscribed
   * this hook's observer from that still-running call before the second mount re-subscribed it -
   * so when the 503 came back and the call genuinely finished, nothing was listening any more.
   * The page was left on "Opening your check-in…" with the answer sitting, unread, in the
   * mutation cache for ever: the same hang request 174 first named, back for a different reason.
   *
   * Ordinary component state has no such subscription to lose - a `setState` call always reaches
   * this render, StrictMode or not - so the probe itself, and whether it is pending, failed, or
   * done, now lives in plain `useState`, read directly by `open()`'s caller. The guard that keeps
   * a silent auto-open from firing twice is unchanged and lives in the calling page, exactly as
   * before; this only changes how the answer gets back to the screen.
   */
  const [probeStatus, setProbeStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [probeErrorMessage, setProbeErrorMessage] = useState<string | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const settleProbe = (outcome: { blocked: boolean; checkIn: any; freeExtensionAvailable?: boolean }) => {
    const { blocked, checkIn, freeExtensionAvailable } = outcome
    /*
     * A SILENT AUTO-OPEN MUST NOT CLOBBER WHAT THE READER IS DOING BY THE TIME IT RESOLVES.
     *
     * GroundAdminPage.tsx fires this the moment a lead lands on her Check-in tab, before she has
     * read anything - and the probe (POST /check-ins/:id/open) can take long enough that she has
     * already moved to another tab and started something there by the time it answers. Read live,
     * 9 October: Wairimu Njoroge moved to Context and resources and sent her first message to the
     * old context chat while this was still in flight; it then resolved and navigated her to
     * `/checkin/...` anyway, losing the reply she was waiting on. `shouldNavigate`, passed only by
     * that silent auto-open effect, is checked right before acting on the answer - never checked
     * for a reader who pressed "Your check-in" or "Start my check-in" themselves, since there is
     * nothing stale to guard against in a result of their own direct action.
     */
    const shouldNavigate = (checkIn as any)?.__shouldNavigate as (() => boolean) | undefined
    if (shouldNavigate && !shouldNavigate()) return
    if (blocked && !(checkIn as any)?.isFreeGround) {
      setPaywallFreeExtensionAvailable(freeExtensionAvailable ?? false)
      setShowPaywall(true)
    } else {
      navigate(`/checkin/${checkIn.id}`, {
        state: {
          sessionNumber: checkIn.sessionNumber,
          isFinal: (checkIn as any).isFinal ?? false,
          groundId,
          groundLabel: (checkIn as any).__groundLabel,
          isInitiator: (checkIn as any).__isInitiator ?? false,
        },
      })
    }
  }

  const runProbe = async (checkIn: any) => {
    setProbeStatus('pending')
    setProbeErrorMessage(null)
    try {
      const res = await apiClient.post(
        `/check-ins/${checkIn.id}/open`,
        {},
        { validateStatus: () => true },
      )
      if (!mountedRef.current) return
      if (res.status === 403) {
        setProbeStatus('idle')
        settleProbe({ blocked: true, checkIn, freeExtensionAvailable: res.data?.freeExtensionAvailable })
        return
      }
      if (res.status !== 200 && res.status !== 201) {
        setProbeStatus('error')
        setProbeErrorMessage(res.data?.message ?? 'Could not start your check-in. Try again.')
        return
      }
      setProbeStatus('idle')
      /* Today's session, where the one asked for had a round that had closed: the page goes to the one that was opened. */
      const opened = typeof res.data?.checkInId === 'string' && res.data.checkInId !== checkIn.id
        ? { ...checkIn, id: res.data.checkInId, sessionNumber: (checkIn.sessionNumber ?? 0) + 1 }
        : checkIn
      settleProbe({ blocked: false, checkIn: opened })
      /*
       * B-211: NO TOAST ON FAILURE. A failed open already gets its own permanent note on the
       * page (`openFailed`/`openError`, just below, read by GroundParticipantPage.tsx and
       * GroundAdminPage.tsx), with a working "Try again" - a toast said the same thing a second
       * time, in a form that vanishes on its own, and on the participant page it sat over "This is
       * your session 3 of 12" while it lasted. One message, on the page, that stays until the next
       * attempt, is the one a person can actually act on.
       */
    } catch (e: any) {
      if (!mountedRef.current) return
      setProbeStatus('error')
      setProbeErrorMessage(e?.response?.data?.message ?? e?.message ?? 'Could not start your check-in. Try again.')
    }
  }

  /**
   * A FAILED OPEN MUST NOT LEAVE "OPENING YOUR CHECK-IN…" ON SCREEN FOR EVER.
   *
   * Before `openFailed`/`openError` existed, a failed probe left no trace on the page at all: the
   * caller's own "Opening…" note had no way to know the attempt was over, so it stayed up with
   * nothing to do and nothing to read, the thing request 174, item 2 called a hang. These let a
   * caller tell the two states apart and offer a real retry; `retryOpen` clears the probe back to
   * idle so `open()` can be called again for the same check-in (the same reset the chat page's own
   * "Try again" button already does for its own open call).
   */
  const openFailed = probeStatus === 'error'
  const openError = probeStatus === 'error' ? (probeErrorMessage ?? 'Could not start your check-in. Try again.') : null
  const retryOpen = () => { setProbeStatus('idle'); setProbeErrorMessage(null) }

  const redeemPaywallCode = useMutation({
    mutationFn: () => billingApi.redeemContributorCode(paywallCode.trim().toUpperCase(), groundId!),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      setPaywallCodeMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        setShowPaywall(false)
        setPaywallCode('')
      }
    },
    onError: () => setPaywallCodeMsg({ ok: false, text: 'That didn’t work. Try again.' }),
  })

  const claimFreeExtensionMut = useMutation({
    mutationFn: () => billingApi.claimFreeExtension(groundId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      setShowPaywall(false)
      setPaywallFreeExtensionAvailable(false)
      toast.success('Free session added. You can now start your session.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add the free session. Try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: string) => billingApi.createSubscription(plan as any),
    onSuccess: r => {
      if (r.checkoutUrl) window.location.href = r.checkoutUrl
      else toast.error('Checkout did not open. Try again, or email hello@myground.work.')
    },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  /* `isFreeGround`, the ground's own label, and whether THIS viewer runs the ground are not on the
     check-in row itself; the caller passes them once, here, rather than every call site threading
     them through `probeSession.mutate`. The `__` prefix keeps them visibly not part of the
     check-in's own shape when `onSuccess` reads them back off `data.checkIn`. */
  const open = (checkIn: any, opts?: { isFreeGround?: boolean; groundLabel?: string; isInitiator?: boolean; shouldNavigate?: () => boolean }) => {
    runProbe({
      ...checkIn,
      isFreeGround: opts?.isFreeGround ?? false,
      __groundLabel: opts?.groundLabel,
      __isInitiator: opts?.isInitiator ?? false,
      __shouldNavigate: opts?.shouldNavigate,
    })
  }

  return {
    open,
    opening: probeStatus === 'pending',
    openFailed,
    openError,
    retryOpen,
    paywall: {
      show: showPaywall,
      close: () => setShowPaywall(false),
      freeExtensionAvailable: paywallFreeExtensionAvailable,
      code: paywallCode,
      setCode: setPaywallCode,
      codeMsg: paywallCodeMsg,
      setCodeMsg: setPaywallCodeMsg,
      redeem: redeemPaywallCode,
      claimFreeExtension: claimFreeExtensionMut,
      createSubscription: createSubscriptionMut,
    },
  }
}
