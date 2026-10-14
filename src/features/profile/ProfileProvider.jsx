import { useEffect, useState } from 'react';
import { ProfileContext } from './profile-context';
import { readProfile, storageKey } from './profile-data';

export function ProfileProvider({children}) {
  const [data, setData] = useState(readProfile);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({version: 1, data}));
      // The persistence result must be surfaced when browser storage is unavailable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageError('');
    } catch { setStorageError('Changes are kept for this session only. Browser storage is unavailable or full.'); }
  }, [data]);
  const value = {data, setData, user: data.profile, isFounder: true, isAdmin: false, logout: () => {}, storageError};
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
