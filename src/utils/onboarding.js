export function getRegistrationDestination(user) {
  if (!user) return '/login'
  if (user.role === 'mentor') return '/mentor/assessment'
  return '/assessment'
}

export function getLoginDestination(user) {
  return user ? '/dashboard' : '/login'
}
