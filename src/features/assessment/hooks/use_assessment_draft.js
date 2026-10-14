import { useEffect, useRef, useState } from 'react';
import { readAssessmentDraft, removeAssessmentDraft, saveAssessmentDraft } from '../services/assessment_draft.js';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// AssessmentWizard keys its stateful child by user ID to isolate signed-in drafts.
export function useAssessmentDraft(userId) {
  const [draft, setDraft] = useState(() => readAssessmentDraft(getStorage(), userId));
  const completed = useRef(false);

  useEffect(() => {
    if (!completed.current) saveAssessmentDraft(getStorage(), userId, draft);
  }, [userId, draft]);

  function clearDraft() {
    completed.current = true;
    removeAssessmentDraft(getStorage(), userId);
  }

  return { draft, setDraft, clearDraft };
}
