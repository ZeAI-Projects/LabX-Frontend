function routePart(value) {
  try {
    const decoded = decodeURIComponent(value)
    return decoded && !/[\\/]/.test(decoded) ? decoded : null
  } catch { return null }
}

export function getCompanionRoadmapRoute(pathname = '') {
  if (/^\/roadmap\/?$/.test(pathname)) return { kind: 'collection', pathname }
  const joined = /^\/roadmap\/joined\/([^/]+)\/([^/]+)\/?$/.exec(pathname)
  if (joined) {
    const ownerId = routePart(joined[1]), projectId = routePart(joined[2])
    if (ownerId && projectId) return { kind: 'joined', pathname, ownerId, projectId }
  }
  const owned = /^\/roadmap\/([^/]+)\/?$/.exec(pathname)
  if (owned) {
    const projectId = routePart(owned[1])
    if (projectId && !['new', 'join', 'joined'].includes(projectId)) return { kind: 'owned', pathname, projectId }
  }
  return null
}

export function getCompanionUrl({ pathname = '', search = '', projectId = '', ownerId = '', chatId = '', prompt = '' } = {}) {
  const route = getCompanionRoadmapRoute(pathname)
  const source = new URLSearchParams(search)
  const inChats = /^\/chats\/?$/.test(pathname)
  const params = new URLSearchParams(inChats ? search : '')
  const assessment = /^\/roadmap\/([^/]+)\/(?:assessment|result)\/?$/.exec(pathname)
  const contextProject = route && route.kind !== 'collection' ? route.projectId
    : projectId || (route?.kind === 'collection' || pathname === '/companion' ? source.get('project') : '')
      || (assessment ? routePart(assessment[1]) : '')
  const contextOwner = route?.kind === 'joined' ? route.ownerId : ownerId
  params.delete('milestone')
  params.delete('companion')
  params.delete('prompt')
  params.delete('tab')
  if (chatId) params.set('chat', chatId)
  if (contextProject) params.set('project', contextProject)
  if (contextOwner) params.set('owner', contextOwner)
  else if (!inChats) params.delete('owner')
  if (['brief', 'quest'].includes(prompt)) params.set('prompt', prompt)
  const query = params.toString()
  return `/chats${query ? `?${query}` : ''}`
}
