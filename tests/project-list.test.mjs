import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRoadmapDate, paginationItems, projectDetails, projectDomains, PROJECTS_PER_PAGE, selectProjects, UNSET_DOMAIN } from '../src/features/projects/services/project_list.js';
import { ROADMAP_VISUAL_INVITATION_DATA, ROADMAP_VISUAL_JOINED_DATA, ROADMAP_VISUAL_MOCK_DATA, ROADMAP_VISUAL_MY_DATA } from '../src/features/projects/services/roadmap_visual_mock_data.js';
import { createMockRoadmap } from '../src/features/roadmap/services/mock_roadmap.js';

const project = (id, overrides = {}) => ({ id: String(id), name: `Project ${id}`, created_by: 'Sam', created_at: `2026-10-${String(id).padStart(2, '0')}T12:00:00Z`, updated_at: `2026-10-${String(id).padStart(2, '0')}T12:00:00Z`, ...overrides });
const ready = project(1, { name: 'Health Bridge', assessment_completed: true, assessment_result: { domain: 'Healthcare & MedTech' } });
const pending = project(2);
const draft = project(3, { name: 'Learning Loop', draft: { answers: { q1: 2 } } });
const completed = project(4, { name: 'Education Connect', assessment_completed: true, assessment_result: { domain: 'Education' }, roadmap_snapshot: { isComplete: true } });
const projects = [ready, pending, draft, completed];

test('status and domains reflect assessment drafts and actual roadmap completion', () => {
  assert.deepEqual(projects.map((value) => projectDetails(value).status), ['ready', 'pending', 'in-progress', 'completed']);
  assert.equal(projectDetails(draft).answeredCount, 1);
  assert.equal(projectDetails(draft).domain, 'Education');
  assert.equal(projectDetails(project(5, { draft: { answers: { q1: 999, q2: -1 } } })).status, 'pending');
  assert.deepEqual(projectDomains(projects), ['Education', 'Healthcare & MedTech', UNSET_DOMAIN]);
});

test('roadmap table dates use ordinal day, abbreviated month and year', () => {
  assert.equal(formatRoadmapDate('2026-10-23T12:00:00Z'), '23rd Oct 2026');
  assert.equal(formatRoadmapDate('2026-10-01T12:00:00Z'), '1st Oct 2026');
  assert.equal(formatRoadmapDate('2026-10-02T12:00:00Z'), '2nd Oct 2026');
  assert.equal(formatRoadmapDate('2026-10-03T12:00:00Z'), '3rd Oct 2026');
  assert.equal(formatRoadmapDate('2026-10-11T12:00:00Z'), '11th Oct 2026');
  assert.equal(formatRoadmapDate('not-a-date'), '—');
  assert.equal(formatRoadmapDate(null), '—');
});

test('search combines case-insensitive words across name, domain and creator with filters', () => {
  assert.deepEqual(selectProjects(projects, { query: '  EDUCATION sam ' }).items.map((p) => p.id), ['4', '3']);
  assert.deepEqual(selectProjects(projects, { query: 'learning', status: 'in-progress', domain: 'Education' }).items.map((p) => p.id), ['3']);
  assert.equal(selectProjects(projects, { query: 'learning', status: 'completed' }).total, 0);
  assert.deepEqual(selectProjects(projects, { domain: UNSET_DOMAIN }).items, [pending]);
});

test('all sort orders are deterministic and leave the original collection intact', () => {
  const before = structuredClone(projects);
  assert.deepEqual(selectProjects(projects, { sort: 'newest' }).items.map((p) => p.id), ['4', '3', '2', '1']);
  assert.deepEqual(selectProjects(projects, { sort: 'oldest' }).items.map((p) => p.id), ['1', '2', '3', '4']);
  assert.deepEqual(selectProjects(projects, { sort: 'name-asc' }).items.map((p) => p.name), ['Education Connect', 'Health Bridge', 'Learning Loop', 'Project 2']);
  assert.equal(selectProjects(projects, { sort: 'name-desc' }).items[0].id, '2');
  assert.equal(selectProjects([...projects, project(5, { updated_at: '2027-01-01' })]).items[0].id, '5');
  assert.deepEqual(projects, before);
});

