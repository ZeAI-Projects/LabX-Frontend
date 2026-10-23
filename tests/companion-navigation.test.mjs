import assert from 'node:assert/strict'
import test from 'node:test'
import { getCompanionRoadmapRoute, getCompanionUrl } from '../src/features/companion/services/companion_navigation.js'

test('roadmap help opens Chats with its own project instead of keeping roadmap overlay state', () => {
  const result = new URL(getCompanionUrl({ pathname: '/roadmap/venture', search: '?stage=Build&milestone=build-l1-m1&project=unrelated', projectId: 'unrelated', tab: 'settings' }), 'https://labx.example')
  assert.equal(result.pathname, '/chats')
  assert.equal(result.searchParams.get('project'), 'venture')
  assert.equal(result.searchParams.has('tab'), false)
  assert.equal(result.searchParams.has('companion'), false)
  assert.equal(result.searchParams.has('milestone'), false)
  assert.equal(result.searchParams.has('stage'), false)
})

test('shared roadmap help retains authorized owner/project context in Chats', () => {
  assert.deepEqual(getCompanionRoadmapRoute('/roadmap/joined/owner%20one/venture%20two'), {
    kind: 'joined', pathname: '/roadmap/joined/owner%20one/venture%20two', ownerId: 'owner one', projectId: 'venture two',
  })
  assert.equal(getCompanionUrl({ pathname: '/roadmap/joined/owner/venture', search: '?stage=Validate&milestone=validate-l1-m1', prompt: 'quest' }), '/chats?project=venture&owner=owner&prompt=quest')
})

test('Chats retains the selected conversation and removes retired sections and consumed prompts', () => {
  const result = new URL(getCompanionUrl({ pathname: '/chats', search: '?chat=saved&project=venture&owner=founder&prompt=brief', tab: 'settings' }), 'https://labx.example')
  assert.equal(result.searchParams.get('chat'), 'saved')
  assert.equal(result.searchParams.get('project'), 'venture')
  assert.equal(result.searchParams.get('owner'), 'founder')
  assert.equal(result.searchParams.has('tab'), false)
  assert.equal(result.searchParams.has('prompt'), false)
  assert.equal(getCompanionUrl({ pathname: '/chats', search: '?chat=saved&tab=memory' }), '/chats?chat=saved')
  for (const removedTab of ['memory', 'insights', 'settings']) {
    assert.equal(getCompanionUrl({ pathname: '/chats', search: '?chat=saved&project=venture&owner=founder', tab: removedTab }), '/chats?chat=saved&project=venture&owner=founder')
  }
})

test('dashboard and legacy links support explicit context and exact saved conversations', () => {
  assert.equal(getCompanionUrl({ pathname: '/dashboard', projectId: 'venture', chatId: 'saved', tab: 'chat' }), '/chats?chat=saved&project=venture')
  assert.equal(getCompanionUrl({ pathname: '/companion', projectId: 'shared', ownerId: 'owner', tab: 'settings' }), '/chats?project=shared&owner=owner')
  assert.equal(getCompanionUrl({ pathname: '/roadmap', search: '?view=joined&project=retained' }), '/chats?project=retained')
  assert.equal(getCompanionUrl({ pathname: '/roadmap/venture/assessment' }), '/chats?project=venture')
})

test('invalid roadmap paths cannot become shared project context or a destination', () => {
  for (const pathname of ['/dashboard', '/companion', '/roadmap/new', '/roadmap/join', '/roadmap/joined', '/roadmap/%E0%A4%A', '/roadmap/%2Fbad', '/roadmap/joined/owner/%5Cbad']) {
    assert.equal(getCompanionRoadmapRoute(pathname), null)
    assert.equal(getCompanionUrl({ pathname, search: '?unrelated=value', projectId: 'venture', tab: 'invalid', prompt: 'invalid' }), '/chats?project=venture')
  }
})
