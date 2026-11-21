import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheDesignPass } from '@/lib/the-design-pass'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { Section, Stack, FieldRows, FieldRow, Choices, SwitchRow, Toggle } from '@/components/gw/ui'
import { A_FAILURE } from './people-here'

/**
 * "WHO CAN OPEN A CHECK-IN" (A4 people.txt), moved here from Settings: the prototype keeps it on the
 * People page, where the people it is about are listed, and keeps Settings for each person's own.
 *
 * Two settings, separate on purpose, both written through the one endpoint the create path's rule
 * reads (grounds/who-may-open-a-check-in.ts), so what this says and what happens cannot come apart.
 * Before the server answers it shows the stricter of each, never the permissive one: a switch that
 * reads "off" while the server says "on" is worse than a moment's wait.
 *
 * REBUILT FROM THE SHARED PARTS: the summary is `FieldRows`, the two ways of answering "who may
 * open one" are `Choices`, and "Check-ins wait for an admin" is a `SwitchRow`, so its heading (16px
 * bold) reads bigger than the sentence under it (14.5px), never the other way round (item 15).
 */
type WhoMayOpen = 'NAMED_LEADS' | 'EVERYONE'
interface HowCheckInsWork { whoMayOpen: WhoMayOpen; needsApproval: boolean }
export const THE_STRICTER_OF_EACH: HowCheckInsWork = { whoMayOpen: 'NAMED_LEADS', needsApproval: true }

export function WhoCanOpenACheckIn({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['how-check-ins-work'],
    queryFn: () => apiClient.get('/users/organization/check-ins').then((r: any) => (r.data.data ?? r.data) as HowCheckInsWork),
  })
  const set = useMutation({
    mutationFn: (change: Partial<HowCheckInsWork>) => apiClient.patch('/users/organization/check-ins', change),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['how-check-ins-work'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const how = q.data ?? THE_STRICTER_OF_EACH

  const OPTIONS: [WhoMayOpen, string, string][] = [
    ['NAMED_LEADS', 'Only the people you name', 'Choose who can open check-ins. Everybody else takes part.'],
    ['EVERYONE', 'Anybody signed in here', `Anyone at ${orgName} can start a check-in.`],
  ]

  /*
   * THE DESIGN PASS: each setting said as it is now, with its control. Who may open check-ins is its sentence, then both choices
   * as plain radio rows (a chosen option never looks like a button). Whether new
   * check-ins wait for an admin is its sentence and its switch, nothing else.
   */
  const designPass = useTheDesignPass()
  if (designPass) {
    return (
      <Section heading="Who can open a check-in">
        <ul className="dp-rows" aria-label="Who can open a check-in">
          <li className="dp-row">
            <span className="dp-row-main">
              <span className="dp-row-title">Opening check-ins</span>
              <span className="dp-row-line">{how.whoMayOpen === 'EVERYONE' ? `Anyone at ${orgName} can start a check-in.` : 'Only the people you choose. Everyone else takes part in the ones they’re invited to.'}</span>
            </span>
            {/* Both choices are always shown, as plain radio rows; choosing one saves it. */}
            {(
              <fieldset className="dp-row-body dp-fieldset">
                <legend className="gwui-sr-only">Who can open a check-in</legend>
                {OPTIONS.map(([key, label, description]) => (
                  <label key={key} className="dp-choice">
                    <input type="radio" name="who-may-open" checked={how.whoMayOpen === key} disabled={set.isPending}
                      onChange={() => key !== how.whoMayOpen && set.mutate({ whoMayOpen: key })} />
                    <span><span className="dp-choice-title">{label}</span><span className="dp-choice-says">{description}</span></span>
                  </label>
                ))}
              </fieldset>
            )}
          </li>
          <li className="dp-row">
            <span className="dp-row-main">
              <span className="dp-row-title">Check-ins wait for an admin</span>
              <span className="dp-row-line">{how.needsApproval ? 'Each new check-in waits for an admin before invitations go out.' : 'New check-ins start straight away.'}</span>
            </span>
            <span className="dp-row-acts"><Toggle on={how.needsApproval} onChange={() => set.mutate({ needsApproval: !how.needsApproval })} label="Check-ins wait for an admin" disabled={set.isPending} /></span>
          </li>
        </ul>
      </Section>
    )
  }

  return (
    <Section heading="Who can open a check-in">
      <Stack gap={18}>
        <FieldRows flush>
          <FieldRow
            label="Opening check-ins"
            value={how.whoMayOpen === 'EVERYONE'
              ? `Anyone at ${orgName} can start a check-in.`
              : 'Only the people you choose. Everyone else takes part in the ones they’re invited to.'}
          />
          <FieldRow
            label="New check-ins"
            value={how.needsApproval
              ? 'Each new check-in waits for an admin before invitations go out.'
              : 'Start straight away. Turn this on to review each one before invitations go out.'}
          />
        </FieldRows>

        <Choices
          label="Who can open a check-in"
          stacked
          value={how.whoMayOpen}
          onChange={(key) => key !== how.whoMayOpen && set.mutate({ whoMayOpen: key as WhoMayOpen })}
          options={OPTIONS.map(([key, label, description]) => ({ key, label, description }))}
        />

        {/*
          * WALKTHROUGH PASS 2, ITEM 5: SAID ONCE, NOT TWICE. The "New check-ins" row above already
          * says this, correctly, for whichever state the switch is actually in; a fixed caption
          * here repeated the "on" sentence even while the switch read "off". No `detail`: the title
          * and the row above it are enough.
          */}
        <SwitchRow
          title="Check-ins wait for an admin"
          on={how.needsApproval}
          onChange={() => set.mutate({ needsApproval: !how.needsApproval })}
          disabled={set.isPending}
        />
      </Stack>
    </Section>
  )
}
