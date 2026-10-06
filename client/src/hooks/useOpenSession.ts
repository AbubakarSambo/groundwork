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

  const probeSession = useMutation({
    mutationFn: async (checkIn: any) => {
      const res = await apiClient.post(
        `/check-ins/${checkIn.id}/open`,
        {},
        { validateStatus: () => true },
      )
      if (res.status === 403) return { blocked: true, checkIn, reason: res.data?.message as string | undefined, freeExtensionAvailable: res.data?.freeExtensionAvailable as boolean | undefined }
      if (res.status !== 200 && res.status !== 201) throw new Error(res.data?.message ?? 'Could not start session.')
      return { blocked: false, checkIn, reason: undefined, freeExtensionAvailable: undefined }
    },
    onSuccess: ({ blocked, checkIn, freeExtensionAvailable }) => {
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
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not start session. Try again.'),
  })

  /**
   * A FAILED OPEN MUST NOT LEAVE "OPENING YOUR CHECK-IN…" ON SCREEN FOR EVER.
   *
   * The toast above is the only trace a failed `probeSession` used to leave: the caller's own
   * "Opening…" note had no way to know the attempt was over, so it stayed up with nothing to do
   * and nothing to read, the thing request 174, item 2 called a hang. `openFailed`/`openError` let
   * a caller tell the two states apart and offer a real retry; `retryOpen` clears the mutation back
   * to idle so `open()` can be called again for the same check-in (the same reset the chat page's
   * own "Try again" button already does for its own open call).
   */
  const openFailed = probeSession.isError
  const openError = probeSession.isError
    ? ((probeSession.error as any)?.response?.data?.message ?? (probeSession.error as any)?.message ?? 'Could not start your check-in. Try again.')
    : null
  const retryOpen = () => probeSession.reset()

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
    onError: () => setPaywallCodeMsg({ ok: false, text: 'Something went wrong. Try again.' }),
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
  const open = (checkIn: any, opts?: { isFreeGround?: boolean; groundLabel?: string; isInitiator?: boolean }) => {
    probeSession.mutate({
      ...checkIn,
      isFreeGround: opts?.isFreeGround ?? false,
      __groundLabel: opts?.groundLabel,
      __isInitiator: opts?.isInitiator ?? false,
    })
  }

  return {
    open,
    opening: probeSession.isPending,
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
