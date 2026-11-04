import { UserPlus, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProfileAvatar, ProfileDialog } from './ProfileDialog.jsx'

function ConnectionList({ users, followingIds, onToggleFollowing, title }) {
  if (!users.length) return <div className="pf-connection-empty"><span><UserPlus size={22} aria-hidden="true" /></span><h3>No {title.toLowerCase()} yet</h3><p>People will appear here as your LabX network grows.</p></div>

  return <ul className="pf-connection-list">
    {users.map((person) => {
      const isFollowing = followingIds.has(person.id)
      const profileHref = `/profile/${encodeURIComponent(person.id)}`
      return <li className="pf-connection-row" key={person.id}>
        <Link className="pf-connection-avatar-link" to={profileHref} aria-label={`View ${person.full_name}'s profile`}>
          <ProfileAvatar profile={person} small />
        </Link>
        <div className="pf-connection-person">
          <Link className="pf-connection-profile-link" to={profileHref}>{person.full_name}</Link>
          <Link className="pf-connection-username-link" to={profileHref}>@{person.username}</Link>
        </div>
        <button
          className={`pf-connection-action${isFollowing ? ' is-following' : ''}`}
          type="button"
          aria-pressed={isFollowing}
          aria-label={`${isFollowing ? 'Following' : 'Follow'} ${person.full_name}`}
          onClick={() => onToggleFollowing(person.id)}
        >
          {isFollowing ? <><UserRoundCheck size={15} aria-hidden="true" />Following</> : <><UserPlus size={15} aria-hidden="true" />Follow</>}
        </button>
      </li>
    })}
  </ul>
}

export function ConnectionListDialog({ title, users, total, followingIds, onToggleFollowing, onClose }) {
  return <ProfileDialog title={title} onClose={onClose} eyebrow="Your LabX network">
    <div className="pf-connections-content">
      <p className="pf-connections-total"><strong>{total.toLocaleString('en-IN')}</strong> {title.toLowerCase()}</p>
      <div className="pf-connections-scroll">
        <ConnectionList users={users} followingIds={followingIds} onToggleFollowing={onToggleFollowing} title={title} />
      </div>
    </div>
  </ProfileDialog>
}