test('pagination shows ten projects per page, counts filtered results, and never repeats a record', () => {
  const many = Array.from({ length: 23 }, (_, i) => project(i + 1));
  const pages = Array.from({ length: 3 }, (_, index) => selectProjects(many, { page: index + 1 }));
  assert.equal(PROJECTS_PER_PAGE, 10);
  assert.deepEqual(pages.map((value) => value.items.length), [10, 10, 3]);
  assert.deepEqual(pages.map(({ from, to }) => [from, to]), [[1, 10], [11, 20], [21, 23]]);
  assert.equal(new Set(pages.flatMap((value) => value.items.map((p) => p.id))).size, 23);
  const filtered = selectProjects(many, { query: 'Project 2', page: 4 });
  assert.equal(filtered.total, 6);
  assert.equal(filtered.page, 1);
});

test('out-of-range pages clamp after deletion, malformed pages and empty results are safe', () => {
  const four = Array.from({ length: 4 }, (_, i) => project(i + 1));
  assert.equal(selectProjects(four, { page: 2 }).page, 1);
  for (const page of [-1, 'garbage', '2.5', Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(selectProjects(four, { page }).page, 1);
  assert.deepEqual(selectProjects([], { page: 999 }), { items: [], total: 0, pages: 1, page: 1, from: 0, to: 0 });
});

test('numbered pages remain bounded and include the current, first and last page', () => {
  assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
  for (const page of [1, 2, 5, 50, 99, 100]) {
    const numbers = paginationItems(page, 100).filter((value) => typeof value === 'number');
    assert(numbers.includes(1) && numbers.includes(page) && numbers.includes(100));
    assert(numbers.length <= 7);
    assert(numbers.every((value) => value >= 1 && value <= 100));
  }
});

test('roadmap visual fixtures populate realistic statuses, domains, creators and placements', () => {
  assert.ok(ROADMAP_VISUAL_MOCK_DATA.length > 10);
  assert.equal(new Set(ROADMAP_VISUAL_MOCK_DATA.map(({ id }) => id)).size, ROADMAP_VISUAL_MOCK_DATA.length);
  assert.deepEqual(new Set(ROADMAP_VISUAL_MOCK_DATA.map(({ status }) => status)), new Set(['pending', 'in-progress', 'ready', 'completed']));
  assert.ok(new Set(ROADMAP_VISUAL_MOCK_DATA.map(({ domain }) => domain)).size >= 5);
  assert.ok(new Set(ROADMAP_VISUAL_MOCK_DATA.map(({ created_by }) => created_by)).size >= 5);
  assert.ok(ROADMAP_VISUAL_MOCK_DATA.some(({ name }) => name === 'Happora'));
  assert.ok(ROADMAP_VISUAL_MOCK_DATA.every(({ description, created_by, stage, level, progressPercent }) => description && created_by && stage && level && progressPercent >= 0 && progressPercent <= 100));
});

test('roadmap visual fixtures separate owned, joined and invitation collections', () => {
  assert.equal(ROADMAP_VISUAL_MY_DATA.length, 15);
  assert.ok(ROADMAP_VISUAL_MY_DATA.every(({ visualCollection, owner_id }) => visualCollection === 'my' && owner_id === 'demo-founder'));
  assert.equal(ROADMAP_VISUAL_JOINED_DATA.length, 15);
  assert.ok(ROADMAP_VISUAL_JOINED_DATA.every(({ visualCollection, owner_id }) => visualCollection === 'joined' && !owner_id));
  assert.ok(ROADMAP_VISUAL_JOINED_DATA.every(({ expiresAt, assignmentWorkStatus }) => Number.isFinite(Date.parse(expiresAt)) && ['assigned', 'in_progress', 'completed'].includes(assignmentWorkStatus)));
  assert.ok(ROADMAP_VISUAL_JOINED_DATA.some(({ stage, stageNumber, progressPercent, level, currentMission }) => stage === 'Launch' && stageNumber === 4 && progressPercent > 0 && level && currentMission));
  assert.ok(ROADMAP_VISUAL_JOINED_DATA.some(({ stage, stageNumber, progressPercent, level, currentMission }) => stage === 'Launch' && stageNumber === 4 && progressPercent === 0 && level && currentMission));
  assert.equal(ROADMAP_VISUAL_INVITATION_DATA.length, 2);
  assert.ok(ROADMAP_VISUAL_INVITATION_DATA.every(({ status, visualDemo, project, inviter }) => status === 'pending' && visualDemo && project.description && project.stage && project.level && inviter.full_name));
  assert.equal(projectDomains(ROADMAP_VISUAL_MOCK_DATA).length, 12, 'Domain filters can offer every roadmap prototype domain');
});

test('every owned roadmap and joined mission links to a complete roadmap journey', () => {
  for (const project of [...ROADMAP_VISUAL_MY_DATA, ...ROADMAP_VISUAL_JOINED_DATA]) {
    const roadmap = createMockRoadmap({ domain: project.domain, stage: project.stage, level: project.level, prototype: true });
    assert.equal(roadmap.stages.length, 5, `${project.name} has all roadmap stages`);
    assert.equal(roadmap.stages.flatMap(({ levels }) => levels).length, 25, `${project.name} has all roadmap levels`);
    assert.equal(roadmap.stages.flatMap(({ levels }) => levels.flatMap(({ milestones }) => milestones)).length, 75, `${project.name} has all roadmap missions`);
  }
});

test('joined roadmap fixtures support the shared search, status, domain and creator sort controls', () => {
  const civicThread = selectProjects(ROADMAP_VISUAL_JOINED_DATA, {
    query: 'CivicThread Jordan',
    status: 'ready',
    domain: 'Civic Technology',
  });
  assert.deepEqual(civicThread.items.map(({ name }) => name), ['CivicThread']);
  const creators = selectProjects(ROADMAP_VISUAL_JOINED_DATA, { sort: 'creator-asc' });
  assert.deepEqual(creators.items.map(({ created_by }) => created_by), [...creators.items.map(({ created_by }) => created_by)].sort((a, b) => a.localeCompare(b)));
});

test('mock roadmaps support combined search, status and domain filtering with sorting and inline batches', () => {
  const matching = selectProjects(ROADMAP_VISUAL_MOCK_DATA, {
    query: 'cardiac healthtech Ethan',
    status: 'in-progress',
    domain: 'HealthTech',
    sort: 'name-asc',
  });
  assert.deepEqual(matching.items.map(({ name }) => name), ['PulsePath']);
  const pages = Array.from({ length: Math.ceil(ROADMAP_VISUAL_MOCK_DATA.length / PROJECTS_PER_PAGE) }, (_, index) => selectProjects(ROADMAP_VISUAL_MOCK_DATA, { page: index + 1 }));
  assert.equal(pages[0].items.length, PROJECTS_PER_PAGE);
  assert.equal(pages.flatMap(({ items }) => items).length, ROADMAP_VISUAL_MOCK_DATA.length);
  assert.equal(new Set(pages.flatMap(({ items }) => items.map(({ id }) => id))).size, ROADMAP_VISUAL_MOCK_DATA.length);
});

test('table sort modes order status, domain and roadmap progress', () => {
  const values = [project(1, { visualDemo: true, status: 'pending', domain: 'Zeta', created_by: 'Zed', progressPercent: 0 }), project(2, { visualDemo: true, status: 'completed', domain: 'Alpha', created_by: 'Ada', progressPercent: 100 }), project(3, { visualDemo: true, status: 'ready', domain: 'Middle', created_by: 'Mina', progressPercent: 50 })];
  assert.deepEqual(selectProjects(values, { sort: 'domain-asc' }).items.map(({ id }) => id), ['2', '3', '1']);
  assert.deepEqual(selectProjects(values, { sort: 'progress-asc' }).items.map(({ id }) => id), ['1', '3', '2']);
  assert.deepEqual(selectProjects(values, { sort: 'status-asc' }).items.map(({ id }) => id), ['1', '3', '2']);
  assert.deepEqual(selectProjects(values, { sort: 'creator-asc' }).items.map(({ id }) => id), ['2', '3', '1']);
  assert.deepEqual(selectProjects(values, { sort: 'creator-desc' }).items.map(({ id }) => id), ['1', '3', '2']);
});
