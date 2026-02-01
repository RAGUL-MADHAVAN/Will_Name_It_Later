import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()
  const location = useLocation()

  // Ensure persisted auth is restored on first render
  if (isLoading) {
    initializeAuth()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
