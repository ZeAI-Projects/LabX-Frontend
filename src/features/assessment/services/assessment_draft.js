import { createEmptyAnswers, normalizeDraftAnswers, validateAssessmentStep } from './mock_assessment.js';

export const draftKey = (userId) => `labx:assessment-draft:v1:${encodeURIComponent(userId)}`;

export function readAssessmentDraft(storage, userId) {
  const empty = { step: 1, answers: createEmptyAnswers() };
  if (!storage || !userId) return empty;
  try {
    const draft = JSON.parse(storage.getItem(draftKey(userId)));
    if (!draft || draft.version !== 1) return empty;
    const answers = normalizeDraftAnswers(draft.answers);
    const requestedStep = Number.isInteger(draft.step) ? Math.min(7, Math.max(1, draft.step)) : 1;
    let step = requestedStep;
    for (let previous = 1; previous < requestedStep; previous += 1) {
      if (validateAssessmentStep(answers, previous)) {
        step = previous;
        break;
      }
    }
    return { step, answers };
  } catch {
    return empty;
  }
}

export function saveAssessmentDraft(storage, userId, draft) {
  if (!storage || !userId) return false;
  try {
    storage.setItem(draftKey(userId), JSON.stringify({ version: 1, ...draft }));
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
