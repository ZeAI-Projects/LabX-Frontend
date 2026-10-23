import assert from 'node:assert/strict';
import test from 'node:test';
import { closeJoinRoadmapSearch, joinRoadmapSearch, legacyJoinRoadmapUrl } from '../src/features/roadmap/services/join_roadmap_navigation.js';

test('opening and closing Join Roadmap preserves the underlying roadmap view and filters', () => {
  const search = '?view=joined&q=Research&page=2&stage=Validate';
  const open = new URLSearchParams(joinRoadmapSearch(search, { view: 'founder', method: 'direct', projectId: 'project / one' }));
  assert.equal(open.get('join'), '1');
  assert.equal(open.get('joinView'), 'founder');
  assert.equal(open.get('joinMethod'), 'direct');
  assert.equal(open.get('joinProject'), 'project / one');
  assert.deepEqual([...new URLSearchParams(closeJoinRoadmapSearch(open))], [...new URLSearchParams(search)]);
});

test('legacy Join Roadmap bookmarks retain invitation context and notices in the popup', () => {
  const url = new URL(legacyJoinRoadmapUrl('?view=activity&method=direct&project=project%2F1&notice=accepted'), 'https://labx.test');
  assert.equal(url.pathname, '/roadmap');
  assert.equal(url.searchParams.get('join'), '1');
  assert.equal(url.searchParams.get('joinView'), 'activity');
  assert.equal(url.searchParams.get('joinMethod'), 'direct');
  assert.equal(url.searchParams.get('joinProject'), 'project/1');
  assert.equal(url.searchParams.get('notice'), 'accepted');
  assert.equal(url.searchParams.has('view'), false);
});
