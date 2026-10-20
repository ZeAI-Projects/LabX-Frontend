import { useEffect, useMemo, useState } from 'react'
import { PROFILE_CHANGE_EVENT, profileStore } from '../../features/profile/services/profile_store.js'

export function ProfileAvatar({ user }) {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener(PROFILE_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const photo = useMemo(() => {
    try { return profileStore.read(user.id).avatar?.dataUrl }
    catch { return null }
  }, [user.id, revision])
  const initials = (user.full_name || user.username || 'LabX Member').split(/\s+/)
    .slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
  return <span className="labx-user-avatar" aria-hidden="true">
    {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} /> : initials}
  </span>
}
