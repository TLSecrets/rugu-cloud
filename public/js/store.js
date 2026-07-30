import { api } from './api.js'
import { mergeSettings, applySettings } from './lib/settings.js'

export const store = {
  user: null,
  settings: mergeSettings(null),
  banks: [],
  questionsByBank: {},
  favorites: [],
  notes: [],
  wrongs: [],
  tags: [],
  ready: false,

  async boot() {
    const [me, settings] = await Promise.all([api.me(), api.getSettings()])
    this.user = me.user
    this.settings = mergeSettings(settings.settings)
    applySettings(this.settings)
    await Promise.all([this.refreshBanks(), this.refreshLearning(), this.refreshSettings()])
    this.ready = true
  },

  async refreshBanks() {
    const data = await api.listBanks()
    this.banks = data.banks || []
  },

  async loadQuestions(bankId) {
    if (!bankId) return []
    if (this.questionsByBank[bankId]) return this.questionsByBank[bankId]
    const data = await api.listQuestions(bankId)
    this.questionsByBank[bankId] = data.questions || []
    return this.questionsByBank[bankId]
  },

  invalidateQuestions(bankId) {
    if (bankId) delete this.questionsByBank[bankId]
    else this.questionsByBank = {}
  },

  async refreshLearning() {
    const settled = await Promise.allSettled([
      api.listFavorites(),
      api.listNotes(),
      api.listWrongs(),
      api.listTags(),
    ])
    const val = (i, key) =>
      settled[i].status === 'fulfilled' ? settled[i].value[key] || [] : []
    this.favorites = val(0, 'favorites')
    this.notes = val(1, 'notes')
    this.wrongs = val(2, 'wrongs')
    this.tags = val(3, 'tags')
  },

  async refreshSettings() {
    const data = await api.getSettings()
    this.settings = mergeSettings(data.settings)
    applySettings(this.settings)
  },

  async patchSettings(partial) {
    const data = await api.patchSettings(partial)
    this.settings = mergeSettings(data.settings)
    applySettings(this.settings)
    return this.settings
  },

  async logout() {
    await api.logout()
    this.user = null
    this.ready = false
    this.banks = []
    this.questionsByBank = {}
    this.favorites = []
    this.notes = []
    this.wrongs = []
    this.tags = []
  },

  isFavorite(questionId) {
    return this.favorites.some((f) => f.questionId === questionId)
  },

  getNote(questionId) {
    return this.notes.find((n) => n.questionId === questionId)
  },

  getBank(id) {
    return this.banks.find((b) => b.id === id)
  },
}
