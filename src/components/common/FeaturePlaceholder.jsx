import { ArrowLeft, Bell, Bot, Sparkles, Trophy, UserRound, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import './FeaturePlaceholder.css'

const destinations = {
  '/leaderboard': { icon: Trophy, label: 'Leaderboard', description: 'Discover the founders making progress across LabX.' },
  '/guild': { icon: Bot, label: 'Guilds', description: 'Connect with the community working in your domain.' },
  '/social': { icon: Users, label: 'Social', description: 'Share what you are building and learn from other members.' },
  '/profile': { icon: UserRound, label: 'Profile', description: 'Your full profile and founder passport will be available here.' },
  '/notifications': { icon: Bell, label: 'Notifications', description: 'Your activity updates and event reminders will appear here.' },
}

export function FeaturePlaceholder() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const destination = destinations[pathname.replace(/\/+$/, '')] || destinations['/profile']
  const Icon = destination.icon

  return (
    <section className="feature-placeholder glass-card" aria-label={`${destination.label} preview`}>
      <div className="feature-placeholder__icon"><Icon size={34} /></div>
      <span className="feature-placeholder__status"><Sparkles size={14} /> Coming soon</span>
      <h2>{destination.label}</h2>
      <p>{destination.description}</p>
      {destination.label === 'Profile' && (
        <dl>
          <div><dt>Full name</dt><dd>{user.full_name}</dd></div>
          <div><dt>Username</dt><dd>@{user.username || user.email.split('@')[0]}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Role</dt><dd>{user.role === 'mentor' ? 'Mentor' : 'Founder'}</dd></div>
        </dl>
      )}
      <Link to="/dashboard" className="btn btn-secondary"><ArrowLeft size={16} />Back to Dashboard</Link>
    </section>
  )
}
