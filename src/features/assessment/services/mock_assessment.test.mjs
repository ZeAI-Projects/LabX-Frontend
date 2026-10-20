import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSESSMENT_QUESTIONS, ASSESSMENT_QUESTION_COUNT, ASSESSMENT_VERSION,
  DOMAIN_OPTIONS, createEmptyAnswers, evaluateAssessment, normalizeDraftAnswers, validateAssessmentStep,
} from './mock_assessment.js';
import {
  createEmptyDraft, draftKey, normalizeAssessmentDraft, readAssessmentDraft,
  removeAssessmentDraft, saveAssessmentDraft,
} from './assessment_draft.js';

const beginner = () => Object.fromEntries(ASSESSMENT_QUESTIONS.map(({ key }) => [key, 1]));
const experienced = () => ({ q1: 12, q2: 5, q3: 11, q4: 11, q5: 8, q6: 8, q7: 12, q8: 12 });
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('all eight questions require exactly one valid predefined answer, including the blocker', () => {
  assert.equal(ASSESSMENT_QUESTION_COUNT, 8);
  assert.deepEqual(ASSESSMENT_QUESTIONS.map(question => question.options.length), [17, 12, 12, 12, 9, 9, 13, 13]);
  for (let step = 1; step <= ASSESSMENT_QUESTION_COUNT; step += 1) {
    assert.ok(validateAssessmentStep(createEmptyAnswers(), step));
    assert.equal(validateAssessmentStep(beginner(), step), '');
    const key = `q${step}`;
    for (const value of [null, undefined, [], [1, 2], '1', 'Custom answer', 0, -1, 1.5, ASSESSMENT_QUESTIONS[step - 1].options.length + 1]) {
      assert.throws(() => evaluateAssessment({ ...beginner(), [key]: value }));
    }
  }
  for (const step of [0, 9, '1', 1.5]) assert.ok(validateAssessmentStep(beginner(), step));
});

test('every supplied selection is accepted without exposing a free-text escape', () => {
  for (const [index, question] of ASSESSMENT_QUESTIONS.entries()) {
    for (let answer = 1; answer <= question.options.length; answer += 1) {
      assert.equal(validateAssessmentStep({ [question.key]: answer }, index + 1), '');
    }
  }
  assert.equal(ASSESSMENT_QUESTIONS[2].options.includes('Not sure yet'), false);
  assert.equal(ASSESSMENT_QUESTIONS[7].options.at(-2), 'No major blocker');
});

test('selected problem areas set the domain and uncertain answers do not invent a guild', () => {
  DOMAIN_OPTIONS.forEach((domain, index) => {
    const result = evaluateAssessment({ ...beginner(), q1: index + 1 });
    assert.equal(result.domain, domain);
    assert.equal(result.guild, index < 15 ? `${domain} Guild` : null);
    assert.equal(result.assessment_version, ASSESSMENT_VERSION);
  });
});

test('new questions do not introduce an unsupported score or alter the existing placement workflow', () => {
  const first = evaluateAssessment(beginner());
  const advanced = evaluateAssessment({ ...experienced(), q1: 1 });
  assert.deepEqual(first, advanced);
  assert.equal(first.placement_status, 'mock');
  assert.equal(first.version, 3);
  assert.equal(first.isMock, true);
  assert.equal(Object.hasOwn(first, 'score'), false);
  const answers = experienced();
  const copy = structuredClone(answers);
  assert.deepEqual(evaluateAssessment(answers), evaluateAssessment(answers));
  assert.deepEqual(answers, copy);
});

test('versioned drafts preserve all eight answers and remain isolated between accounts', () => {
  const storage = memoryStorage();
  const draft = { version: ASSESSMENT_VERSION, step: 8, answers: beginner() };
  assert.equal(saveAssessmentDraft(storage, 'user-a', draft), true);
  assert.deepEqual(readAssessmentDraft(storage, 'user-a'), draft);
  assert.deepEqual(readAssessmentDraft(storage, 'user-b'), createEmptyDraft());
  saveAssessmentDraft(storage, 'user-b', { ...draft, step: 2, answers: { ...beginner(), q1: 12 } });
  removeAssessmentDraft(storage, 'user-a');
  assert.equal(storage.getItem(draftKey('user-a')), null);
  assert.equal(readAssessmentDraft(storage, 'user-b').answers.q1, 12);
});

test('old numeric answers are never reinterpreted as answers to different questions', () => {
  const old = { step: 4, answers: { q1: 1, q2: 3, q3: ['prototype'], q4: 2 } };
  for (const version of [undefined, 1]) {
    assert.deepEqual(normalizeAssessmentDraft({ ...old, version }), { ...createEmptyDraft(), questionsUpdated: true });
  }
  assert.deepEqual(normalizeAssessmentDraft({ step: 1, answers: { q1: null, q3: [] } }), createEmptyDraft());
  const fresh = { ...createEmptyDraft(), questionsUpdated: true, answers: { ...createEmptyAnswers(), q1: 1 } };
  assert.deepEqual(normalizeAssessmentDraft(fresh), fresh);
});

test('corrupt drafts recover safely and cannot skip unanswered questions', () => {
  const storage = memoryStorage();
  storage.setItem(draftKey('user'), '{broken');
  assert.deepEqual(readAssessmentDraft(storage, 'user'), createEmptyDraft());
  saveAssessmentDraft(storage, 'user', {
    version: ASSESSMENT_VERSION, step: 99,
    answers: { ...beginner(), q2: 99, q3: ['prototype'] },
  });
  const recovered = readAssessmentDraft(storage, 'user');
  assert.equal(recovered.step, 2);
  assert.equal(recovered.answers.q2, null);
  assert.equal(recovered.answers.q3, null);
  assert.equal(normalizeDraftAnswers({ ...beginner(), q8: 'Funding' }).q8, null);
  const blocked = { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Disabled'); } };
  assert.deepEqual(readAssessmentDraft(blocked, 'user'), createEmptyDraft());
  assert.equal(saveAssessmentDraft(blocked, 'user', createEmptyDraft()), false);
  assert.equal(saveAssessmentDraft(null, 'user', {}), false);
});
