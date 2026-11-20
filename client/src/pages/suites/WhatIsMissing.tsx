import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { suitesApi } from '@/api/suites'
import { Note } from '@/components/gw/ui'

/**
 * THE SETUP CHECK ON A SUITE'S CARD (Batch S, S3). What the suite is missing before its approvals follow the reporting lines,
 * and the step that fixes each, exactly as the server says it (GET /suites/setup/:key, the-setup-check.ts). Ask reads the same
 * sentences when it guides an admin. The server refuses anybody who may not set the suite up, and then nothing is shown.
 */
export function WhatIsMissing({ suite }: { suite: string }) {
  const { data } = useQuery({ queryKey: ['suite-setup', suite], queryFn: () => suitesApi.setupCheck(suite), retry: false })
  if (!data?.said?.length) return null
  return (
    <Note tone={data.ready ? 'muted' : 'amber'}>
      {data.said.join(' ')}
      {!data.ready && data.noManager.length > 0 && <> <Link className="gwui-plain-link" to="/org/members">Open the People page</Link></>}
    </Note>
  )
}
