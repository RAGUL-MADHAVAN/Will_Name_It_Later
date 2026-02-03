import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Pages
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ComplaintsPage from '@/pages/ComplaintsPage'
import ComplaintDetailPage from '@/pages/ComplaintDetailPage'
import ResourcesPage from '@/pages/ResourcesPage'
import ResourceDetailPage from '@/pages/ResourceDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import NotificationsPage from '@/pages/NotificationsPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"
    />
  </div>
)

function App() {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          } 
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Complaint routes */}
          <Route path="complaints">
            <Route index element={<ComplaintsPage />} />
            <Route path=":id" element={<ComplaintDetailPage />} />
          </Route>
          
          {/* Resource routes */}
          <Route path="resources">
            <Route index element={<ResourcesPage />} />
            <Route path=":id" element={<ResourceDetailPage />} />
          </Route>
          
          {/* User routes */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          
          {/* Admin routes */}
          {user?.role === 'admin' || user?.role === 'warden' ? (
            <Route path="admin" element={<AdminDashboardPage />} />
          ) : (
            <Route path="admin" element={<Navigate to="/dashboard" replace />} />
          )}
        </Route>

        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
