import { getRankClass } from '../services/leaderboardUtils.js'

export default function PodiumCard({ founder, leaderboardAction, onAction }) {
  const { rank } = founder
  const place = rank === 1 ? 'CHAMPION' : rank === 2 ? 'RUNNER UP' : 'TOP 3'

  return (
    <button
      type="button"
      className={`podium-card ${getRankClass(rank)}`}
      aria-label={`Rank ${rank}: ${founder.full_name}`}
      onClick={() => onAction(leaderboardAction, founder)}
    >
      <div className="podium-medal"><span>{rank === 1 ? '♛' : '✦'}</span><span>{place}</span></div>
      <div className="podium-avatar"><span>{founder.full_name[0]}</span><div className="podium-rank">#{rank}</div></div>
      <h3>{founder.full_name}</h3>
      <span className="podium-username">@{founder.username}</span>
      <div className="podium-tags">
        <span>{founder.domain_icon} {founder.domain}</span>
        <span>{founder.stage}</span>
        <span className="lb-status">{founder.eligible ? 'Eligible' : 'Not eligible'}</span>
      </div>
      <div className="podium-score">
        <div><strong>{founder.total_points.toLocaleString()}</strong><span>POINTS</span></div>
        <div className="score-divider" />
        <div><strong style={{ color: '#c084fc' }}>{founder.badges_count}</strong><span>BADGES</span></div>
      </div>
      <div className="podium-view"><span>View Leaderboard</span><span>↗</span></div>
    </button>
  )
}
