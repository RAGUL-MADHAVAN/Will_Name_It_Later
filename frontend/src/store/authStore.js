import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/utils/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true })
          const response = await api.post('/auth/login', credentials)
          const { user, accessToken, refreshToken } = response.data.data
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false
          })

          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          
          return { success: true, data: response.data.data }
        } catch (error) {
          set({ isLoading: false })
          const apiError = error.response?.data
          const firstFieldError = apiError?.errors?.[0]?.message
          return {
            success: false,
            error: firstFieldError || apiError?.message || 'Login failed'
          }
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true })
          const response = await api.post('/auth/register', userData)
          const { user, accessToken, refreshToken } = response.data.data
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false
          })

          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const apiError = error.response?.data
          const firstFieldError = apiError?.errors?.[0]?.message
          const errors = apiError?.errors?.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {})
          return {
            success: false,
            error: firstFieldError || apiError?.message || 'Registration failed',
            errors
          }
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint to invalidate token on server
          if (get().accessToken) {
            await api.post('/auth/logout')
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          // Clear local state regardless of server response
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false
          })

          // Clear auth header
          delete api.defaults.headers.common['Authorization']
        }
      },

      refreshToken: async () => {
        try {
          const { refreshToken } = get()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          const response = await api.post('/auth/refresh-token', { refreshToken })
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data
          
          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          })

          // Update auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
          
          return newAccessToken
        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },

      updateProfile: async (userData) => {
        try {
          set({ isLoading: true })
          const response = await api.put('/auth/profile', userData)
          const { user: updatedUser } = response.data.data
          
          set({
            user: updatedUser,
            isLoading: false
          })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.message || 'Profile update failed'
          }
        }
      },

      changePassword: async (passwordData) => {
        try {
          set({ isLoading: true })
          await api.put('/auth/change-password', passwordData)
          
          set({ isLoading: false })
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.message || 'Password change failed'
          }
        }
      },

      initializeAuth: () => {
        const { accessToken, refreshToken, user } = get()
        
        if (accessToken && refreshToken && user) {
          // Set auth header for existing session
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          set({
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          set({
            isLoading: false
          })
        }
      },

      // Helper method to check if user has specific role
      hasRole: (role) => {
        const { user } = get()
        return user?.role === role
      },

      // Helper method to check if user has any of the specified roles
      hasAnyRole: (roles) => {
        const { user } = get()
        return roles.includes(user?.role)
      },

      // Helper method to check if user is admin or warden
      isAdminOrWarden: () => {
        return get().hasAnyRole(['admin', 'warden'])
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeAuth()
        }
      }
    }
  )
)

export { useAuthStore }
