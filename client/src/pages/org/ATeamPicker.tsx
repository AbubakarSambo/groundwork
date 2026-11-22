import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Section, Select, TextField, FieldRows, FieldRow, FlexRow } from '@/components/gw/ui'

/**
 * THE TEAM IS PICKED FROM A LIST (Hafsah, 21 November 2026). The list is the teams already in use here, one spelling each
 * (GET /users/organization/teams, api/src/modules/users/the-teams-here.ts), with "Add a new team" at the end, which opens a box to
 * type it once. The server keeps one spelling per team, ignoring case, whatever is typed.
 */
export const ADD_A_NEW_TEAM = '__new__'

export function useTheTeams() {
  return useQuery({
    queryKey: ['org-teams'],
    queryFn: () => apiClient.get('/users/organization/teams').then((r) => (r.data.data ?? r.data) as { name: string; people: number }[]),
    retry: false,
  })
}

/** A team picker. `value` is the team chosen, '' for none; a new team is passed up as typed. */
export function ATeamPicker({ value, onChange, label = 'Team', noneSays = 'No team' }: {
  value: string; onChange: (team: string) => void; label?: string; noneSays?: string
}) {
  const got = useTheTeams().data
  const teams = Array.isArray(got) ? got : []
  const known = !value || teams.some((t) => t.name === value)
  /* A new team is being typed once "Add a new team" is chosen, or for a value not on the list once the list is in. */
  const [chose, setAdding] = useState(false)
  const adding = chose || (!known && got !== undefined)
  return (
    <FlexRow gap={10} wrap as="span">
      <Select
        aria-label={label}
        value={adding ? ADD_A_NEW_TEAM : value}
        onChange={(e) => {
          if (e.target.value === ADD_A_NEW_TEAM) { setAdding(true); onChange(''); return }
          setAdding(false)
          onChange(e.target.value)
        }}
        style={{ width: 'auto' }}
      >
        <option value="">{noneSays}</option>
        {teams.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        <option value={ADD_A_NEW_TEAM}>Add a new team</option>
      </Select>
      {adding && (
        <TextField className="gwui-narrow-field" aria-label="The new team’s name" value={value} onChange={(e) => onChange(e.target.value)} maxLength={120} placeholder="For example, Sales" />
      )}
    </FlexRow>
  )
}

/** "Teams" on People: each team here, one spelling, and how many people are on it. */
export function TheTeamsHere() {
  const got = useTheTeams().data
  const teams = Array.isArray(got) ? got : []
  if (!teams.length) return null
  return (
    <Section heading="Teams" note="Pick a team on each person’s page, or when you invite them.">
      <FieldRows>
        {teams.map((t) => (
          <FieldRow key={t.name} label={t.name} value={t.people === 1 ? '1 person is on this team.' : `${t.people} people are on this team.`} />
        ))}
      </FieldRows>
    </Section>
  )
}
