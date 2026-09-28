/**
 * HOW SPECIFIC THIS SESSION WAS, AS A BAR, ON YOUR OWN HALF OF THE PAGE.
 *
 * "The specificity bar etc was good, simple and visual", asked for twice and not on this page.
 *
 * IT DELIBERATELY DOES NOT GO ON THE SHARED HALF. The shared report already carries the same read
 * as a muted sentence at its foot, and the comment above it argues the case: given equal billing
 * with the substance, in a document other people read, a level reads as a mark out of five for a
 * person, and this product does not mark people.
 *
 * None of that objection survives on your own half. Here it is one person looking at their own
 * session, nobody else can see it, and the thing it answers is the only question worth asking
 * about your own record: is there enough in this for it to be worth anything. So it is a bar
 * here and a sentence there, on purpose, and the words underneath say what would move it.
 */
const STEPS = ['General', 'Some of both', 'Specific'] as const

/**
 * Where a level sits on the bar. Unread is not zero, and is drawn as nothing rather than as low.
 *
 * This switched on `high`/`low`, which the scorer never emits, so every read session drew as "some
 * of both" whatever it was - the same bug the server's sentence had. The four real levels, in the
 * order the server ranks them (api: how-checkable-a-session-was.ts): managed and vague are general,
 * directional is some of both, specific is specific.
 */
export function whereItSits(level: string | null | undefined): number | null {
  const l = (level ?? '').toLowerCase()
  if (l === 'managed' || l === 'vague') return 0
  if (l === 'specific') return 2
  if (l === 'directional') return 1
  return null
}

export function HowSpecificThisSessionWas({ level, spots }: {
  level?: string | null
  /**
   * WHAT IS THIN AND WHAT WOULD FIX IT, FROM THE ENGINE THAT COMPUTES IT.
   *
   * `softSpots` and `whatWouldRaiseIt` rendered on the ground report for the lead, per participant,
   * and this meter said the same thing with a hand-written sentence. The person never saw the
   * engine's read of their own account, only their manager did. When the engine has a read, it
   * replaces the sentence; when it has none, the sentence stays.
   */
  spots?: { line: string; wouldRaiseIt: string }[] | null
}) {
  const at = whereItSits(level)
  if (at == null) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 6 }}>
        How specific this session was
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1, textAlign: 'center', fontSize: 10.5,
              padding: '5px 2px', borderRadius: 5, fontWeight: 700,
              /* AN UNFILLED STEP IS NOT GREY TEXT ON A GREY BLOCK. It was --gw-muted on --gw-bg,
                 which is 4.5:1 at 9px uppercase - passing on a calculator and unreadable on a
                 phone in daylight. The unfilled step is paper with a line round it now, and its
                 word is the darker of the two secondary inks. */
              background: i <= at ? 'var(--gw-navy)' : 'var(--gw-card)',
              border: i <= at ? '1px solid var(--gw-navy)' : '1px solid var(--gw-border)',
              color: i <= at ? 'white' : 'var(--gw-sub-d)',
            }}
          >
            {s}
          </div>
        ))}
      </div>
      {spots && spots.length > 0 ? (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {spots.map((sp, i) => (
            <div key={i} style={{ fontSize: 11.5, lineHeight: 1.55, maxWidth: '68ch' }}>
              <span style={{ color: 'var(--gw-text)' }}>{sp.line}</span>{' '}
              <span style={{ color: 'var(--gw-muted)' }}>{sp.wouldRaiseIt}</span>
            </div>
          ))}
        </div>
      ) : (
      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 6, lineHeight: 1.5 }}>
        {/* What would move it, rather than what it is. A bar with no next step is a grade. */}
        {at === 2
          ? 'Dates, numbers and named work, rather than impressions.'
          : at === 1
            ? 'Specific in places. One date, one number or one document in the general parts would fill it.'
            : 'Mostly general. A date, a number, or what you were waiting on and from whom would fill it.'}
      </div>
      )}
    </div>
  )
}
