const STAGE_OUTLINES = [
  { name: 'Discover', tier: 'INITIATOR', color: '#06b6d4', levels: [
    ['Problem focus', 'Problem statement', 'User context', 'Opportunity brief'],
    ['Audience discovery', 'Audience segments', 'User needs', 'Research notes'],
    ['Market context', 'Market landscape', 'Existing alternatives', 'Opportunity gaps'],
    ['Opportunity framing', 'Value proposition', 'Initial assumptions', 'Concept outline'],
    ['Foundation & planning', 'Project foundation', 'Discovery plan', 'Discovery review'],
  ] },
  { name: 'Validate', tier: 'BUILDER', color: '#a855f7', levels: [
    ['Research design', 'Research questions', 'Interview plan', 'Participant profile'],
    ['Customer interviews', 'Interview guide', 'Customer insights', 'Patterns & findings'],
    ['Solution tests', 'Test concept', 'Experiment plan', 'Feedback synthesis'],
    ['Demand signals', 'Interest signals', 'Value testing', 'Demand review'],
    ['Validation review', 'Evidence summary', 'Assumptions review', 'Validation decision'],
  ] },
  { name: 'Build', tier: 'OPERATOR', color: '#f59e0b', levels: [
    ['Product definition', 'Product scope', 'Core requirements', 'Delivery plan'],
    ['Experience design', 'User journeys', 'Interaction prototype', 'Design review'],
    ['Prototype build', 'Prototype setup', 'Core experience', 'Prototype review'],
    ['MVP delivery', 'MVP scope', 'Working product', 'User testing'],
    ['Product readiness', 'Quality review', 'Product refinements', 'Readiness checklist'],
  ] },
  { name: 'Launch', tier: 'SCALER', color: '#f43f5e', levels: [
    ['Launch strategy', 'Launch audience', 'Positioning', 'Launch plan'],
    ['Release preparation', 'Release checklist', 'Product walkthrough', 'Support preparation'],
    ['Go-to-market', 'Channel plan', 'Launch materials', 'Outreach plan'],
    ['Launch operations', 'Release preparation', 'Launch monitoring', 'Customer feedback'],
    ['Launch & learn', 'Launch review', 'User insights', 'Next release plan'],
  ] },
  { name: 'Grow', tier: 'CONQUEROR', color: '#eab308', levels: [
    ['Growth baseline', 'Growth indicators', 'Audience insights', 'Growth opportunities'],
    ['Retention systems', 'Retention journey', 'Engagement ideas', 'Retention review'],
    ['Repeatable acquisition', 'Channel experiments', 'Acquisition plan', 'Channel review'],
    ['Operating capacity', 'Operating needs', 'Delivery systems', 'Capacity planning'],
    ['Growth planning', 'Growth priorities', 'Experiment roadmap', 'Growth review'],
  ] },
];

export const ROADMAP_STAGE_NAMES = STAGE_OUTLINES.map(({ name }) => name);

// Frontend preview content only. Starting placement does not award completion,
// milestones, coins, or achievements, and this module never mutates the profile.
export function createMockRoadmap(result = {}) {
  const assignedStage = ROADMAP_STAGE_NAMES.findIndex((name) => name.toLowerCase() === String(result?.stage ?? '').toLowerCase());
  const currentStageIndex = Math.max(0, assignedStage);
  const currentLevel = Number.isInteger(result?.level) && result.level >= 1 && result.level <= 5 ? result.level : 1;
  const domain = typeof result?.domain === 'string' && result.domain ? result.domain : 'Your venture';
  const stages = STAGE_OUTLINES.map((outline, stageIndex) => ({
    id: outline.name.toLowerCase(),
    name: outline.name,
    index: stageIndex,
    tier: { name: outline.tier, color: outline.color, glow: `${outline.color}66` },
    isCurrent: stageIndex === currentStageIndex,
    isUnlocked: stageIndex <= currentStageIndex,
    levels: outline.levels.map(([name, ...titles], levelIndex) => ({
      id: `${outline.name.toLowerCase()}-level-${levelIndex + 1}`,
      number: levelIndex + 1,
      name,
      milestones: titles.map((title, index) => {
        const state = stageIndex < currentStageIndex || (stageIndex === currentStageIndex && levelIndex + 1 < currentLevel)
          ? 'available'
          : stageIndex === currentStageIndex && levelIndex + 1 === currentLevel && index === 0
            ? 'active' : 'locked';
        return {
          id: `${outline.name.toLowerCase()}-l${levelIndex + 1}-m${index + 1}`,
          name: title,
          description: `Explore ${title.toLowerCase()} and plan the next steps for your venture.`,
          stageName: outline.name,
          stageIndex,
          levelName: name,
          level: levelIndex + 1,
          order: index + 1,
          state,
          domain,
        };
      }),
    })),
  }));
  return {
    domain,
    stages,
    currentStageIndex,
    currentLevel,
    currentMilestoneId: stages[currentStageIndex].levels[currentLevel - 1].milestones[0].id,
    completedCount: 0,
    totalCount: 75,
    progressPercent: 0,
  };
}
