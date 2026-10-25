import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { groundsApi, type ATemplate } from '@/api/grounds'
import { Page, PageTitle, Section, Note } from '@/components/gw/ui'

/**
 * THE TEMPLATE LIBRARY (B1, templates.jpg; Release 4: "the 13 templates attachable to any team"). Every template, then the chosen
 * one in full: what one piece of work is, its shape, how it rolls up, what verifies it and its stall rule; the ladder of stages with
 * what each needs, what verifies it and what the check-in asks; its targets and how each reads; how claims get inflated in this work;
 * and rules a lead might say. Where the organisation does not have Release 4 on, it says so and shows none.
 */
export function TemplatesPage() {
  const q = useQuery({ queryKey: ['templates'], queryFn: groundsApi.templates, staleTime: 5 * 60_000 })
  const templates: ATemplate[] = q.data?.templates ?? []
  const [chosenId, setChosenId] = useState<string | null>(null)
  const t = templates.find((x) => x.id === chosenId) ?? templates[0] ?? null
  return (
    <Page>
      <PageTitle title="Template library" subtitle="A template sets what is tracked, its stages, how targets read, how it rolls up and what the check-in asks. The lead attaches one in People and setup." />
      {q.isLoading && <Note>Loading the templates.</Note>}
      {q.data && !q.data.on && <Note>Templates are not switched on for your organisation yet.</Note>}
      {t && (
        <div className="gw-templates">
          <nav aria-label="Templates" className="gw-templates-list">
            <h2 className="t-h3">Templates</h2>
            {templates.map((x) => (
              <button key={x.id} type="button" className={`ci-row${x.id === t.id ? ' on' : ''}`} aria-current={x.id === t.id ? 'true' : undefined} onClick={() => setChosenId(x.id)}>
                <span className="nm">{x.name}</span>
              </button>
            ))}
          </nav>
          <div className="gw-col-32">
            <div>
              <h2 className="t-title">{t.name}</h2>
              <p className="t-body mut gw-mt-4">{t.aim}</p>
            </div>
            <div className="panel pad">
              <dl className="gw-template-facts">
                <div><dt>Unit of work</dt><dd>{t.unitOfWork}</dd></div>
                <div><dt>Shape on the board</dt><dd>{t.shape}</dd></div>
                <div><dt>Rolls up by</dt><dd>{t.rollsUpBy}</dd></div>
                <div><dt>Verified by</dt><dd>{t.verifiedBy}</dd></div>
                <div><dt>Stall rule</dt><dd>{t.stallRule}</dd></div>
              </dl>
            </div>
            <Section heading="The ladder" note="Stages, what each needs, what verifies it, what the check-in asks">
              <div className="panel scroll-x">
                <div className="row gw-ladder-row gw-ladder-head t-tiny mut"><span>Stage</span><span>Needs</span><span>Verified by</span><span>The check-in asks</span></div>
                {t.ladder.map((s) => (
                  <div key={s.stage} className="row gw-ladder-row t-small"><b>{s.stage}</b><span>{s.needs}</span><span>{s.verifiedBy}</span><span>{s.asks}</span></div>
                ))}
              </div>
            </Section>
            <Section heading="Targets, and how each reads">
              <div className="gw-ruled-rows">
                {t.targets.map((x) => <p key={x.name} className="t-small gw-template-target"><b>{x.name}</b><span className="mut">{x.reads}</span><span>{x.value}</span></p>)}
              </div>
            </Section>
            <Section heading="How claims get inflated in this work">
              <div className="gw-ruled-rows">
                {t.howClaimsGetInflated.map((x) => <p key={x.name} className="t-small"><b>{x.name}.</b> {x.says}</p>)}
              </div>
            </Section>
            <Section heading="Rules a lead might say, picked up and confirmed">
              <div className="gw-ruled-rows">
                {t.rulesALeadMightSay.map((x) => <p key={x.said} className="t-small"><span className="quote">{x.said}</span> <span className="mut">{x.means}.</span></p>)}
              </div>
            </Section>
            <Note>Templates are starting points. Every part is confirmed or changed by the lead, and the board, reports and check-ins follow it.</Note>
          </div>
        </div>
      )}
    </Page>
  )
}
