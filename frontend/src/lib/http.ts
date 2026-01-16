import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  // Attach auth token from localStorage
  const authData = localStorage.getItem('ibn-auth')
  if (authData) {
    try {
      const { state } = JSON.parse(authData)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.message || err.message || 'Request error'
    return Promise.reject(new Error(message))
  },
)

export { http }
