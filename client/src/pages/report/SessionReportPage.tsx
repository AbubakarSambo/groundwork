import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { SessionReportCard } from '@/components/gw/SessionReportCard'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'

/**
 * THE REPORT ONE SESSION ENDED ON, OPENED AGAIN.
 *
 * Reported four times: "I want the exact same forming report to be openable or seen. I have not
 * seen it anywhere - when I click, it sends me back to the chat and the report looks nothing like
 * what I got at the end."
 *
 * Clicking a finished session went to `/checkin/:id`, which is the CHAT: the whole transcript,
 * with a different, shorter summary underneath it. So the click landed her in the conversation she
 * had already had, and the thing below it was a genuinely different object. This route opens the
 * report itself, on its own page, rendered by the same component the end of the session renders.
 *
 * Read-only on purpose. Correcting it is a session of its own - it asks you questions and changes
 * the record - so it starts a check-in rather than editing a page.
 */
export default function SessionReportPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['session-report', checkInId],
    queryFn: () => conversationApi.sessionReport(checkInId!),
    enabled: !!checkInId,
  })

  /**
   * CORRECTING IT, from the page that shows it.
   *
   * The control was only ever on the shared-report card, which is a different report; the one a
   * person actually wants to correct is the one they just read. Nothing is overwritten - the
   * correction is its own session and shows alongside.
   */
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(data!.groundId as string, data!.sessionNumber as number),
    onSuccess: (res: any) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('That did not start. Nothing has changed - try again.'),
  })

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
      >
        &larr; Back
      </button>

      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
        {data?.sessionNumber ? `Session ${data.sessionNumber}` : 'Your session'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 18 }}>
        {data?.finishedAt
          ? `The report you read when you finished, on ${new Date(data.finishedAt).toLocaleDateString()}. Nobody else can see it.`
          : 'The report you read when you finished. Nobody else can see it.'}
      </div>

      {isLoading && (
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Getting your report...</div>
      )}

      {isError && (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20 }}>
          {/*
            "WHY SHOULD ME THAT WE COULDN'T OPEN A REPORT AND IT MAY BELONG TO SOMEONE ELSE."

            Fair. The old line guessed at the cause and picked the one that accuses the reader of
            opening somebody else's record - on a page reached by clicking their own session. The
            status says which of the three things actually happened, so it can say the true one,
            and the fallback offers the retry rather than a theory.
          */}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
            {(error as any)?.response?.status === 403 || (error as any)?.response?.status === 404
              ? 'This session is not yours to open'
              : 'This did not load'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            {(error as any)?.response?.status === 403 || (error as any)?.response?.status === 404
              ? 'A session report is only ever readable by the person who gave that account.'
              : 'Nothing is wrong with the report - the request did not get through. Try again.'}
          </div>
          {!((error as any)?.response?.status === 403 || (error as any)?.response?.status === 404) && (
            <button
              onClick={() => refetch()}
              style={{ marginTop: 12, padding: '9px 14px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/*
        A SESSION RUN WHILE SIGNED IN SAW A DIFFERENT REPORT, and this page owes it the same
        promise. Only the entry flow builds the full report above; a session inside the app ends
        on `SessionReportCard`, under the transcript. So when there is no kept report, this shows
        the card - which is what that person actually read - rather than an apology.
      */}
      {!isLoading && !isError && !data?.report && data?.groundId && data?.sessionNumber && (
        <SessionReportCard
          checkInId={checkInId!}
          groundId={data.groundId}
          sessionNumber={data.sessionNumber}
          isInitiator={!!data.isInitiator}
        />
      )}

      {data?.report && (
        <>
          <TheReportYouSawAtTheEnd report={data.report} onRecordLine="On record: your account." />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 15px', marginTop: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>Something here is wrong?</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
              Correcting it is a short check-in of its own - it asks you what it got wrong. Nothing
              is overwritten; the change is shown alongside the original.
            </div>
            <button
              onClick={() => correct.mutate()}
              disabled={correct.isPending || !data.groundId || !data.sessionNumber}
              style={{ padding: '9px 14px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 13, fontWeight: 700, cursor: correct.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              {correct.isPending ? 'Starting...' : 'Correct it'}
            </button>
          </div>
          <button
            onClick={() => navigate(`/checkin/${checkInId}`)}
            style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            Read the conversation this came from
          </button>
        </>
      )}
    </div>
  )
}
