import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { createMockRoadmap } from './mock_roadmap.js'

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
export const MISSION_NOTES_MIN_LENGTH = 80
export const roadmapWorkflowKey = (ownerId, projectId) => `labx:roadmap-workflow:v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(projectId)}`

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const cleanText = (value) => typeof value === 'string' ? value.trim() : ''
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const clone = (value) => JSON.parse(JSON.stringify(value))
const SIMULATION_NOTICE = 'Local simulated checks only. No person or AI verifies this evidence.'
const REQUIREMENTS = {
  notesMinLength: MISSION_NOTES_MIN_LENGTH,
  notesMaxLength: 10000,
  urlMaxLength: 2048,
  maxFileBytes: MAX_EVIDENCE_BYTES,
  requiresArtifact: true,
  simulationNotice: SIMULATION_NOTICE,
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

freeze(REQUIREMENTS)

function validUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > REQUIREMENTS.urlMaxLength) return false
  try {
    const parsed = new URL(value.trim())
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

function validFile(file) {
  return isRecord(file) && typeof file.name === 'string' && Boolean(file.name.trim()) && file.name.length <= 255
    && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_EVIDENCE_BYTES
    && typeof file.type === 'string' && file.type.length <= 120
}

function check(id, label, passed, message) {
  return { id, label, passed: Boolean(passed), message }
}

function evaluate(payload, isInitial, stageNames) {
  const notes = cleanText(payload?.notes)
  const url = cleanText(payload?.url)
  const suppliedUrl = payload?.url !== undefined && payload.url !== null && payload.url !== ''
  const suppliedFile = payload?.file !== undefined && payload.file !== null
  const fileOk = suppliedFile && validFile(payload.file)
  const urlOk = validUrl(payload?.url)
  const checks = [
    check('notes', 'Describe the work', typeof payload?.notes === 'string' && notes.length >= MISSION_NOTES_MIN_LENGTH && notes.length <= REQUIREMENTS.notesMaxLength,
      `Use ${MISSION_NOTES_MIN_LENGTH}–${REQUIREMENTS.notesMaxLength} characters of notes describing the work.`),
    check('url', 'Valid artifact URL', !suppliedUrl || urlOk, 'Use a complete http:// or https:// URL without embedded sign-in details.'),
    check('file', 'File size and details', !suppliedFile || fileOk, 'Choose a nonempty file no larger than 5 MB with a valid filename.'),
    check('artifact', 'Provide evidence', urlOk || fileOk, 'Provide an artifact URL or a nonempty file up to 5 MB.'),
  ]
  let placement = null
  if (payload?.placement !== undefined && payload.placement !== null) {
    const requested = payload.placement
    const validTarget = isInitial && isRecord(requested) && Number.isInteger(requested.stageIndex)
      && requested.stageIndex >= 0 && requested.stageIndex < 5
      && Number.isInteger(requested.level) && requested.level >= 1 && requested.level <= 5
    checks.push(check('placement-target', 'Starting placement', validTarget, 'Starting placement is available only for the initial mission, with a stage and level from 1 to 5.'))
    if (validTarget) {
      const priorLevelCount = requested.stageIndex * 5 + requested.level - 1
      const evidence = Array.isArray(requested.evidence) ? requested.evidence : []
      const expectedKeys = Array.from({ length: priorLevelCount }, (_, index) => `${Math.floor(index / 5)}:${index % 5 + 1}`)
      const suppliedKeys = evidence.map((item) => isRecord(item) ? `${item.stageIndex}:${item.level}` : '')
      const structureValid = evidence.length === priorLevelCount && new Set(suppliedKeys).size === priorLevelCount
        && suppliedKeys.every((key) => expectedKeys.includes(key))
      checks.push(check('placement-evidence', 'Evidence for every prior level', structureValid,
        `Provide one evidence entry for each of the ${priorLevelCount} levels before the requested placement.`))
      const normalizedEvidence = []
      for (let index = 0; index < priorLevelCount; index += 1) {
        const stageIndex = Math.floor(index / 5)
        const level = index % 5 + 1
        const entry = evidence.find((item) => item?.stageIndex === stageIndex && item?.level === level)
        const entryNotes = cleanText(entry?.notes)
        const passed = typeof entry?.notes === 'string' && entryNotes.length >= MISSION_NOTES_MIN_LENGTH
          && entryNotes.length <= REQUIREMENTS.notesMaxLength && validUrl(entry?.url)
        checks.push(check(`placement-${stageIndex}-${level}`, `${stageNames[stageIndex]} · Level ${level}`, passed,
          `Add ${MISSION_NOTES_MIN_LENGTH}–${REQUIREMENTS.notesMaxLength} characters of notes and a valid http(s) URL for ${stageNames[stageIndex]} Level ${level}.`))
        normalizedEvidence.push({ stageIndex, level, notes: entryNotes, url: cleanText(entry?.url) })
      }
      placement = {
        stageIndex: requested.stageIndex,
        stageName: stageNames[requested.stageIndex],
        level: requested.level,
        evidence: normalizedEvidence,
        creditedCount: Math.max(0, priorLevelCount * 3 - 1),
      }
    }
  }
  const approved = checks.every((item) => item.passed)
  return {
    approved,
    notes,
    url,
    file: suppliedFile && isRecord(payload.file)
      ? { name: typeof payload.file.name === 'string' ? payload.file.name : '', size: payload.file.size ?? null, type: typeof payload.file.type === 'string' ? payload.file.type : '' }
      : null,
    // Preserve rejected input in a bounded plain-data shape so its deterministic
    // checks can be reproduced after a refresh.
    placement,
    checks,
    feedback: approved
      ? `Simulated checks passed. ${SIMULATION_NOTICE}`
      : `Revise and resubmit: ${checks.filter((item) => !item.passed).map((item) => item.message).join(' ')}`,
  }
}

function catalogFor(project) {
  return createMockRoadmap({ domain: cleanText(project?.assessment_result?.domain) || 'Your venture', stage: 'Discover', level: 1 })
}

function flatten(roadmap) {
  return roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
}

function emptyRecord(project) {
  return { version: 1, ownerId: project.owner_id, projectId: project.id, submissionsByMilestone: {} }
}

function boundedPayload(payload) {
  // Persist only the published fields, never File contents or arbitrary caller
  // objects. Invalid but bounded input is retained to explain a rejection.
  const source = isRecord(payload) ? payload : {}
  const result = {
    notes: typeof source.notes === 'string' ? source.notes.slice(0, REQUIREMENTS.notesMaxLength + 1) : '',
    url: typeof source.url === 'string' ? source.url.slice(0, REQUIREMENTS.urlMaxLength + 1) : source.url == null ? '' : '[invalid URL]',
    file: source.file == null ? null : {
      name: typeof source.file?.name === 'string' ? source.file.name.slice(0, 256) : '',
      size: Number.isFinite(source.file?.size) ? source.file.size : null,
      type: typeof source.file?.type === 'string' ? source.file.type.slice(0, 121) : '',
    },
  }
  if (source.placement !== undefined && source.placement !== null) {
    result.placement = {
      stageIndex: Number.isInteger(source.placement?.stageIndex) ? source.placement.stageIndex : null,
      level: Number.isInteger(source.placement?.level) ? source.placement.level : null,
      evidence: Array.isArray(source.placement?.evidence) ? source.placement.evidence.slice(0, 26).map((entry) => ({
        stageIndex: Number.isInteger(entry?.stageIndex) ? entry.stageIndex : null,
        level: Number.isInteger(entry?.level) ? entry.level : null,
        notes: typeof entry?.notes === 'string' ? entry.notes.slice(0, REQUIREMENTS.notesMaxLength + 1) : '',
        url: typeof entry?.url === 'string' ? entry.url.slice(0, REQUIREMENTS.urlMaxLength + 1) : '',
      })) : [],
    }
  }
  return result
}

function normalizeRecord(project, record, catalog) {
  const normalized = emptyRecord(project)
  if (!isRecord(record) || record.version !== 1 || record.ownerId !== project.owner_id
    || record.projectId !== project.id || !isRecord(record.submissionsByMilestone)) return normalized
  const missions = flatten(catalog)
  const stageNames = catalog.stages.map((stage) => stage.name)
  let next = 0
  while (next < missions.length) {
    const mission = missions[next]
    const saved = Object.hasOwn(record.submissionsByMilestone, mission.id) ? record.submissionsByMilestone[mission.id] : null
    if (!isRecord(saved) || saved.missionId !== mission.id || !['approved', 'rejected'].includes(saved.status)
      || !Number.isSafeInteger(saved.attempt) || saved.attempt < 1 || !validDate(saved.submittedAt)
      || !cleanText(saved.submittedBy) || next === 0 && saved.submittedBy !== project.owner_id
      || !isRecord(saved.payload)) break
    const payload = boundedPayload(saved.payload)
    const evaluation = evaluate(payload, next === 0, stageNames)
    if ((saved.status === 'approved') !== evaluation.approved) break
    normalized.submissionsByMilestone[mission.id] = {
      missionId: mission.id,
      attempt: saved.attempt,
      status: saved.status,
      submittedAt: saved.submittedAt,
      submittedBy: saved.submittedBy,
      payload,
      notes: evaluation.notes,
      url: evaluation.url,
      file: evaluation.file,
      placement: evaluation.placement,
      feedback: evaluation.feedback,
      checks: evaluation.checks,
      isSimulated: true,
    }
    if (saved.status !== 'approved') break
    next = next === 0 && evaluation.placement
      ? Math.max(1, (evaluation.placement.stageIndex * 5 + evaluation.placement.level - 1) * 3)
      : next + 1
  }
  return normalized
}

export function createRoadmapSnapshot(project, record = null) {
  const catalog = catalogFor(project)
  const normalized = normalizeRecord(project, record, catalog)
  const submissions = normalized.submissionsByMilestone
  const missions = flatten(catalog)
  const first = submissions[missions[0].id]
  const placement = first?.status === 'approved' ? first.placement : null
  const placementIndex = placement ? (placement.stageIndex * 5 + placement.level - 1) * 3 : 0
  const completedCount = Object.values(submissions).filter((submission) => submission.status === 'approved').length
  const creditedCount = placement?.creditedCount ?? 0
  const covered = completedCount + creditedCount
  const isComplete = covered === missions.length
  const activeIndex = isComplete ? -1 : covered
  const current = missions[activeIndex] ?? null
  catalog.stages.forEach((stage) => {
    stage.isCurrent = current ? stage.index === current.stageIndex : false
    stage.isUnlocked = isComplete || stage.index <= current.stageIndex
    stage.levels.forEach((level) => {
      level.milestones.forEach((mission) => {
        const index = mission.stageIndex * 15 + (mission.level - 1) * 3 + mission.order - 1
        mission.state = submissions[mission.id]?.status === 'approved'
          ? 'completed'
          : placement && index > 0 && index < placementIndex ? 'credited'
            : index === activeIndex ? 'active' : 'locked'
        mission.requirements = REQUIREMENTS
        mission.submission = submissions[mission.id] ?? null
      })
    })
  })
  return freeze({
    ...catalog,
    currentStageIndex: current?.stageIndex ?? 4,
    currentLevel: current?.level ?? 5,
    currentMilestoneId: current?.id ?? null,
    completedCount,
    creditedCount,
    totalCount: missions.length,
    progressPercent: Math.round(covered / missions.length * 100),
    isComplete,
    submissionsByMilestone: submissions,
    placement,
    simulationNotice: SIMULATION_NOTICE,
  })
}

function visibleSnapshot(project, record, granted) {
  const snapshot = createRoadmapSnapshot(project, record)
  if (granted.role === 'owner') return snapshot
  const visible = clone(snapshot)
  const assigned = new Set(Array.isArray(granted.assignedMissionIds) ? granted.assignedMissionIds : [])
  assigned.delete('discover-l1-m1')
  visible.submissionsByMilestone = Object.fromEntries(Object.entries(visible.submissionsByMilestone)
    .filter(([missionId]) => assigned.has(missionId)))
  flatten(visible).forEach((mission) => {
    mission.submission = visible.submissionsByMilestone[mission.id] ?? null
  })
  if (visible.placement) visible.placement.evidence = []
  return freeze(visible)
}

function announce(ownerId, projectId) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new window.CustomEvent('labx:roadmap-change', { detail: { ownerId, projectId } }))
  }
}

