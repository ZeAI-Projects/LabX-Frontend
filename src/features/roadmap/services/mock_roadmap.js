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
export const ROADMAP_MOCK_MISSION_IDS = STAGE_OUTLINES.flatMap((stage, stageIndex) => stage.levels.flatMap((_, levelIndex) =>
  [1, 2, 3].map((missionNumber) => `${ROADMAP_STAGE_NAMES[stageIndex].toLowerCase()}-l${levelIndex + 1}-m${missionNumber}`)));
export const ROADMAP_OPTIONAL_MISSION_IDS = STAGE_OUTLINES.flatMap((stage, stageIndex) => stage.levels.map((_, levelIndex) =>
  `${ROADMAP_STAGE_NAMES[stageIndex].toLowerCase()}-l${levelIndex + 1}-m${(stageIndex + levelIndex) % 2 === 0 ? 3 : 2}`));

// Shared roadmap catalog for real project initialization and the isolated browser prototype.
// Prototype completion never mutates the profile, points, or achievements.
export function createMockRoadmap(result = {}) {
  const domain = typeof result?.domain === 'string' && result.domain ? result.domain : 'Your venture';
  const isPrototype = result.prototype === true || Array.isArray(result.completedMissionIds);
  const missionIds = ROADMAP_MOCK_MISSION_IDS;
  const validIds = new Set(missionIds);
  const optionalIds = new Set(result.requireEveryMission ? [] : ROADMAP_OPTIONAL_MISSION_IDS);
  const completedIds = new Set(isPrototype && Array.isArray(result.completedMissionIds)
    ? result.completedMissionIds.filter((id) => validIds.has(id))
    : []);
  const requestedStage = ROADMAP_STAGE_NAMES.findIndex((name) => name.toLowerCase() === String(result?.stage ?? '').toLowerCase());
  const requestedLevel = Number.isInteger(result?.level) && result.level >= 1 && result.level <= 5 ? result.level : 1;
  const initialCompletedCount = Math.max(0, requestedStage) * 15 + (requestedLevel - 1) * 3;
  if (isPrototype && !Array.isArray(result.completedMissionIds)) {
    missionIds.slice(0, initialCompletedCount).forEach((id) => completedIds.add(id));
  }
  if (isPrototype && result.status === 'completed') {
    missionIds.forEach((id) => completedIds.add(id));
  }
  const requiredIds = missionIds.filter((id) => !optionalIds.has(id));
  const activeMissionId = isPrototype ? requiredIds.find((id) => !completedIds.has(id)) : null;
  const firstIncomplete = isPrototype && activeMissionId ? missionIds.indexOf(activeMissionId) : -1;
  const currentStageIndex = isPrototype
    ? Math.floor((firstIncomplete < 0 ? 74 : firstIncomplete) / 15)
    : Math.max(0, requestedStage);
  const currentLevel = isPrototype
    ? Math.floor(((firstIncomplete < 0 ? 74 : firstIncomplete) % 15) / 3) + 1
    : requestedLevel;
  const prototypeTitles = ['Problem Identification', 'Problem Research', 'Problem Validation'];
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
        const id = `${outline.name.toLowerCase()}-l${levelIndex + 1}-m${index + 1}`;
        const isOptional = isPrototype && optionalIds.has(id);
        const missionIndex = missionIds.indexOf(id);
        const requiredBefore = requiredIds.filter((missionId) => missionIds.indexOf(missionId) < missionIndex);
        const requiredInLevel = titles.map((_, missionIndex) => `${outline.name.toLowerCase()}-l${levelIndex + 1}-m${missionIndex + 1}`)
          .filter((missionId) => !optionalIds.has(missionId));
        const lastMissionIndex = missionIds.indexOf(`${outline.name.toLowerCase()}-l${levelIndex + 1}-m${titles.length}`);
        const requiredAfterLevel = requiredIds.filter((missionId) => missionIds.indexOf(missionId) > lastMissionIndex);
        const optionalWasResolved = isOptional && requiredInLevel.every((missionId) => completedIds.has(missionId))
          && (requiredAfterLevel.some((missionId) => completedIds.has(missionId)) || requiredIds.every((missionId) => completedIds.has(missionId)));
        const optionalIsAvailable = isOptional && requiredBefore.every((missionId) => completedIds.has(missionId));
        const state = isPrototype
          ? completedIds.has(id) ? 'completed'
            : optionalWasResolved ? 'skipped'
              : isOptional ? optionalIsAvailable ? 'optional' : 'locked'
                : id === activeMissionId ? 'active' : 'locked'
          : stageIndex < currentStageIndex || (stageIndex === currentStageIndex && levelIndex + 1 < currentLevel)
            ? 'available'
            : stageIndex === currentStageIndex && levelIndex + 1 === currentLevel && index === 0
              ? 'active' : 'locked';
        const missionName = isPrototype && stageIndex === 0 && levelIndex === 0 ? prototypeTitles[index] : title;
        return {
          id,
          name: missionName,
          description: !isPrototype
            ? `Explore ${title.toLowerCase()} and plan the next steps for your venture.`
            : stageIndex === 0 && levelIndex === 0
              ? [
              `Describe one specific problem people in ${domain} face and who experiences it most.`,
              `Gather customer evidence about when this ${domain} problem happens and how people handle it today.`,
              `Compare your assumptions with the evidence and explain why this problem is worth addressing now.`,
            ][index]
            : `Develop ${title.toLowerCase()} for ${domain}. Capture the evidence, explain what it means, and identify the next decision for ${outline.name.toLowerCase()}.`,
          stageName: outline.name,
          stageIndex,
          levelName: name,
          level: levelIndex + 1,
          order: index + 1,
          state,
          isOptional,
          domain,
        };
      }),
    })),
  }));
  const skippedCount = stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
    .filter((mission) => mission.state === 'skipped').length;
  const resolvedCount = completedIds.size + skippedCount;
  return {
    domain,
    stages,
    currentStageIndex,
    currentLevel,
    currentMilestoneId: isPrototype
      ? firstIncomplete < 0 ? null : stages[currentStageIndex].levels[currentLevel - 1].milestones[firstIncomplete % 3].id
      : stages[currentStageIndex].levels[currentLevel - 1].milestones[0].id,
    completedCount: isPrototype ? completedIds.size : 0,
    skippedCount,
    resolvedCount: isPrototype ? resolvedCount : 0,
    creditedCount: 0,
    totalCount: 75,
    progressPercent: isPrototype ? Math.round(resolvedCount / 75 * 100) : 0,
    isComplete: isPrototype && requiredIds.every((id) => completedIds.has(id)),
  };
}
