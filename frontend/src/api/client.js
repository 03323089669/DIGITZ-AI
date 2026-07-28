import axios from 'axios'

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
const api = axios.create({
  baseURL: apiBase,
  timeout: 60000,
})

// Inject JWT Token interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('digitz-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle auth errors globally - redirect to login if token invalid/expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('digitz-token')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// --- Authentication ---
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password })
  if (response.data.access_token) {
    localStorage.setItem('digitz-token', response.data.access_token)
  }
  return response.data
}

export async function register(email, password) {
  const response = await api.post('/auth/register', { email, password })
  if (response.data.access_token) {
    localStorage.setItem('digitz-token', response.data.access_token)
  }
  return response.data
}

export async function getMe() {
  const response = await api.get('/auth/me')
  return response.data
}

// --- Conversations ---
export async function getConversations(brandKey = null) {
  const response = await api.get('/conversations', {
    params: brandKey ? { brand_key: brandKey } : {},
  })
  return response.data
}

export async function createConversation(brandKey, title) {
  const response = await api.post('/conversations', { brand_key: brandKey, title })
  return response.data
}

export async function deleteConversation(convId) {
  const response = await api.delete(`/conversations/${convId}`)
  return response.data
}

export async function getMessages(convId) {
  const response = await api.get(`/conversations/${convId}/messages`)
  return response.data
}

export async function sendMessage(convId, text, mode = 'Creative') {
  const response = await api.post(`/conversations/${convId}/messages`, { text, mode })
  return response.data
}

// --- Analytics ---
export async function getAnalytics() {
  const response = await api.get('/analytics/summary')
  return response.data
}

// --- Settings ---
export async function getSettings() {
  const response = await api.get('/settings')
  return response.data
}

export async function saveSettings(payload) {
  const response = await api.post('/settings', payload)
  return response.data
}

// --- Legacy & General Actions ---
export async function queryAI(query, brand, mode = 'Creative', sessionId = null) {
  const response = await api.post('/query', { query, brand, mode, session_id: sessionId })
  return response.data
}

/**
 * Send a text query + image file to the AI vision endpoint.
 * Uses multipart/form-data so the image bytes are transmitted correctly.
 *
 * @param {string}      query     - The user's text prompt
 * @param {File}        imageFile - A browser File object (image/*)
 * @param {string}      brand     - Active brand key
 * @param {string}      mode      - AI mode: Creative | Strategy | Report | Q&A
 * @param {string|null} sessionId - Existing chat session id (null to create new)
 */
export async function queryAIWithImage(query, imageFile, brand, mode = 'Creative', sessionId = null) {
  const formData = new FormData()
  formData.append('query', query)
  formData.append('brand', brand)
  formData.append('mode', mode)
  if (sessionId) formData.append('session_id', sessionId)
  formData.append('image', imageFile, imageFile.name)

  const response = await api.post('/query/with-image', formData, {
    // Let axios set the Content-Type with the correct boundary automatically
    headers: { 'Content-Type': undefined },
    timeout: 120000, // vision calls can be slower
  })
  return response.data
}

// --- Chat sessions (ChatGPT-style workspace) ---
export async function getChatSessions(brand = null) {
  const response = await api.get('/query/sessions', {
    params: brand ? { brand } : {},
  })
  return response.data?.sessions || []
}

export async function getChatSessionMessages(sessionId) {
  const response = await api.get(`/query/sessions/${sessionId}/messages`)
  return response.data?.messages || []
}

export async function renameChatSession(sessionId, title) {
  const response = await api.put(`/query/sessions/${sessionId}`, { title })
  return response.data?.session
}

export async function setChatSessionFlags(sessionId, { isPinned, isArchived } = {}) {
  const payload = {}
  if (isPinned !== undefined) payload.is_pinned = isPinned
  if (isArchived !== undefined) payload.is_archived = isArchived
  const response = await api.put(`/query/sessions/${sessionId}`, payload)
  return response.data?.session
}

export async function deleteChatSession(sessionId) {
  const response = await api.delete(`/query/sessions/${sessionId}`)
  return response.data
}

export async function getPublicSettings() {
  const response = await api.get('/settings/public')
  return response.data
}

export async function getBackendStatus() {
  const response = await api.get('/status')
  return response.data
}

export async function uploadFile(file, brand) {
  const formData = new FormData()

  formData.append("file", file)
  formData.append("brand", brand)

  const response = await api.post(
    "/ingest/upload",
    formData,
    {
      timeout: 600000
    }
  )

  return response.data
}

export async function generateReport(payload) {
  const response = await api.post('/reports/generate', payload, {
    responseType: 'blob',
  })
  return response.data
}

export async function getReports() {
  const response = await api.get('/reports')
  return response.data
}

export async function getUploadSummary() {
  const response = await api.get('/ingest/summary')
  return response.data
}

export async function getUploadedFiles(brand) {
  const response = await api.get('/ingest/files', {
    params: { brand },
  })
  return response.data
}

export async function resetUploads() {
  const response = await api.post('/ingest/reset')
  return response.data
}

export async function deleteUploadedFile(fileId) {
  const response = await api.delete('/ingest/files', {
    params: { file_id: fileId },
  })
  return response.data
}

export async function searchBackend(query, brand) {
  const response = await api.get('/search', {
    params: brand ? { query, brand } : { query },
  })
  return response.data
}

export async function getBrands() {
  const response = await api.get('/brands')
  return response.data
}

export async function getCompanies() {
  const response = await api.get('/companies')
  return response.data
}

export async function setActiveCompany(companyKey) {
  const response = await api.post('/companies/set-active-company', { company_key: companyKey })
  return response.data
}

export async function createBrand(payload) {
  const response = await api.post('/brands', payload)
  return response.data
}

export async function updateBrand(brandKey, payload) {
  const response = await api.put(`/brands/${brandKey}`, payload)
  return response.data
}

export async function deleteBrand(brandKey) {
  const response = await api.delete(`/brands/${brandKey}`)
  return response.data
}

export async function getNotifications() {
  const response = await api.get('/notifications')
  return response.data
}

export async function getNotificationCounts() {
  const response = await api.get('/notifications/counts')
  return response.data
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`)
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all')
  return response.data
}

export async function createCampaign(payload) {
  const response = await api.post('/campaigns', payload)
  return response.data
}

export async function getCampaigns() {
  const response = await api.get('/campaigns')
  return response.data
}

// --- Team / Users ---
export async function getUsers() {
  const response = await api.get('/users')
  return response.data
}

export async function inviteUser(payload) {
  const response = await api.post('/users/invite', payload)
  return response.data
}

export async function setUserStatus(userId, status) {
  const response = await api.patch(`/users/${userId}/status`, { status })
  return response.data
}

export async function editUser(userId, payload) {
  const response = await api.patch(`/users/${userId}`, payload)
  return response.data
}