export function createRoadmapStore({ storage = localStore, auth, getAccess, now = Date.now, onApproved } = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage)
  function access(projectId, ownerId, expectedUserId) {
    const user = auth?.getUser?.()
    if (!user?.id) throw new Error('Sign in to open this roadmap.')
    if (!expectedUserId || user.id !== expectedUserId) throw new Error('Your signed-in account changed. Reopen this roadmap.')
    if (user.role !== 'founder') throw new Error('Roadmap missions are available to founder accounts.')
    if (!cleanText(projectId) || !cleanText(ownerId) || typeof getAccess !== 'function') throw new Error('This roadmap is unavailable.')
    const granted = getAccess(projectId, ownerId, expectedUserId)
    const latest = auth?.getUser?.()
    if (latest?.id !== expectedUserId) throw new Error('Your signed-in account changed. Reopen this roadmap.')
    if (latest.role !== 'founder') throw new Error('Roadmap missions are available to founder accounts.')
    if (!granted || !['owner', 'member'].includes(granted.role) || granted.user?.id !== expectedUserId
      || granted.project?.id !== projectId || granted.project.owner_id !== ownerId
      || granted.role === 'owner' && expectedUserId !== ownerId
      || granted.project.assessment_completed !== true || !isRecord(granted.project.assessment_result)) {
      throw new Error('This roadmap is unavailable.')
    }
    return granted
  }
  function canSubmit(granted, snapshot, missionId) {
    const mission = flatten(snapshot).find((entry) => entry.id === missionId)
    if (!mission) throw new Error('This mission is unavailable.')
    if (missionId === 'discover-l1-m1' && granted.role !== 'owner') throw new Error('Only the project owner can submit the initial mission.')
    if (granted.role === 'member' && (!Array.isArray(granted.assignedMissionIds) || !granted.assignedMissionIds.includes(missionId))) {
      throw new Error('This mission is not assigned to you.')
    }
    if (mission.state === 'completed') throw new Error('This mission is already approved.')
    if (mission.state !== 'active') throw new Error('Complete the active mission before submitting this mission.')
  }
  return {
    read(projectId, ownerId, expectedUserId = auth?.getUser?.()?.id) {
      access(projectId, ownerId, expectedUserId)
      const record = local.readJSON(roadmapWorkflowKey(ownerId, projectId))
      const latestAccess = access(projectId, ownerId, expectedUserId)
      return visibleSnapshot(latestAccess.project, record, latestAccess)
    },
    submitMission(projectId, ownerId, missionId, payload, expectedUserId = auth?.getUser?.()?.id) {
      const granted = access(projectId, ownerId, expectedUserId)
      const key = roadmapWorkflowKey(ownerId, projectId)
      const before = local.readJSON(key)
      const catalog = catalogFor(granted.project)
      const record = normalizeRecord(granted.project, before, catalog)
      const snapshot = createRoadmapSnapshot(granted.project, record)
      canSubmit(granted, snapshot, missionId)
      const savedPayload = boundedPayload(payload)
      const evaluation = evaluate(savedPayload, missionId === 'discover-l1-m1', catalog.stages.map((stage) => stage.name))
      record.submissionsByMilestone[missionId] = {
        missionId,
        attempt: (record.submissionsByMilestone[missionId]?.attempt ?? 0) + 1,
        status: evaluation.approved ? 'approved' : 'rejected',
        submittedAt: new Date(now()).toISOString(),
        submittedBy: expectedUserId,
        payload: savedPayload,
      }
      // Keep these checks immediately before the write: collaborators, accounts,
      // and storage can change independently of an open submission form.
      const latestAccess = access(projectId, ownerId, expectedUserId)
      canSubmit(latestAccess, snapshot, missionId)
      if (JSON.stringify(local.readJSON(key)) !== JSON.stringify(before)) {
        throw new Error('Roadmap progress changed. Refresh before submitting again.')
      }
      local.writeJSON(key, record)
      announce(ownerId, projectId)
      const returnAccess = access(projectId, ownerId, expectedUserId)
      // Recognition follows a persisted, authorized approval. Reads and rejected
      // evidence never create activity. Keep the complete validated snapshot
      // internal; members still receive only their permitted evidence below.
      if (evaluation.approved && typeof onApproved === 'function') {
        onApproved(returnAccess.user, returnAccess.project, createRoadmapSnapshot(returnAccess.project, record))
      }
      return visibleSnapshot(returnAccess.project, record, returnAccess)
    },
  }
}
