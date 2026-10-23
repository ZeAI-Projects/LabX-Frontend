import { createContext, useContext } from 'react'
export const SharpContext = createContext(null)
export function useSharp() {
  const value = useContext(SharpContext)
  if (!value) throw new Error('Zenith AI requires its account provider.')
  return value
}
