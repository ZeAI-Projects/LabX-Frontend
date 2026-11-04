import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import { mockFollowers, mockFollowing } from '../../social/services/mock_social.js'
import { ConnectionListDialog } from './ProfileSocialDialogs.jsx'

let demoFollowingIds = new Set(mockFollowing.map((person) => person.id))

export function ProfileSocialSummary() {
  const [params, setParams] = useSearchParams()
  const dialog = ['followers', 'following'].includes(params.get('connections')) ? params.get('connections') : null
  const [followingIds, setFollowingIds] = useState(() => new Set(demoFollowingIds))
  const followablePeople = [...mockFollowing, ...mockFollowers]
  const following = followablePeople.filter((person) => followingIds.has(person.id))

  function toggleFollowing(personId) {
    setFollowingIds((current) => {
      const next = new Set(current)
      if (next.has(personId)) next.delete(personId)
      else next.add(personId)
      demoFollowingIds = next
      return next
    })
  }

  function showConnections(value) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('connections', value)
      return next
    })
  }

  function closeConnections() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('connections')
      return next
    }, { replace: true })
  }

  return <>
    <div className="pf-social-summary" aria-label="Founder social profile">
      <button className="pf-social-metric" type="button" onClick={() => showConnections('followers')} aria-label={`${mockFollowers.length} Followers`}>
        <strong>{mockFollowers.length.toLocaleString('en-IN')}</strong><span>Followers</span>
      </button>
      <button className="pf-social-metric" type="button" onClick={() => showConnections('following')} aria-label={`${following.length} Following`}>
        <strong>{following.length.toLocaleString('en-IN')}</strong><span>Following</span>
      </button>
      <Link className="pf-my-posts-link" to="/social"><Users size={15} aria-hidden="true" />My Posts<ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
    {dialog === 'followers' && <ConnectionListDialog
      title="Followers"
      users={mockFollowers}
      total={mockFollowers.length}
      followingIds={followingIds}
      onToggleFollowing={toggleFollowing}
      onClose={closeConnections}
    />}
    {dialog === 'following' && <ConnectionListDialog
      title="Following"
      users={following}
      total={following.length}
      followingIds={followingIds}
      onToggleFollowing={toggleFollowing}
      onClose={closeConnections}
    />}
  </>
}
