import {
  ASSESSMENT_QUESTION_COUNT, ASSESSMENT_VERSION, createEmptyAnswers,
  normalizeDraftAnswers, validateAssessmentStep,
} from './mock_assessment.js';

// Keep the storage key so older drafts can be found and safely replaced.
export const draftKey = (userId) => `labx:assessment-draft:v1:${encodeURIComponent(userId)}`;

export function createEmptyDraft() {
  return { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers() };
}

export function normalizeAssessmentDraft(value) {
  const empty = createEmptyDraft();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty;
  if (value.version !== ASSESSMENT_VERSION) {
    const hadAnswers = value.answers && typeof value.answers === 'object'
      && Object.values(value.answers).some((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined);
    return hadAnswers ? { ...empty, questionsUpdated: true } : empty;
  }
  const answers = normalizeDraftAnswers(value.answers);
  let step = Number.isInteger(value.step) ? Math.min(ASSESSMENT_QUESTION_COUNT, Math.max(1, value.step)) : 1;
  for (let previous = 1; previous < step; previous += 1) {
    if (validateAssessmentStep(answers, previous)) {
      step = previous;
      break;
    }
  }
  return { version: ASSESSMENT_VERSION, step, answers, ...(value.questionsUpdated === true ? { questionsUpdated: true } : {}) };
}

export function readAssessmentDraft(storage, userId) {
  if (!storage || !userId) return createEmptyDraft();
  try {
    return normalizeAssessmentDraft(JSON.parse(storage.getItem(draftKey(userId))));
  } catch {
    return createEmptyDraft();
  }
}

export function saveAssessmentDraft(storage, userId, draft) {
  if (!storage || !userId) return false;
  try {
    storage.setItem(draftKey(userId), JSON.stringify(normalizeAssessmentDraft(draft)));
    return true;
  } catch {
    return false;
  }
}

export function removeAssessmentDraft(storage, userId) {
  if (!storage || !userId) return;
  try {
    storage.removeItem(draftKey(userId));
  } catch {
    // The assessment remains usable when browser storage is disabled.
  }
}
