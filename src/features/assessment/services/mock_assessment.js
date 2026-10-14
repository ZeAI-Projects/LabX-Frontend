export const DOMAIN_OPTIONS = [
  'Artificial Intelligence & Machine Learning',
  'Healthcare & MedTech',
  'Smart Education',
  'Women Safety & Social Impact',
  'Cybersecurity',
  'FinTech & Digital Economy',
  'Smart Mobility & Logistics',
  'Sustainability',
  'Agriculture & Food Technology',
  'Smart Cities & Infrastructure',
  'Media, Entertainment & Creator Technology',
  'Space, Robotics & Advanced Technology',
];

export const STAGE_OPTIONS = [
  'I have only identified a problem',
  'I have an idea/concept',
  'I have researched the problem and potential users',
  'I have validated the problem with real users',
  'I have built a prototype/MVP',
  'I have launched the product',
  'I have active users',
  'I have paying customers/revenue',
  'I am actively scaling the product',
];

export const EVIDENCE_OPTIONS = [
  { key: 'problem_statement', label: 'Problem statement documented' },
  { key: 'user_interviews', label: 'User interviews completed' },
  { key: 'market_research', label: 'Market/competitor research completed' },
  { key: 'customer_validation', label: 'Customer/user validation' },
  { key: 'prototype', label: 'Prototype' },
  { key: 'working_mvp', label: 'Working MVP' },
  { key: 'live_product', label: 'Live product' },
  { key: 'active_users', label: 'Active users' },
  { key: 'paying_customers', label: 'Paying customers' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'none_yet', label: 'None yet' },
];

export const EXECUTION_OPTIONS = [
  'I need step-by-step guidance',
  'I can do basic tasks with help',
  'I can complete most tasks independently',
  'I can handle complex tasks independently',
  'I can lead execution and make technical/product decisions',
];

export const VALIDATION_OPTIONS = [
  'None yet',
  'Talked to potential users',
  'Users have tested my solution',
  'Regular active users',
  'Paying customers',
  'Consistent revenue/growth',
];

export const MATURITY_OPTIONS = [
  'No product yet',
  'Concept/wireframe',
  'Prototype/demo',
  'Partially working product',
  'Working MVP',
  'Production-ready product',
  'Production product being continuously improved with real users',
];

export const COMPLETED_OPTIONS = [
  'Only identified the problem',
  'Researched the problem and users',
  'Validated problem/solution with real users',
  'Built a prototype',
  'Built a working MVP',
  'Launched a working product',
  'Have active users',
  'Have paying customers/revenue',
  'Actively scaling',
];

const QUESTION_OPTIONS = {
  q1: DOMAIN_OPTIONS,
  q2: STAGE_OPTIONS,
  q4: EXECUTION_OPTIONS,
  q5: VALIDATION_OPTIONS,
  q6: MATURITY_OPTIONS,
  q7: COMPLETED_OPTIONS,
};

const VALIDATION_MESSAGES = [
  'Please select a domain.',
  'Please select your project stage.',
  'Please select at least one evidence item, or choose None yet.',
  'Please select your execution capability.',
  'Please select your validation level.',
  'Please select your product maturity.',
  'Please select the work you have completed.',
];

const EVIDENCE_KEYS = new Set(EVIDENCE_OPTIONS.map(({ key }) => key));

export function createEmptyAnswers() {
  return { q1: null, q2: null, q3: [], q4: null, q5: null, q6: null, q7: null };
}

export function validateAssessmentStep(answers, step) {
  if (!Number.isInteger(step) || step < 1 || step > 7) return 'Invalid assessment step.';
  const answer = answers?.[`q${step}`];
  const valid = step === 3
    ? Array.isArray(answer)
      && answer.length > 0
      && answer.every((key) => EVIDENCE_KEYS.has(key))
      && new Set(answer).size === answer.length
      && (!answer.includes('none_yet') || answer.length === 1)
    : Number.isInteger(answer) && answer >= 1 && answer <= QUESTION_OPTIONS[`q${step}`].length;
  return valid ? '' : VALIDATION_MESSAGES[step - 1];
}

export function toggleEvidence(current, key) {
  if (!EVIDENCE_KEYS.has(key)) return current;
  if (key === 'none_yet') return ['none_yet'];
  const selected = current.filter((item) => item !== 'none_yet');
  return selected.includes(key)
    ? selected.filter((item) => item !== key)
    : [...selected, key];
}

// Illustrative values approved for the frontend preview; these are not a scoring rule.
export const ILLUSTRATIVE_PLACEMENT = Object.freeze({ stage: 'Launch', level: 5 });

// Domain and guild follow the selected answer. Stage and level use the preview above.
export function evaluateAssessment(answers) {
  for (let step = 1; step <= 7; step += 1) {
    const error = validateAssessmentStep(answers, step);
    if (error) throw new Error(error);
  }

  const domain = DOMAIN_OPTIONS[answers.q1 - 1];

  return {
    domain,
    ...ILLUSTRATIVE_PLACEMENT,
    guild: `${domain} Guild`,
    placement_status: 'mock',
    isMock: true,
    version: 3,
  };
}

export function normalizeDraftAnswers(value) {
  const answers = createEmptyAnswers();
  if (!value || typeof value !== 'object') return answers;
  for (const key of Object.keys(QUESTION_OPTIONS)) {
    if (!validateAssessmentStep(value, Number(key.slice(1)))) answers[key] = value[key];
  }
  if (Array.isArray(value.q3)) {
    const evidence = [...new Set(value.q3.filter((key) => EVIDENCE_KEYS.has(key)))];
    answers.q3 = evidence.length > 1 ? evidence.filter((key) => key !== 'none_yet') : evidence;
  }
  return answers;
}
