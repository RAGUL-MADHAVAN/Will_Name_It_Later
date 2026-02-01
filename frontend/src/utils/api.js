import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach token before each request
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Refresh token on 401 and retry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const { refreshToken, logout } = useAuthStore.getState()

    // If unauthorized and we have a refresh token, attempt refresh once
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshToken
    ) {
      originalRequest._retry = true
      try {
        const newAccessToken = await useAuthStore.getState().refreshToken()
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout and fall through to reject
        logout()
      }
    }

    return Promise.reject(error)
  }
)

export default api
