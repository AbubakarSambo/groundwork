import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const TYPEWRITER_TEXT = "Most people decisions\nare made with\nincomplete evidence."

const SITUATIONS = [
  'New hire starting soon',
  'New project or partnership',
  'Probation period',
  'Performance improvement plan',
  'Cofounder agreement',
  'Team drift',
  'Promotion evaluation',
  'Equity conversation',
  'Alignment reset',
  'Contract renewal',
]

const FEED_ITEMS = [
  { t: 'check-in',   c: '#5DCAA5', h: 'Kwame completed session 3',    s: 'Cofounder ground · technical record building' },
  { t: 'confidence', c: '#93C5FD', h: 'Ground confidence 3/5 to 4/5', s: 'Both parties active · cross-reference fired' },
  { t: 'new ground', c: '#E8A94A', h: 'Tarini opened a new ground',    s: 'Head of Growth invited · starting mode' },
  { t: 'report',     c: '#93C5FD', h: 'Report generating',             s: 'Both parties completed session 4' },
  { t: 'signal',     c: '#5DCAA5', h: 'Specificity increasing',        s: 'Pattern signal · 3 consecutive sessions' },
  { t: 'check-in',   c: '#5DCAA5', h: 'Amara submitted her check-in',  s: 'Contribution confirmed by downstream team' },
  { t: 'resolved',   c: '#E8A94A', h: 'Ground closed',                 s: 'Alignment confirmed · both parties' },
  { t: 'new ground', c: '#E8A94A', h: 'New ground opened',             s: 'Something new is starting · 2 parties' },
  { t: 'check-in',   c: '#5DCAA5', h: 'Priya completed session 2',     s: 'Invisible contribution surfaced' },
  { t: 'record',     c: '#93C5FD', h: 'Resolution record written',     s: 'Belongs to both parties permanently' },
  { t: 'confidence', c: '#93C5FD', h: 'Ground confidence: 5/5',        s: 'Comprehensive evidence · full cross-reference' },
  { t: 'check-in',   c: '#5DCAA5', h: 'Ibrahim completed session 1',   s: 'Cofounder ground · both accounts independent' },
]

type FeedItem = { id: number; item: typeof FEED_ITEMS[0]; age: string }
type TwNode = { type: 'text' | 'br'; content?: string }

const C = {
  navy: '#0C447C',
  dark: '#0A1628',
  teal: '#5DCAA5',
  amber: '#E8A94A',
  text: '#1A1916',
  sub: '#6B6560',
  muted: '#9B9590',
  border: '#E2E0DB',
  bg: '#EDECEA',
  off: '#F5F3EF',
  white: '#FFFFFF',
}
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

function NavLogo() {
  return (
    <svg width="20" height="16" viewBox="0 0 22 17" fill="none">
      <rect x="5"  y="0"  width="12" height="3" rx="1.5" fill="#0C447C" opacity="0.45"/>
      <rect x="2"  y="6"  width="18" height="3" rx="1.5" fill="#0C447C" opacity="0.72"/>
      <rect x="0"  y="12" width="22" height="3" rx="1.5" fill="#0C447C"/>
    </svg>
  )
}

function FooterLogo() {
  return (
    <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
      <rect x="5"  y="0"  width="12" height="3" rx="1.5" fill="#93C5FD" opacity="0.4"/>
      <rect x="2"  y="6"  width="18" height="3" rx="1.5" fill="#93C5FD" opacity="0.65"/>
      <rect x="0"  y="12" width="22" height="3" rx="1.5" fill="#93C5FD"/>
    </svg>
  )
}

