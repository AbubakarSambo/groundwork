/**
 * "WHO IS IN THIS" (round 4, item A step 2), MOVED FROM THE CHECK-IN TAB TO PEOPLE AND SETUP.
 *
 * `GroundTopic`, inside `GroundChat.tsx`, used to hold two different things in one card: "About
 * this check-in" (the brief) and "Who is in this" (the roster, with the peers rule). The brief
 * duplicates Context, which already has it - only the roster is moved here, unchanged in words and
 * behaviour, to where the prototype puts it. Nothing here is new: every sentence, condition and
 * comment below is `GroundTopic`'s own roster half, carried over rather than rewritten.
 */
export function WhoIsInThis({ parties, peersHidden, notOpenYet, viewerIsParty, leadName, viewerIsTheLead }: {
  /** Nobody is late for a session that has not opened yet (W14-12). */
  notOpenYet?: boolean
  /**
   * WHO ELSE IS IN THIS, AND WHETHER THEY ARE DOING IT. W13-5.
   *
   * NO CLIENT-SIDE GATE HERE ON PURPOSE. `grounds.service.ts` decides whether parties see each
   * other, and when they do not it FILTERS THEM OUT OF THE PAYLOAD - hidden by default on
   * evaluation and cohort grounds. So whatever reaches this component is already permitted, and a
   * second rule here would be a second place to get it wrong.
   *
   * It is coverage, not content: that somebody has checked in, never a word of what they said.
   */
  parties?: { name: string; done: boolean; isSelf: boolean }[]
  peersHidden?: boolean
  /** Whether the reader is one of the people this card is talking about. */
  viewerIsParty?: boolean
  /** Names, not roles (U.8 third review). */
  leadName?: string | null
  /** True when the reader IS the lead this sentence would otherwise describe. */
  viewerIsTheLead?: boolean
}) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.5px', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 6 }}>
        Who is in this
      </div>
      {/*
        A ROSTER OF ONE MEANS ONE OF TWO THINGS, AND SILENCE PICKS NEITHER. W14-5.

        `peersHidden` is the ground's own rule, passed down, not inferred from the roster's length -
        a genuinely single-party ground is a different thing and says so.
      */}
      {peersHidden && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          {viewerIsTheLead
            ? 'People on this check-in answer without seeing each other. You can see who is here.'
            : `${leadName ?? 'Your lead'} knows who is here. You will not see the others or what they wrote, and they will not see you.`}
        </div>
      )}
      {!peersHidden && (parties ?? []).length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(parties ?? []).map((p, i) => {
            /*
              A FULL SENTENCE, NOT A NAME WITH A STATUS WORD STUCK ON WITH A DOT. Nothing is said
              about a session that has not opened yet: nobody is late for one that has not started.
            */
            const have = p.isSelf ? 'have' : 'has'
            const sentence = p.done
              ? `${p.isSelf ? 'You' : p.name} ${have} checked in.`
              : notOpenYet
                ? (p.isSelf ? 'You' : p.name)
                : `${p.isSelf ? 'You' : p.name} ${have} not checked in yet.`
            return (
              <span
                key={i}
                title={notOpenYet ? `${p.isSelf ? 'You' : p.name}. The next session has not opened yet.` : sentence}
                style={{
                  fontSize: 12, padding: '3px 9px', borderRadius: 20,
                  background: p.done ? 'var(--gw-green-bg)' : 'var(--gw-bg)',
                  border: `1px solid ${p.done ? 'var(--gw-green-b)' : 'var(--gw-border)'}`,
                  color: 'var(--gw-text)',
                  maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {sentence}
              </span>
            )
          })}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 8 }}>
        {viewerIsParty === false
          ? 'When everyone has checked in, the report shows where the team agrees, where it differs, and what to do next.'
          : 'When everyone has checked in, the report shows where you agree, where you differ, and what to do next.'}
      </div>
    </div>
  )
}
