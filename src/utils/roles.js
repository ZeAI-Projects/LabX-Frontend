const roleLabels = {
  founder: 'Founder',
  mentor: 'Mentor',
  investor: 'Investor',
}

export function getRoleLabel(role) {
  return roleLabels[role] || 'Member'
}
