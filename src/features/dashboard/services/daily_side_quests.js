import { localStore } from '../../../services/storage/local_storage.js'

export const SIDE_QUEST_CHANGE_EVENT = 'labx:side-quest-change'
export const DAILY_SIDE_QUESTS = Object.freeze([
  Object.freeze({ id: 'learning-note', title: 'Capture one useful insight', description: 'Turn something you learned today into one practical takeaway.', prompt: 'What did you learn, and how could you use it?', placeholder: 'Today I learned… I could use this to…', reward: 5, duration: '2 min' }),
  Object.freeze({ id: 'customer-question', title: 'Ask a better customer question', description: 'Draft one open question that helps you understand a customer’s experience.', prompt: 'Write your question and what you hope to learn from the answer.', placeholder: 'Tell me about the last time… This would help me understand…', reward: 5, duration: '3 min' }),
  Object.freeze({ id: 'small-next-step', title: 'Plan one small next step', description: 'Choose a manageable action to move your idea forward.', prompt: 'What will you do next, and what will “done” look like?', placeholder: 'My next step is… I will know it is done when…', reward: 10, duration: '3 min' }),
])

const formatDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
const clean = (value) => typeof value === 'string' ? value.trim() : ''
const accountId = (user) => clean(user?.id)
const storageKey = (id) => `labx.side-quests.v1.${encodeURIComponent(id)}`
const broadcast = (userId) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SIDE_QUEST_CHANGE_EVENT, { detail: { userId } }))
}

// Side quests have their own sample coin ledger. They never write roadmap,
// achievement, leaderboard, or LabX Points records.
export function createDailySideQuestStore({ storage = localStore, now = () => Date.now(), emit = broadcast } = {}) {
  function ledgerFor(user) {
    const id = accountId(user)
    if (!id) return []
    const saved = storage.readJSON(storageKey(id), null)
    if (saved?.userId !== id || !Array.isArray(saved.ledger)) return []
    const seen = new Set()
    return saved.ledger.filter((entry) => {
      const key = `${entry?.day}:${entry?.questId}`
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(entry?.day || '')
        && DAILY_SIDE_QUESTS.some((quest) => quest.id === entry.questId)
        && clean(entry.work) && Number.isFinite(Date.parse(entry.completedAt)) && !seen.has(key)
      if (valid) seen.add(key)
      return valid
    }).map((entry) => ({ day: entry.day, questId: entry.questId, work: entry.work, completedAt: entry.completedAt }))
  }

  function snapshot(user, ledger = ledgerFor(user)) {
    const day = formatDay.format(now())
    const today = ledger.filter((entry) => entry.day === day)
    const quests = DAILY_SIDE_QUESTS.map((quest) => {
      const completion = today.find((entry) => entry.questId === quest.id)
      return { ...quest, status: completion ? 'completed' : 'available', work: completion?.work || '', completedAt: completion?.completedAt || null }
    })
    const rewardFor = (entry) => DAILY_SIDE_QUESTS.find((quest) => quest.id === entry.questId).reward
    return {
      day,
      quests,
      totalCount: quests.length,
      completedCount: today.length,
      earnedCoins: ledger.reduce((total, entry) => total + rewardFor(entry), 0),
      todayCoins: today.reduce((total, entry) => total + rewardFor(entry), 0),
      availableCoins: quests.filter((quest) => quest.status === 'available').reduce((total, quest) => total + quest.reward, 0),
    }
  }

  return {
    read: (user) => snapshot(user),
    complete(user, questId, work, expectedDay) {
      const id = accountId(user)
      if (!id) throw new Error('Sign in to complete a daily quest.')
      const quest = DAILY_SIDE_QUESTS.find((item) => item.id === questId)
      if (!quest) throw new Error('This daily quest is unavailable. Choose another quest.')
      const completedAt = new Date(now()).toISOString()
      const day = formatDay.format(Date.parse(completedAt))
      if (expectedDay !== day) throw new Error('A new day has started in IST. Review today’s quest, then try again. Your response is still here.')
      const ledger = ledgerFor(user)
      // Re-read before a claim, so repeated clicks and an already completed quest
      // in another tab cannot award a second reward.
      if (ledger.some((entry) => entry.day === day && entry.questId === quest.id)) return { ...snapshot(user, ledger), claimed: false }
      if (!clean(work)) {
        const error = new Error('Add your response before completing this quest.')
        error.field = 'work'
        throw error
      }
      const next = [...ledger, { day, questId: quest.id, work: clean(work), completedAt }]
      // A reward is only shown after the entire completion and coin ledger are
      // saved together. Failed storage writes preserve the previous balance.
      storage.writeJSONStrict(storageKey(id), { version: 1, userId: id, ledger: next })
      emit(id)
      return { ...snapshot(user, next), claimed: true }
    },
  }
}

export const dailySideQuestStore = createDailySideQuestStore()
export const getSideQuestCoinTotal = (user) => dailySideQuestStore.read(user).earnedCoins
