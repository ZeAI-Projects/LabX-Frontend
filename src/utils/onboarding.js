export function getRegistrationDestination(user) {
  if (!user) return '/login'
  if (user.role === 'mentor') return '/onboarding/mentor'
  if (user.role === 'investor') return '/onboarding/investor'
  return user.role === 'founder' ? '/roadmap/new' : '/dashboard'
}

export function getLoginDestination(user) {
  return user ? '/dashboard' : '/login'
}
