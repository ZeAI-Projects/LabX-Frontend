import { Bell } from 'lucide-react'
import { useEffect, useReducer } from 'react'
import { Link } from 'react-router-dom'
import { getMockPointsBalance } from '../../features/achievements/services/mock_achievements.js'
import { getSideQuestCoinTotal, SIDE_QUEST_CHANGE_EVENT } from '../../features/dashboard/services/daily_side_quests.js'
import { FloatingXp } from './FloatingXp.jsx'

export function Header({ user, title }) {
  const [, refresh] = useReducer(value => value + 1, 0)
  useEffect(() => {
    for (const event of ['storage', 'focus', SIDE_QUEST_CHANGE_EVENT]) window.addEventListener(event, refresh)
    return () => { for (const event of ['storage', 'focus', SIDE_QUEST_CHANGE_EVENT]) window.removeEventListener(event, refresh) }
  }, [])
  const coins = getMockPointsBalance(user) + getSideQuestCoinTotal(user)

  return (
    <div className="labx-header">
      <div className="labx-navbar-title">
        <h1 className="labx-page-title">{title}</h1>
      </div>
      <div className="labx-navbar-actions">
        <FloatingXp points={coins} />
        <Link className="labx-notification-btn" to="/notifications" aria-label="Notifications">
          <Bell size={18} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