export function LandingPage() {
  const navigate = useNavigate()

  const [twNodes, setTwNodes] = useState<TwNode[]>([])
  const [twDone, setTwDone] = useState(false)
  const [sitIdx, setSitIdx] = useState(0)
  const [sitVisible, setSitVisible] = useState(true)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const feedIdxRef = useRef(0)
  const feedCountRef = useRef(0)

  // Typewriter
  useEffect(() => {
    const chars = TYPEWRITER_TEXT.split('')
    const nodes: TwNode[] = []
    let i = 0
    let tid: ReturnType<typeof setTimeout>
    const tick = () => {
      if (i >= chars.length) { setTwDone(true); return }
      const ch = chars[i++]
      nodes.push(ch === '\n' ? { type: 'br' } : { type: 'text', content: ch })
      setTwNodes([...nodes])
      tid = setTimeout(tick, i < 20 ? 42 : i < 42 ? 30 : 24)
    }
    tid = setTimeout(tick, 600)
    return () => clearTimeout(tid)
  }, [])

  // Situations cycling
  useEffect(() => {
    const id = setInterval(() => {
      setSitVisible(false)
      setTimeout(() => { setSitIdx(p => (p + 1) % SITUATIONS.length); setSitVisible(true) }, 300)
    }, 2400)
    return () => clearInterval(id)
  }, [])

  // Live feed
  useEffect(() => {
    setFeedItems([0, 1, 2].map(k => ({ id: k + 1, item: FEED_ITEMS[k], age: `${(3 - k) * 4}s ago` })))
    setTotalEvents(3)
    feedIdxRef.current = 3
    feedCountRef.current = 3
    const add = () => {
      const item = FEED_ITEMS[feedIdxRef.current % FEED_ITEMS.length]
      feedIdxRef.current++
      feedCountRef.current++
      const id = feedCountRef.current
      setTotalEvents(id)
      setFeedItems(prev => {
        const next = [...prev, { id, item, age: 'just now' }]
        return next.length > 4 ? next.slice(1) : next
      })
    }
    const id = setInterval(add, 3800)
    return () => clearInterval(id)
  }, [])


  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: '100vh', color: C.text }}>
      <style>{`
        @keyframes gw-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes gw-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(93,202,165,.5)} 50%{box-shadow:0 0 0 5px rgba(93,202,165,0)} }
        @keyframes gw-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .gw-cursor { color:#93C5FD; animation:gw-blink 1s step-end infinite; }
        .gw-pulse  { animation:gw-pulse 2s ease-in-out infinite; border-radius:50%; }
        .gw-pulse2 { animation:gw-pulse 2.5s ease-in-out infinite; border-radius:50%; }
        .gw-feed-item { animation:gw-fadein .4s ease forwards; }
        .gw-nav-link { font-size:13px;font-weight:500;color:#6B6560;background:none;border:none;cursor:pointer;padding:6px 11px;border-radius:6px;font-family:inherit;transition:all .15s;white-space:nowrap; }
        .gw-nav-link:hover { background:#E8E6E3;color:#1A1916; }
        .gw-btn-ghost { font-size:13px;font-weight:600;color:#0C447C;background:none;border:1px solid #B5D4F4;cursor:pointer;padding:7px 14px;border-radius:6px;font-family:inherit;white-space:nowrap;transition:background .15s; }
        .gw-btn-ghost:hover { background:#EEF4FB; }
        .gw-btn-solid { font-size:13px;font-weight:700;color:#fff;background:#0C447C;border:none;cursor:pointer;padding:7px 14px;border-radius:6px;font-family:inherit;white-space:nowrap;transition:background .15s; }
        .gw-btn-solid:hover { background:#1557A0 !important; }
        .gw-hero-btn-p { padding:13px 24px;border-radius:6px;background:#0C447C;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:background .15s; }
        .gw-hero-btn-p:hover { background:#1557A0; }
        .gw-hero-btn-g { padding:13px 24px;border-radius:6px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,.12);cursor:pointer;font-family:inherit;transition:background .15s; }
        .gw-hero-btn-g:hover { background:rgba(255,255,255,.12); }
        .gw-prob-card { background:white;border-radius:8px;border:1px solid #E2E0DB;padding:16px 14px 16px 18px;position:relative;overflow:hidden; }
        .gw-prob-card::before { content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#0C447C; }
        .gw-trust-item { display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-bottom:1px solid #E8E6E3; }
        .gw-trust-item:last-child { border-bottom:none; }
        .gw-demo-btn { display:flex;align-items:flex-start;gap:11px;padding:13px;border-radius:8px;background:white;border:1px solid #E2E0DB;cursor:pointer;font-family:inherit;text-align:left;transition:all .15s;width:100%; }
        .gw-demo-btn:hover { border-color:#B5D4F4;background:#EEF4FB;transform:translateY(-1px); }
        .gw-footer-btn { font-size:12px;color:rgba(255,255,255,.38);background:none;border:none;cursor:pointer;font-family:inherit; }
        .gw-footer-btn:hover { color:rgba(255,255,255,.65); }
        @media(max-width:900px){
          .gw-hero-inner  { grid-template-columns:1fr !important; }
          .gw-prob-grid   { grid-template-columns:1fr 1fr !important; }
          .gw-mom-grid    { grid-template-columns:1fr !important; }
          .gw-trust-grid  { grid-template-columns:1fr !important; gap:32px !important; }
          .gw-price-grid  { grid-template-columns:1fr !important; }
          .gw-about-grid  { grid-template-columns:1fr !important; }
        }
        @media(max-width:620px){
          .gw-nav-links  { display:none !important; }
          .gw-hero-h1    { font-size:26px !important; min-height:auto !important; }
          .gw-hero-btns  { flex-direction:column; }
          .gw-hero-btns .gw-hero-btn-p,.gw-hero-btns .gw-hero-btn-g { width:100%;text-align:center;padding:16px 20px !important;font-size:15px !important; }
          .gw-prob-grid  { grid-template-columns:1fr !important; }
          .gw-demo-grid  { grid-template-columns:1fr !important; }
          .gw-sec-h2     { font-size:26px !important; }
          .gw-cta-h2     { font-size:26px !important; }
          .gw-wrap       { padding:40px 16px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(237,236,234,.96)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56 }}>
        <button onClick={() => scrollTo('home')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <NavLogo />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.navy, letterSpacing: '-.02em' }}>Groundwork</span>
        </button>
        <div className="gw-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {([['home','Home'],['how','How it works'],['pricing','Pricing'],['about','About']] as [string,string][]).map(([id, label]) => (
            <button key={id} className="gw-nav-link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button className="gw-btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
          <button className="gw-btn-solid" onClick={() => navigate('/register')}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" style={{ background: C.dark, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: .07 }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="lgrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#93C5FD" strokeWidth="0.4"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#lgrid)" opacity="0.8"/>
          <line x1="140" y1="90" x2="300" y2="60" stroke="#93C5FD" strokeWidth="0.5" opacity="0.15"/>
          <line x1="300" y1="60" x2="480" y2="130" stroke="#93C5FD" strokeWidth="0.5" opacity="0.13"/>
          <line x1="480" y1="130" x2="640" y2="80" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.12"/>
          <line x1="640" y1="80" x2="800" y2="140" stroke="#93C5FD" strokeWidth="0.5" opacity="0.1"/>
        </svg>
        <div className="gw-hero-inner" style={{ position: 'relative', padding: '56px 20px 52px', maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 44, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(147,197,253,.65)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 20 }}>Contribution intelligence</div>
            <h1 className="gw-hero-h1" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.04em', color: C.white, margin: '0 0 22px', minHeight: 160 }}>
              {twDone ? (
                <>Most people decisions<br />are made with<br /><em style={{ color: '#93C5FD', fontStyle: 'normal' }}>incomplete evidence.</em></>
              ) : (
                <>{twNodes.map((n, i) => n.type === 'br' ? <br key={i}/> : <span key={i}>{n.content}</span>)}<span className="gw-cursor">|</span></>
              )}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.52)', lineHeight: 1.75, margin: '0 0 16px', maxWidth: 440 }}>A shared record of contribution. Built from both sides. Cross referenced over time.</p>
            <div style={{ marginBottom: 32, minHeight: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="gw-pulse" style={{ width: 6, height: 6, background: '#5DCAA5', flexShrink: 0, display: 'inline-block' }}></span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', fontWeight: 500, transition: 'opacity .3s ease', opacity: sitVisible ? 1 : 0 }}>{SITUATIONS[sitIdx]}</span>
            </div>
            <div className="gw-hero-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="gw-hero-btn-p" onClick={() => navigate('/register')}>Set up your org free →</button>
              <button className="gw-hero-btn-g" onClick={() => navigate('/enter-org-code')}>Open my chat →</button>
            </div>
          </div>

          {/* Feed panel */}
          <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="gw-pulse" style={{ width: 7, height: 7, background: '#5DCAA5', display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.55)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Live feed</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>{totalEvents} events</span>
            </div>
            <div style={{ minHeight: 230, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {feedItems.map(({ id, item, age }) => (
                <div key={id} className="gw-feed-item" style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: item.c + '22', color: item.c, textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.t}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>{item.h}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', flexShrink: 0, whiteSpace: 'nowrap' }}>{age}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.32)', marginTop: 2 }}>{item.s}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.06)', gap: 4 }}>
              {[['12','active grounds'],['3','reports today'],['47','check-ins this week']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.white, textAlign: 'center' }}>{val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', textAlign: 'center', marginTop: 2, letterSpacing: '.02em' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ background: '#F5F3EF', borderBottom: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>The problem</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, maxWidth: 660, margin: '0 auto 16px' }}>
            The problem is not performance.<br />It is <em style={{ color: C.navy, fontStyle: 'normal' }}>visibility.</em>
          </h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, margin: '0 auto 44px', maxWidth: 500 }}>
            Most teams do not know who is carrying critical work, where expectations diverged, who is blocked, or whether contribution matches perception. So conversations become political.
          </p>
          <div className="gw-prob-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, maxWidth: 900, margin: '0 auto' }}>
            {[
              ['Who is carrying',   'Critical work that is invisible until someone leaves'],
              ['Where it diverged', 'Expectations that were never the same on both sides'],
              ['Who is blocked',    'Progress limited by things nobody named in time'],
              ['Whether it matches','Contribution that does not match what people perceive'],
            ].map(([title, desc]) => (
              <div key={title} className="gw-prob-card">
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THREE MOMENTS */}
      <section style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>Three moments</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>Groundwork exists for three moments.</h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 40, maxWidth: 500 }}>Every professional relationship eventually reaches one of them. The record you built before makes each one possible.</p>
          <div className="gw-mom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>

            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: '26px 22px', borderTop: `3px solid ${C.navy}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="gw-pulse2" style={{ width: 7, height: 7, background: '#5DCAA5', flexShrink: 0, display: 'inline-block' }}></span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#085041' }}>Starting mode</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: '-.02em', lineHeight: 1.3 }}>When something new is starting.</h3>
              <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, marginBottom: 14 }}>Build alignment in from the beginning before reality gets interpreted differently by different people.</p>
              {[
                ['New senior hire.','Define success before interpretation drift begins'],
                ['New cofounder or partner.','Agree contribution upfront so equity has something to stand on'],
                ['New board member or advisor.','Set expectations before the relationship costs more than it returns'],
                ['New project.','Scope, ownership, and success criteria before work starts'],
                ['Contract renewal.','Renewal or exit based on the record, not relationship management'],
              ].map(([s, r]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: C.sub, lineHeight: 1.5, marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.navy, flexShrink: 0, marginTop: 5 }}></span>
                  <span><strong>{s}</strong> {r}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: '26px 22px', borderTop: `3px solid ${C.amber}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="gw-pulse2" style={{ width: 7, height: 7, background: '#E8A94A', flexShrink: 0, display: 'inline-block' }}></span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8A5C1A' }}>Recognition</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: '-.02em', lineHeight: 1.3 }}>When someone wants recognition.</h3>
              <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, marginBottom: 14 }}>A raise, equity, or promotion conversation grounded in a record built over time. Both sides see the same picture.</p>
              {[
                ['Asking for a raise.','The record makes the case, built over time, not assembled the night before'],
                ['Equity negotiation.','Contribution documented before the conversation happens'],
                ['Promotion or role change.','The case is built from the record, not assembled in the moment'],
              ].map(([s, r]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: C.sub, lineHeight: 1.5, marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.amber, flexShrink: 0, marginTop: 5 }}></span>
                  <span><strong>{s}</strong> {r}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: '26px 22px', borderTop: `3px solid ${C.teal}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="gw-pulse2" style={{ width: 7, height: 7, background: '#5DCAA5', flexShrink: 0, display: 'inline-block' }}></span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#085041' }}>Alignment</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: '-.02em', lineHeight: 1.3 }}>When you need everyone seeing the same thing.</h3>
              <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, marginBottom: 14 }}>Pressure, conflict, or misalignment that needs a reset. Shared facts so the team can move forward together.</p>
              {[
                ['Revenue pressure or cash crunch.','The whole team needs to pull in the same direction now'],
                ['Team misalignment.','People working hard in different directions without realising it'],
                ['Cofounder tension.','Contribution imbalance that the relationship makes impossible to name'],
                ['A relationship that has drifted.','The cost is compounding and the conversation keeps being deferred'],
              ].map(([s, r]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: C.sub, lineHeight: 1.5, marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, flexShrink: 0, marginTop: 5 }}></span>
                  <span><strong>{s}</strong> {r}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* DEMO */}
      <section style={{ background: '#F5F3EF', borderBottom: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>See it working</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>Try a live demo.</h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 40, maxWidth: 500 }}>No sign-up. Real data from Northgate Ventures.</p>
          <div className="gw-demo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10, maxWidth: 900 }}>
            {[
              { dot: C.navy,  title: "The founder's view",             desc: 'Full team picture. Who is moving, who needs support' },
              { dot: C.navy,  title: "Kwame's check-in · cofounder",   desc: 'Building the technical record across sessions' },
              { dot: C.teal,  title: "Priya's check-in · sales",       desc: 'Strong work that was invisible until the record showed it' },
              { dot: C.amber, title: "Marcus's check-in · sales lead", desc: 'An honest conversation about what the record shows' },
              { dot: C.teal,  title: "Amara's check-in · engineering", desc: 'Specific, evidenced, and recognised' },
            ].map(({ dot, title, desc }) => (
              <button key={title} className="gw-demo-btn" onClick={() => navigate('/enter-org-code')}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }}></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#B4B2A9', marginTop: 14 }}>Northgate Ventures · org code: northgate · admin PIN: 1234</p>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 20px' }}>
          <div className="gw-trust-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>Trust</p>
              <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>Your record belongs to you.</h2>
              <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 24 }}>Not the organisation. Not the platform. The person. That is what makes honesty possible and what makes every other capability in the product work.</p>
              <button className="gw-btn-solid" onClick={() => navigate('/register')} style={{ padding: '12px 22px', fontSize: 14, fontWeight: 700 }}>Get started free</button>
            </div>
            <div>
              {[
                ['No hidden monitoring','Nothing is tracked that you did not submit yourself.'],
                ['Your record is never shared without your explicit approval','For a named decision. Chosen by you. Not before.'],
                ['Reports require the other party to approve','Both parties see the report at the same time or not at all.'],
                ['Built from contribution, not surveillance','No keystroke tracking. No screen monitoring. No activity spying.'],
                ['The record survives the relationship','Belongs to both parties permanently. Even after the org ends.'],
              ].map(([title, body]) => (
                <div key={title} className="gw-trust-item">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.navy, flexShrink: 0, marginTop: 5 }}></span>
                  <div>
                    <strong style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 2 }}>{title}</strong>
                    <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.55, margin: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ background: C.dark, textAlign: 'center', padding: '80px 20px' }}>
        <h2 className="gw-cta-h2" style={{ fontSize: 40, fontWeight: 800, color: C.white, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 14 }}>
          Better decisions start<br />with better evidence.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.4)', marginBottom: 32, fontStyle: 'italic' }}>See clearly when it counts.</p>
        <button className="gw-btn-solid" onClick={() => navigate('/register')} style={{ padding: '15px 36px', fontSize: 15, fontWeight: 700 }}>Set up your org free</button>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 14 }}>First four sessions are free for everyone.</p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: C.bg }}>
        <div className="gw-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '64px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>How it works</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>The shared picture, built from both sides.</h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 40, maxWidth: 500 }}>Both parties check in independently. Neither sees what the other wrote. A report shows where the versions agree and where they diverge.</p>
          <div style={{ marginBottom: 48 }}>
            {[
              ['Both parties check in before the first difficult meeting','Each person submits independently. Neither sees what the other wrote. No performance. No politics. Sessions 1 through 4 are free for everyone.'],
              ['By session two you can see where the versions diverge','The report shows where both accounts agree and where they split. The gap is visible early enough to act. At week two, not month four.'],
              ['The picture deepens with every session','Cross-reference builds over time. What was said at week one is checked against week eight. A confidence score from 1 to 5 shows how strong the evidence is.'],
              ['You end up with a record both parties built and own','It does not disappear when the relationship ends. It belongs to the people who built it. Permanently.'],
            ].map(([title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: 18, padding: '26px 0', borderBottom: i < 3 ? '1px solid #E8E6E3' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.navy, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5, letterSpacing: '-.01em' }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#F5F3EF', borderRadius: 10, padding: 24, borderLeft: `3px solid ${C.navy}`, marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Ground confidence score</h3>
            <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginBottom: 16 }}>Every ground has a confidence score from 1 to 5. It rises as both parties check in and evidence accumulates.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {[
                { score: '1/5', label: 'One account',    color: '#9B9590', bg: 'white',    tc: '#B4B2A9' },
                { score: '2/5', label: 'Both started',   color: '#E8A94A', bg: 'white',    tc: '#B4B2A9' },
                { score: '3/5', label: 'Report ready',   color: '#5DCAA5', bg: 'white',    tc: '#B4B2A9' },
                { score: '4/5', label: 'Well supported', color: '#0C447C', bg: 'white',    tc: '#B4B2A9' },
                { score: '5/5', label: 'Comprehensive',  color: 'white',   bg: '#0C447C',  tc: 'rgba(255,255,255,.6)' },
              ].map(({ score, label, color, bg, tc }) => (
                <div key={score} style={{ textAlign: 'center', padding: '10px 6px', background: bg, borderRadius: 6, border: bg === 'white' ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{score}</div>
                  <div style={{ fontSize: 10, color: tc, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="gw-btn-solid" onClick={() => navigate('/register')} style={{ padding: '13px 28px', fontSize: 14, fontWeight: 700 }}>Get started free</button>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#F5F3EF', borderTop: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '64px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>Pricing</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>Start free. Pay when it has delivered value.</h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 40, maxWidth: 500 }}>Sessions 1 through 4 are free for everyone. No card required. You only pay when the ground has produced enough evidence to be worth it.</p>
          <div className="gw-price-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 32 }}>
            <div style={{ borderRadius: 10, padding: 26, background: C.off, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 14 }}>Free tier</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.text, marginBottom: 4 }}>$0</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>Sessions 1 through 4 for everyone</div>
              {['Sessions 1 to 4 for all participants','Report after every session','Ground confidence score','Up to 20 participants per ground','No card required'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#4A5568', marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, flexShrink: 0 }}></span>{item}
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 10, padding: 26, background: C.navy }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.5)', marginBottom: 14 }}>Paid</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'white', marginBottom: 4 }}>$20<span style={{ fontSize: 15, fontWeight: 400, opacity: .6 }}>/month</span></div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 22 }}>Per org + $50/person/active ground</div>
              {['Everything in the free tier','Sessions 5 onwards','Shareable Ground Report card','Portable verified profile','Permanent resolution record'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, flexShrink: 0 }}></span>{item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.off, borderRadius: 10, padding: 24, border: `1px solid ${C.border}`, marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>How the session model works</h3>
            {[
              ['At setup',        'Choose your timeframe and check-in cadence. The product shows your free and paid sessions before you confirm.'],
              ['Sessions 1 to 4', 'Free for all parties. Reports generate after every session. No card required.'],
              ['Session 5',       'Payment prompt fires to the admin when anyone submits their fifth check-in. Activate to continue.'],
              ['On close',        'Billing stops automatically. The resolution record is permanent. Both parties keep it forever.'],
            ].map(([label, desc]) => (
              <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.navy, minWidth: 80, paddingTop: 2, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="gw-btn-solid" onClick={() => navigate('/register')} style={{ padding: '13px 28px', fontSize: 14, fontWeight: 700 }}>Start free</button>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div className="gw-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '64px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 18, opacity: .65 }}>About</p>
          <h2 className="gw-sec-h2" style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 32 }}>Built because the conversation kept being avoided.</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 40 }}>
            <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.8, margin: 0 }}>Groundwork was built by Coamana out of a problem we kept running into. Hires, cofounders, partners. Both sides had a completely different version of what was agreed. There was nothing to stand on when the conversation finally had to happen.</p>
            <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.8, margin: 0 }}>The product exists to build that record before it is needed. Both parties check in independently. Neither sees what the other wrote. The report shows both versions at the same time. The gap is what the conversation needs to be about.</p>
            <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.8, margin: 0 }}>The single design decision that makes everything else possible: the record belongs to the person who built it. Not the organisation. Not the platform. That is why people are honest in it.</p>
          </div>
          <div style={{ borderLeft: `3px solid ${C.navy}`, padding: 20, background: '#EEF4FB', borderRadius: '0 8px 8px 0', marginBottom: 36 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 8 }}>The founding principle</h3>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}>The record belongs to the people who built it. Not the organisation. Not the platform. The person. That is what makes honesty possible and what makes every other capability in the product work.</p>
          </div>
          <div className="gw-about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
            <div style={{ padding: 20, background: C.off, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>The product</h3>
              <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, margin: 0 }}>Contribution intelligence for professional relationships that matter. Both versions. Cross referenced over time. For two people or twenty.</p>
            </div>
            <div style={{ padding: 20, background: C.off, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>The company</h3>
              <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, margin: 0 }}>Groundwork is built by Coamana, a market infrastructure and intelligence company operating across Africa.</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9B9590', marginBottom: 10 }}>Questions or feedback</p>
            <a href="mailto:hello@myground.work" style={{ fontSize: 15, fontWeight: 700, color: C.navy, textDecoration: 'none' }}>hello@myground.work</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#091525', padding: '36px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FooterLogo />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Groundwork</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['how','How it works'],['pricing','Pricing'],['about','About']].map(([id, label]) => (
              <button key={id} className="gw-footer-btn" onClick={() => scrollTo(id)}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.22)' }}>Powered by Coamana · 2025</div>
        </div>
      </footer>
    </div>
  )
}
