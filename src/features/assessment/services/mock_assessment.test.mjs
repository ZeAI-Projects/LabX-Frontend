import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAIN_OPTIONS, EVIDENCE_OPTIONS, createEmptyAnswers, evaluateAssessment,
  toggleEvidence, validateAssessmentStep,
} from './mock_assessment.js';
import {
  draftKey, readAssessmentDraft, removeAssessmentDraft, saveAssessmentDraft,
} from './assessment_draft.js';

const beginner = () => ({ q1: 1, q2: 1, q3: ['none_yet'], q4: 1, q5: 1, q6: 1, q7: 1 });
const experienced = () => ({
  q1: 12, q2: 9, q3: EVIDENCE_OPTIONS.filter(({ key }) => key !== 'none_yet').map(({ key }) => key),
  q4: 5, q5: 6, q6: 7, q7: 9,
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('all seven steps require valid answers before evaluation', () => {
  for (let step = 1; step <= 7; step += 1) {
    assert.ok(validateAssessmentStep(createEmptyAnswers(), step));
    assert.equal(validateAssessmentStep(beginner(), step), '');
    const missing = { ...beginner(), [`q${step}`]: step === 3 ? [] : null };
    assert.throws(() => evaluateAssessment(missing));
  }
  for (const value of [-1, 0, 13, 1.5, '1']) {
    assert.throws(() => evaluateAssessment({ ...beginner(), q1: value }));
  }
  assert.throws(() => evaluateAssessment({ ...beginner(), q7: 10 }));
  assert.throws(() => evaluateAssessment({ ...beginner(), q3: ['unknown'] }));
  assert.throws(() => evaluateAssessment({ ...beginner(), q3: ['none_yet', 'prototype'] }));
});

test('evidence selection keeps None yet exclusive and allows clearing other choices', () => {
  assert.deepEqual(toggleEvidence(['prototype'], 'none_yet'), ['none_yet']);
  assert.deepEqual(toggleEvidence(['none_yet'], 'prototype'), ['prototype']);
  assert.deepEqual(toggleEvidence(['prototype'], 'prototype'), []);
  assert.deepEqual(toggleEvidence(['prototype'], 'working_mvp'), ['prototype', 'working_mvp']);
  assert.deepEqual(toggleEvidence(['prototype'], 'invalid'), ['prototype']);
});

test('each selected domain determines its corresponding guild', () => {
  DOMAIN_OPTIONS.forEach((domain, index) => {
    const result = evaluateAssessment({ ...beginner(), q1: index + 1 });
    assert.equal(result.domain, domain);
    assert.equal(result.guild, `${domain} Guild`);
    assert.equal(result.stage, 'Launch');
    assert.equal(result.level, 5);
    assert.equal(result.placement_status, 'mock');
  });
});

test('stage and level use the approved illustrative preview independently of answers', () => {
  const first = evaluateAssessment(beginner());
  const advanced = evaluateAssessment({ ...experienced(), q1: 1 });
  assert.deepEqual(first, advanced);
  assert.equal(first.stage, 'Launch');
  assert.equal(first.level, 5);
  assert.equal(first.placement_status, 'mock');
  assert.equal(first.version, 3);
  assert.equal(first.isMock, true);
  assert.equal(Object.hasOwn(first, 'score'), false);
  assert.equal(Object.hasOwn(first, 'stageIndex'), false);
});

test('result is deterministic and leaves the completed answers unchanged', () => {
  const answers = experienced();
  const original = structuredClone(answers);
  const result = evaluateAssessment(answers);
  assert.deepEqual(result, evaluateAssessment(answers));
  assert.deepEqual(answers, original);
});

test('draft refresh restores answers and step without sharing data between users', () => {
  const storage = memoryStorage();
  const draft = { step: 5, answers: beginner() };
  assert.equal(saveAssessmentDraft(storage, 'user-a', draft), true);
  assert.deepEqual(readAssessmentDraft(storage, 'user-a'), draft);
  assert.deepEqual(readAssessmentDraft(storage, 'user-b'), { step: 1, answers: createEmptyAnswers() });
  saveAssessmentDraft(storage, 'user-b', { step: 2, answers: { ...beginner(), q1: 12 } });
  removeAssessmentDraft(storage, 'user-a');
  assert.equal(storage.getItem(draftKey('user-a')), null);
  assert.equal(readAssessmentDraft(storage, 'user-b').answers.q1, 12);
});

test('corrupt drafts recover safely and cannot skip incomplete questions', () => {
  const storage = memoryStorage();
  storage.setItem(draftKey('user'), '{invalid json');
  assert.equal(readAssessmentDraft(storage, 'user').step, 1);
  saveAssessmentDraft(storage, 'user', {
    step: 7,
    answers: { ...beginner(), q2: 99, q3: ['none_yet', 'prototype', 'prototype', 'unknown'] },
  });
  const recovered = readAssessmentDraft(storage, 'user');
  assert.equal(recovered.step, 2);
  assert.equal(recovered.answers.q2, null);
  assert.deepEqual(recovered.answers.q3, ['prototype']);
  assert.equal(saveAssessmentDraft(null, 'user', {}), false);
  assert.equal(readAssessmentDraft(null, 'user').step, 1);
  const blockedStorage = { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Disabled'); } };
  assert.equal(readAssessmentDraft(blockedStorage, 'user').step, 1);
  assert.equal(saveAssessmentDraft(blockedStorage, 'user', {}), false);
});
