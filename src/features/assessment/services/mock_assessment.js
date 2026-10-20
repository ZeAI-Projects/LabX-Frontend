export const ASSESSMENT_VERSION = 2;

export const ASSESSMENT_QUESTIONS = Object.freeze([
  {
    key: 'q1',
    title: 'Which problem area best describes your startup?',
    options: [
      'Healthcare & MedTech',
      'Education',
      'Finance & FinTech',
      'Cybersecurity',
      'Mobility & Logistics',
      'Agriculture & FoodTech',
      'Climate & Sustainability',
      'Smart Cities & Infrastructure',
      'Women Safety & Social Impact',
      'Media & CreatorTech',
      'DefenceTech',
      'LegalTech',
      'Consumer Products',
      'Manufacturing & Industry',
      'Retail & Commerce',
      'Other / Not listed',
      'Not sure yet',
    ],
  },
  {
    key: 'q2',
    title: 'Who are your primary target users?',
    options: [
      'Individual consumers',
      'Students',
      'Startups and founders',
      'Small and medium businesses',
      'Large enterprises',
      'Healthcare providers',
      'Farmers',
      'Government organizations',
      'Developers and technical teams',
      'Industrial organizations',
      'Multiple user groups',
      'Not sure yet',
    ],
  },
  {
    key: 'q3',
    title: 'What type of solution are you developing?',
    options: [
      'Web application',
      'Mobile application',
      'AI-powered software',
      'SaaS platform',
      'Hardware or electronic device',
      'Robotics or autonomous system',
      'IoT solution',
      'Marketplace',
      'Physical consumer product',
      'Research-based solution',
      'Combination of software and hardware',
      'Other / Not listed',
    ],
  },
  {
    key: 'q4',
    title: 'Which option best describes your startup today?',
    options: [
      'Exploring an idea',
      'Defining the problem',
      'Validating the problem',
      'Validating the proposed solution',
      'Building a prototype',
      'Developing an MVP',
      'Testing with users',
      'Launching the product',
      'Acquiring customers',
      'Generating revenue',
      'Scaling an established product',
      'Not sure yet',
    ],
  },
  {
    key: 'q5',
    title: 'What is your current level of problem validation?',
    options: [
      'Not researched',
      'Assumptions only',
      'Desk research completed',
      'Interviews completed',
      'Surveys completed',
      'Problem validated through user interviews and surveys',
      'Prototype tested with target users',
      'Repeat usage or strong demand observed',
      'Not sure yet',
    ],
  },
  {
    key: 'q6',
    title: 'What have you built or tested so far?',
    options: [
      'Concept only',
      'Product design or specification',
      'Proof of concept',
      'Prototype',
      'Minimum Viable Product (MVP)',
      'Product being tested by users',
      'Product in active use',
      'Established product being improved or scaled',
      'Not sure yet',
    ],
  },
  {
    key: 'q7',
    title: 'Which option best describes your customer and business progress?',
    options: [
      'No target customers identified',
      'Target customers identified',
      'Potential users contacted',
      'User interviews completed',
      'Interested users identified',
      'Waitlist created',
      'Pilot users acquired',
      'Active users acquired',
      'Paying customers acquired',
      'Revenue generated',
      'Repeatable customer acquisition achieved',
      'Established business being scaled',
      'Not sure yet',
    ],
  },
  {
    key: 'q8',
    title: 'What is your biggest current blocker?',
    options: [
      'Problem clarity',
      'Technical feasibility',
      'Product development',
      'Customer validation',
      'Business model',
      'Team formation',
      'Funding',
      'Marketing and customer acquisition',
      'Go-to-market strategy',
      'Legal or regulatory compliance',
      'Product-market fit',
      'No major blocker',
      'Not sure yet',
    ],
  },
].map((question) => Object.freeze({ ...question, options: Object.freeze(question.options) })));

export const ASSESSMENT_QUESTION_COUNT = ASSESSMENT_QUESTIONS.length;
export const DOMAIN_OPTIONS = ASSESSMENT_QUESTIONS[0].options;

// Completed assessments keep the domain labels selected in earlier versions.
export const SUPPORTED_DOMAIN_OPTIONS = Object.freeze([...new Set([
  ...DOMAIN_OPTIONS,
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
])]);

const VALIDATION_MESSAGES = [
  'Please select a problem area.',
  'Please select your primary target users.',
  'Please select your solution type.',
  'Please select your startup stage.',
  'Please select your problem validation level.',
  'Please select what you have built or tested.',
  'Please select your customer and business progress.',
  'Please select your biggest current blocker.',
];

export function createEmptyAnswers() {
  return Object.fromEntries(ASSESSMENT_QUESTIONS.map(({ key }) => [key, null]));
}

export function validateAssessmentStep(answers, step) {
  if (!Number.isInteger(step) || step < 1 || step > ASSESSMENT_QUESTION_COUNT) return 'Invalid assessment step.';
  const question = ASSESSMENT_QUESTIONS[step - 1];
  const answer = answers?.[question.key];
  const valid = Number.isInteger(answer) && answer >= 1 && answer <= question.options.length;
  return valid ? '' : VALIDATION_MESSAGES[step - 1];
}

// Illustrative values approved for the frontend preview; these are not a scoring rule.
export const ILLUSTRATIVE_PLACEMENT = Object.freeze({ stage: 'Launch', level: 5 });

// New questions do not introduce an unapproved scoring or eligibility rule.
export function evaluateAssessment(answers) {
  for (let step = 1; step <= ASSESSMENT_QUESTION_COUNT; step += 1) {
    const error = validateAssessmentStep(answers, step);
    if (error) throw new Error(error);
  }

  const domain = DOMAIN_OPTIONS[answers.q1 - 1];
  const hasDefinedDomain = !['Other / Not listed', 'Not sure yet'].includes(domain);
  return {
    domain,
    ...ILLUSTRATIVE_PLACEMENT,
    guild: hasDefinedDomain ? `${domain} Guild` : null,
    placement_status: 'mock',
    isMock: true,
    version: 3,
    assessment_version: ASSESSMENT_VERSION,
  };
}

export function normalizeDraftAnswers(value) {
  const answers = createEmptyAnswers();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return answers;
  for (let step = 1; step <= ASSESSMENT_QUESTION_COUNT; step += 1) {
    if (!validateAssessmentStep(value, step)) {
      const { key } = ASSESSMENT_QUESTIONS[step - 1];
      answers[key] = value[key];
    }
  }
  return answers;
}
