import { useState } from 'react'
import {
  Page, Section, Panel, EdgeList, EdgeRow, Table, NumberTiles, Stat, Grid, Tabs, Empty, Button, Text, Meta, metaLine,
} from '@/components/gw/ui'

/**
 * THE DESIGN SYSTEM, AS A LIVING REFERENCE (Hafsah, 23 November 2026). Development only: the route in
 * App.tsx exists only when `import.meta.env.DEV` is true, so a built, production app has no /design.
 *
 * Every building block a rebuilt page is made from, drawn the way a rebuilt page draws it, with the
 * prototype's own words (docs/prototype/screens). Each journey is built against this page at 1440px and
 * at 375px. It sets no spacing, size or colour of its own: everything comes from the blocks.
 *
 * The blocks, by the names the twelve rules give them: Page, Section, Card (Panel), Row (EdgeRow in an
 * EdgeList), Table, Stat (and NumberTiles for several), Tabs, Empty line (Empty), Button (primary is the
 * main button, secondary the second, quiet the link), Text and Meta.
 */
const TABS = [
  { key: 'board', label: 'Board' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'context', label: 'Context' },
  { key: 'work', label: 'My work' },
  { key: 'people', label: 'People and setup' },
]

export default function DesignSystemPage() {
  const [tab, setTab] = useState('board')
  return (
    <Page
      title="Morning, Wairimu"
      lede="Wednesday 23 September. In the sales team, 5 of 6 have checked in today."
      action={<Button>Start a check-in</Button>}
      side={
        <>
          <Section heading="Since yesterday" note="What changed in your check-ins.">
            <Stat label="Deals that moved stage" value="3" meta={metaLine("the sales team's check-ins", '23 September')} />
            <Stat label="Days since Kito Foods was contacted" value="4" meta={metaLine("Brian's check-in", '22 September')} />
          </Section>
          <Section heading="Your own check-in" action={<Button kind="secondary">Start it</Button>}>
            <Panel heading="Leadership, Q3">
              <Text size="body" as="p">About two minutes. It closes at 6pm.</Text>
            </Panel>
          </Section>
        </>
      }
    >
      <Section heading="What needs you" note="5 things, most important first." action={<Button kind="quiet">See everything that needs you</Button>}>
        <EdgeList label="What needs you">
          <EdgeRow kind="ready" title="Today's report for the sales team is ready" detail="3 deals moved stage. Kito Foods has had no contact for 4 days." actions={<Button kind="quiet">Read it</Button>} />
          <EdgeRow kind="decide" title="Decide whether a price range counts as a budget" detail="Brian and Miriam both raised it this week. It changes how 4 deals are counted." actions={<><Button kind="quiet">Yes, it counts</Button><Button kind="quiet">No</Button></>} />
          <EdgeRow kind="look" title="Samuel has followed up the same 5 leads for 3 check-ins" detail="None have replied. The stall rule you set would drop them." actions={<Button kind="quiet">Open Samuel</Button>} />
          <EdgeRow title="The weekly report shares itself at 6:30pm" detail="Read it first if you like. Nothing to do otherwise." actions={<Button kind="quiet">Hold it</Button>} />
        </EdgeList>
      </Section>

      <Section heading="Is the strategy moving?" note="Strategy v2, since 1 September. 3 teams, 11 people, 34 check-ins this week.">
        <NumberTiles label="The strategy in figures" tiles={[
          { key: 'in', label: 'Checked in today', value: '5 of 6', sub: metaLine("the sales team's check-ins", '23 September') },
          { key: 'deals', label: 'Enterprise deals qualified', value: '4 of 12', sub: metaLine("Wairimu's board", '23 September') },
          { key: 'time', label: 'Delivered on time', value: '88%', sub: metaLine("Operations' check-ins", '22 September') },
        ]} />
        <Grid columns={3}>
          <Panel heading="Grow revenue 50%, enterprise first">
            <Text size="body" as="p">Sales has qualified 4 of 12 enterprise deals, and 1 of them is proven. But 60% of sales visits were to small shops.</Text>
            <Meta from="the sales team's check-ins" on="23 September" />
          </Panel>
          <Panel heading="Improve delivery">
            <Text size="body" as="p">On time is 88% against 95%. The same missing integration is holding three projects.</Text>
            <Meta from="Operations' check-ins" on="22 September" />
          </Panel>
          <Panel heading="Build a stronger organisation">
            <Text size="body" as="p">Founders made 9 decisions this month that sat inside someone else's role. No team has a goal under this.</Text>
            <Meta from="the leadership check-in" on="21 September" />
          </Panel>
        </Grid>
      </Section>

      <Section heading="Everyone at Baridi" note="27 people, on Growth, which allows up to 100.">
        <Table
          caption="Check-ins and proof this week"
          onPanel={false}
          columns={[
            { key: 'name', header: 'Person', rowHeader: true },
            { key: 'team', header: 'Team' },
            { key: 'role', header: 'Role' },
            { key: 'checkins', header: 'Check-ins this week', numeric: true },
            { key: 'proven', header: 'Deals with proof', numeric: true },
          ]}
          rows={[
            { name: 'Amani Njoroge', team: 'Leadership', role: 'Owner', checkins: '1', proven: '0' },
            { name: 'Grace Achieng', team: 'Operations', role: 'Admin', checkins: '5', proven: '0' },
            { name: 'Wairimu Kamau', team: 'Sales', role: 'Lead', checkins: '5', proven: '4' },
            { name: 'Samuel Otieno', team: 'Sales', role: 'Takes part', checkins: '3', proven: '0' },
            { name: 'Miriam Wanjiku', team: 'Sales', role: 'Takes part', checkins: '5', proven: '12' },
          ]}
        />
      </Section>

      <Section heading="Sales team, Q3" note="Your turn. It closes at 6pm.">
        <Tabs label="Sales team, Q3" items={TABS} active={tab} onChange={setTab} />
        <Empty action={<Button kind="quiet">Start one.</Button>}>No check-ins yet.</Empty>
      </Section>

      <Section heading="Buttons" note="One main button on a screen, and at most one on a card.">
        <Grid columns={3}>
          <Panel heading="Main"><Button>Start your check-in</Button></Panel>
          <Panel heading="Second"><Button kind="secondary">Read it</Button></Panel>
          <Panel heading="Link"><Button kind="quiet">Not now</Button></Panel>
        </Grid>
      </Section>

      <Section heading="Text" note="Six sizes and two weights, and the big size for a greeting or a number.">
        <Text size="big" as="p">Morning, Wairimu</Text>
        <Text size="title" as="p">Sales team, Q3</Text>
        <Text size="section" as="p">What needs you</Text>
        <Text size="card" as="p">Samuel has chased the same 5 leads for 3 check-ins</Text>
        <Text size="body" as="p">Two minutes. You're a participant in Leadership, Q3.</Text>
        <Text size="secondary" as="p">5 things, most important first.</Text>
        <Meta from="Amani's check-in" on="21 November" />
      </Section>
    </Page>
  )
}
