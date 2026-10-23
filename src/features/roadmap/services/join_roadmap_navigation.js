const popupParams = ['join', 'joinView', 'joinMethod', 'joinProject'];

export function joinRoadmapSearch(search = '', { view, method, projectId } = {}) {
  const params = new URLSearchParams(search);
  params.set('join', '1');
  if (view) params.set('joinView', view);
  if (method) params.set('joinMethod', method);
  if (projectId) params.set('joinProject', projectId);
  return params.toString();
}

export function closeJoinRoadmapSearch(search = '') {
  const params = new URLSearchParams(search);
  popupParams.forEach((key) => params.delete(key));
  return params.toString();
}

// Old shared invitation links retain their selected view and startup context.
export function legacyJoinRoadmapUrl(search = '') {
  const params = new URLSearchParams(search);
  for (const [legacy, current] of [['view', 'joinView'], ['method', 'joinMethod'], ['project', 'joinProject']]) {
    if (params.has(legacy)) params.set(current, params.get(legacy));
    params.delete(legacy);
  }
  params.set('join', '1');
  return `/roadmap?${params}`;
}
