import { normalizeAssessmentDraft, readAssessmentDraft, saveAssessmentDraft } from '../../assessment/services/assessment_draft.js';
import { evaluateAssessment } from '../../assessment/services/mock_assessment.js';

const draftOwner = (projectId) => `visual-project:${projectId}`;
const assessmentKey = (projectId) => `labx:visual-project-assessment:v1:${encodeURIComponent(projectId)}`;

export function readMockAssessment(projectId) {
  const storage = globalThis.localStorage;
  const draft = readAssessmentDraft(storage, draftOwner(projectId));
  let saved;
  try {
    saved = storage?.getItem(assessmentKey(projectId));
  } catch (error) {
    throw new Error('Unable to load this demo assessment from browser storage.', { cause: error });
  }
  if (!saved) return { draft, completed: false, result: null, answers: null };
  let value;
  try {
    value = JSON.parse(saved);
  } catch (error) {
    throw new Error("The saved demo assessment is invalid. Clear this browser's site data and try again.", { cause: error });
  }
  return {
    draft,
    completed: value?.completed === true,
    result: value?.completed === true && value.result && typeof value.result === 'object' ? value.result : null,
    answers: value?.completed === true && value.answers && typeof value.answers === 'object' ? value.answers : null,
  };
}

export function saveMockAssessmentDraft(projectId, draft) {
  const storage = globalThis.localStorage;
  if (!saveAssessmentDraft(storage, draftOwner(projectId), draft)) {
    throw new Error('Unable to save this demo assessment. Check your browser storage and try again.');
  }
  return normalizeAssessmentDraft(draft);
}

export function completeMockAssessment(projectId, answers) {
  const storage = globalThis.localStorage;
  if (!storage) throw new Error('Browser storage is unavailable, so this demo assessment cannot be completed.');
  const result = evaluateAssessment(answers);
  try {
    storage.setItem(assessmentKey(projectId), JSON.stringify({ completed: true, result, answers }));
  } catch (error) {
    throw new Error('Unable to save this completed demo assessment. Check your browser storage and try again.', { cause: error });
  }
  return { ...readMockAssessment(projectId), completed: true, result, answers };
}
