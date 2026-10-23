import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { nextMove } from '../services/sharp_preview.js'
import { getCompanionUrl } from '../services/companion_navigation.js'
import { SharpRobot } from './SharpRobot.jsx'

export function SharpBriefingCard({ project }) {
  const sharp = useSharp()
  const navigate = useNavigate()
  const next = nextMove({ ...sharp.context, project: project || sharp.context.project })
  const companionUrl = (options = {}) => getCompanionUrl({ projectId: project?.id || sharp.context.project?.id, ...options })
  return <section className="sharp-briefing" aria-label="Zenith founder briefing">
    <div className="sharp-briefing__copy"><span className="sharp-eyebrow"><Sparkles size={14}/> Meet your founder companion</span><h2>A clearer next move, with Zenith.</h2><p>{next.title}</p><small>{project?.name || 'One idea. One useful step at a time.'}</small><div className="sharp-actions"><button type="button" className="sharp-button sharp-button--primary" disabled={sharp.busy} onClick={() => navigate(companionUrl({ prompt: 'brief' }))}>Brief me <ArrowRight size={15}/></button><button type="button" className="sharp-button" onClick={() => navigate(companionUrl())}>Talk to Zenith</button>{!sharp.state.settings.setupComplete && <Link to={companionUrl({ tab: 'settings' })} className="sharp-text-link">Personalize</Link>}</div><span className="sharp-briefing__note">Frontend preview · Your journey stays yours.</span></div>
    <div className="sharp-briefing__art"><span className="sharp-orbit"/><SharpRobot happy/><span className="sharp-art-label">MENTOR · COMPANION · GUIDE</span></div>
  </section>
}
