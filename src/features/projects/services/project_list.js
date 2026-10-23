import { ASSESSMENT_QUESTION_COUNT, DOMAIN_OPTIONS, validateAssessmentStep } from '../../assessment/services/mock_assessment.js';

export const PROJECTS_PER_PAGE = 10;
export const PROJECT_STATUSES = [
  ['pending', 'Assessment pending'],
  ['in-progress', 'Assessment in progress'],
  ['ready', 'Roadmap ready'],
  ['completed', 'Roadmap completed'],
];
export const PROJECT_SORTS = [
  ['updated', 'Recently updated'],
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['name-asc', 'Name: A to Z'],
  ['name-desc', 'Name: Z to A'],
];
export const UNSET_DOMAIN = '__unset__';
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function projectDetails(project) {
  const answeredCount = Array.from({ length: ASSESSMENT_QUESTION_COUNT }, (_, index) => index + 1)
    .filter((step) => !validateAssessmentStep(project.draft?.answers, step)).length;
  return {
    answeredCount,
    domain: (project.assessment_completed ? project.assessment_result?.domain : DOMAIN_OPTIONS[(project.draft?.answers?.q1 || 0) - 1]) || '',
    status: project.assessment_completed ? project.roadmap_snapshot?.isComplete ? 'completed' : 'ready' : answeredCount ? 'in-progress' : 'pending',
  };
}

export function projectDomains(projects) {
  return [...new Set(projects.map((project) => projectDetails(project).domain || UNSET_DOMAIN))]
    .sort((a, b) => a === UNSET_DOMAIN ? 1 : b === UNSET_DOMAIN ? -1 : collator.compare(a, b));
}

export function selectProjects(projects, { query = '', status = '', domain = '', sort = 'updated', page = 1 } = {}) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = projects.filter((project) => {
    const details = projectDetails(project);
    const text = `${project.name} ${details.domain} ${project.created_by || ''}`.toLocaleLowerCase();
    return (!status || details.status === status)
      && (!domain || (details.domain || UNSET_DOMAIN) === domain)
      && words.every((word) => text.includes(word));
  });
  const timestamp = (value) => Date.parse(value) || 0;
  filtered.sort((a, b) => {
    let order;
    if (sort === 'name-asc') order = collator.compare(a.name, b.name);
    else if (sort === 'name-desc') order = collator.compare(b.name, a.name);
    else if (sort === 'oldest') order = timestamp(a.created_at) - timestamp(b.created_at);
    else if (sort === 'newest') order = timestamp(b.created_at) - timestamp(a.created_at);
    else order = timestamp(b.updated_at) - timestamp(a.updated_at);
    return order || collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));
  const currentPage = Math.min(pages, Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1));
  const start = (currentPage - 1) * PROJECTS_PER_PAGE;
  return { items: filtered.slice(start, start + PROJECTS_PER_PAGE), total, pages, page: currentPage, from: total ? start + 1 : 0, to: Math.min(start + PROJECTS_PER_PAGE, total) };
}

export function paginationItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const values = [...new Set([1, pages, ...Array.from({ length: 5 }, (_, index) => Math.min(pages - 2, Math.max(3, page)) - 2 + index)])].sort((a, b) => a - b);
  return values.flatMap((value, index) => index && value - values[index - 1] > 1 ? ['gap-' + value, value] : [value]);
}
