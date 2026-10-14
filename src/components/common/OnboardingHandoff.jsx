import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

// The Mentor question set remains separate and unspecified in the requirements.
export function OnboardingHandoff() {
  return (
    <section className="onboarding-complete">
      <div className="glass-card">
        <span className="onboarding-complete__badge"><GraduationCap size={20} />Mentor onboarding</span>
        <h1>Mentor Assessment</h1>
        <p>Your Mentor account is ready. Your separate assessment is not available yet. You can return when it opens.</p>
        <div className="onboarding-complete__actions">
          <Link className="btn btn-primary" to="/dashboard">Go to Dashboard</Link>
        </div>
      </div>
    </section>
  )
}
