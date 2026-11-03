import { ASSESSMENT_QUESTION_COUNT, DOMAIN_OPTIONS, validateAssessmentStep } from '../../assessment/services/mock_assessment.js';

export const PROJECTS_PER_PAGE = 4;
export const PROJECT_STATUSES = [
  ['pending', 'Assessment pending'],
  ['in-progress', 'Assessment in progress'],
  ['ready', 'Roadmap ready'],
  ['completed', 'Roadmap completed'],
];
export const PROJECT_SORTS = [
  ['updated', 'Recently updated'],
  ['name-asc', 'Name: A to Z'],
  ['name-desc', 'Name: Z to A'],
  ['status-asc', 'Status: A to Z'],
  ['status-desc', 'Status: Z to A'],
  ['domain-asc', 'Domain: A to Z'],
  ['domain-desc', 'Domain: Z to A'],
  ['creator-asc', 'Creator: A to Z'],
  ['creator-desc', 'Creator: Z to A'],
  ['progress-asc', 'Progress: Low to high'],
  ['progress-desc', 'Progress: High to low'],
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
];
export const UNSET_DOMAIN = '__unset__';
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function projectDetails(project) {
  if (project.visualDemo) {
    return {
      answeredCount: 0,
      domain: project.domain || '',
      status: project.status,
      progressPercent: project.progressPercent,
      stage: project.stage || '',
      level: project.level ?? null,
    };
  }
  const answeredCount = Array.from({ length: ASSESSMENT_QUESTION_COUNT }, (_, index) => index + 1)
    .filter((step) => !validateAssessmentStep(project.draft?.answers, step)).length;
  return {
    answeredCount,
    domain: (project.assessment_completed ? project.assessment_result?.domain : DOMAIN_OPTIONS[(project.draft?.answers?.q1 || 0) - 1]) || '',
    status: project.assessment_completed ? project.roadmap_snapshot?.isComplete ? 'completed' : 'ready' : answeredCount ? 'in-progress' : 'pending',
    progressPercent: project.assessment_completed
      ? project.roadmap_snapshot?.progressPercent ?? null
      : Math.round(answeredCount / ASSESSMENT_QUESTION_COUNT * 100),
    stage: project.roadmap_snapshot?.stages?.[project.roadmap_snapshot?.currentStageIndex]?.name || '',
    level: project.roadmap_snapshot?.currentLevel ?? null,
  };
}

export function projectDomains(projects) {
  return [...new Set(projects.map((project) => projectDetails(project).domain || UNSET_DOMAIN))]
    .sort((a, b) => a === UNSET_DOMAIN ? 1 : b === UNSET_DOMAIN ? -1 : collator.compare(a, b));
}

export function selectAllProjects(projects, { query = '', status = '', domain = '', sort = 'updated' } = {}) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = projects.map((project) => ({ project, details: projectDetails(project) })).filter(({ project, details }) => {
    const text = `${project.name} ${project.description || ''} ${details.domain} ${project.created_by || ''}`.toLocaleLowerCase();
    return (!status || details.status === status)
      && (!domain || (details.domain || UNSET_DOMAIN) === domain)
      && words.every((word) => text.includes(word));
  });
  const timestamp = (value) => Date.parse(value) || 0;
  const statusOrder = new Map(PROJECT_STATUSES.map(([value], index) => [value, index]));
  const textSorts = {
    'name-asc': (a, b) => collator.compare(a.project.name, b.project.name),
    'name-desc': (a, b) => collator.compare(b.project.name, a.project.name),
    'status-asc': (a, b) => statusOrder.get(a.details.status) - statusOrder.get(b.details.status),
    'status-desc': (a, b) => statusOrder.get(b.details.status) - statusOrder.get(a.details.status),
    'domain-asc': (a, b) => collator.compare(a.details.domain, b.details.domain),
    'domain-desc': (a, b) => collator.compare(b.details.domain, a.details.domain),
    'creator-asc': (a, b) => collator.compare(a.project.created_by || '', b.project.created_by || ''),
    'creator-desc': (a, b) => collator.compare(b.project.created_by || '', a.project.created_by || ''),
  };
  filtered.sort((a, b) => {
    let order = textSorts[sort]?.(a, b);
    if (sort === 'progress-asc') order = (a.details.progressPercent ?? -1) - (b.details.progressPercent ?? -1);
    else if (sort === 'progress-desc') order = (b.details.progressPercent ?? -1) - (a.details.progressPercent ?? -1);
    else if (sort === 'oldest') order = timestamp(a.project.created_at) - timestamp(b.project.created_at);
    else if (sort === 'newest') order = timestamp(b.project.created_at) - timestamp(a.project.created_at);
    else if (sort === 'updated') order = timestamp(b.project.updated_at) - timestamp(a.project.updated_at);
    return order || collator.compare(a.project.name, b.project.name) || collator.compare(a.project.id, b.project.id);
  });
  return { items: filtered.map(({ project }) => project), total: filtered.length };
}

export function selectProjects(projects, { page = 1, ...selection } = {}) {
  const { items, total } = selectAllProjects(projects, selection);
  const pages = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));
  const currentPage = Math.min(pages, Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1));
  const start = (currentPage - 1) * PROJECTS_PER_PAGE;
  return { items: items.slice(start, start + PROJECTS_PER_PAGE), total, pages, page: currentPage, from: total ? start + 1 : 0, to: Math.min(start + PROJECTS_PER_PAGE, total) };
}

export function paginationItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const values = [...new Set([1, pages, ...Array.from({ length: 5 }, (_, index) => Math.min(pages - 2, Math.max(3, page)) - 2 + index)])].sort((a, b) => a - b);
  return values.flatMap((value, index) => index && value - values[index - 1] > 1 ? ['gap-' + value, value] : [value]);
}
