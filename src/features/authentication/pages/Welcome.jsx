import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, Compass, Handshake, Lightbulb, Play } from 'lucide-react'
import { ParticleNetwork } from '../components/gamified/ParticleNetwork'
import { HologramX } from '../components/gamified/HologramX'
import '../components/Register.css'
import '../components/Welcome.css'

const roles = [
  { name: 'Founder', icon: Lightbulb, text: 'Turn your idea into a clear next step. Create a project, take an assessment, and explore your roadmap.' },
  { name: 'Investor', icon: Compass, text: 'Bring your perspective to the ecosystem. Set up your profile with your investment interests.' },
  { name: 'Mentor', icon: Handshake, text: 'Share what you know. Tell us about your expertise and the time you can offer to founders.' },
]

export function Welcome() {
  return (
    <div className="labx-welcome">
      <ParticleNetwork />
      <header className="welcome-nav">
        <Link to="/" className="welcome-brand" aria-label="LabX home">Lab<span>X</span><small>by ZeAI</small></Link>
        <nav aria-label="Welcome navigation">
          <Link to="/login" className="welcome-signin">Sign in</Link>
          <Link to="/register" className="welcome-button welcome-button--small">Sign up<ArrowRight size={16} aria-hidden="true" /></Link>
        </nav>
      </header>
      <main>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="welcome-eyebrow"><span />Ideas meet opportunity</p>
            <h1 id="welcome-title">Build what’s next.<br /><span>Together.</span></h1>
            <p className="welcome-description">A place for founders, investors, and mentors to take their next step. Find your role. Start your LabX journey.</p>
            <div className="welcome-actions">
              <Link to="/register" className="welcome-button">Get started<ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#explore" className="welcome-guest">Explore as a guest<ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <Link to="/intro" className="welcome-intro"><Play size={14} aria-hidden="true" />Watch the introduction</Link>
          </div>
          <div className="welcome-visual" aria-hidden="true">
            <div className="welcome-orbit" />
            <HologramX />
            <span className="welcome-visual-caption">One ecosystem. Infinite opportunities.</span>
          </div>
        </section>
        <section id="explore" className="welcome-explore" aria-labelledby="explore-title">
          <div className="welcome-section-heading">
            <p className="welcome-eyebrow">Your place in LabX</p>
            <h2 id="explore-title">Different roles. Shared ambition.</h2>
            <p>Explore freely. Create an account when you’re ready.</p>
          </div>
          <div className="welcome-roles">
            {roles.map(({ name, icon: Icon, text }, index) => (
              <article className="welcome-role" key={name}>
                <div className="welcome-role-heading"><Icon size={22} aria-hidden="true" /><span>0{index + 1}</span></div>
                <h3>{name}</h3>
                <p>{text}</p>
                <Link to={`/register?role=${name.toLowerCase()}`}>Join as {name === 'Investor' ? 'an' : 'a'} {name.toLowerCase()}<ArrowRight size={16} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="welcome-footer"><span>LabX by ZeAI</span><span>Demo preview · Accounts and verification are simulated.</span></footer>
    </div>
  )
}
