import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationItems, projectDetails, projectDomains, selectProjects, UNSET_DOMAIN } from '../src/features/projects/services/project_list.js';

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

test('pagination uses ten projects, counts filtered results, and never repeats a record', () => {
  const many = Array.from({ length: 23 }, (_, i) => project(i + 1));
  const pages = [1, 2, 3].map((page) => selectProjects(many, { page }));
  assert.deepEqual(pages.map((value) => value.items.length), [10, 10, 3]);
  assert.deepEqual(pages.map(({ from, to }) => [from, to]), [[1, 10], [11, 20], [21, 23]]);
  assert.equal(new Set(pages.flatMap((value) => value.items.map((p) => p.id))).size, 23);
  const filtered = selectProjects(many, { query: 'Project 2', page: 4 });
  assert.equal(filtered.total, 6);
  assert.equal(filtered.page, 1);
});

test('out-of-range pages clamp after deletion, malformed pages and empty results are safe', () => {
  const ten = Array.from({ length: 10 }, (_, i) => project(i + 1));
  assert.equal(selectProjects(ten, { page: 2 }).page, 1);
  for (const page of [-1, 'garbage', '2.5', Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(selectProjects(ten, { page }).page, 1);
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
