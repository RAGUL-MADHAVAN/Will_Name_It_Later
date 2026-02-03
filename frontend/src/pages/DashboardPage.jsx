import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import StatCard from '@/components/StatCard'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import AdminDashboardPage from '@/pages/AdminDashboardPage'

const fetchDashboard = async () => {
  const res = await api.get('/users/dashboard')
  return res.data.data
}

const DashboardPage = () => {
  const { data, isLoading, refetch } = useQuery('dashboard', fetchDashboard)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    refetch()
  }, [refetch])

  const stats = data?.stats

  if (user?.role === 'warden' || user?.role === 'admin') {
    return <AdminDashboardPage />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-secondary-900">Overview</h1>
        <p className="text-secondary-600">Track complaints, resources, and notifications at a glance.</p>
        <div className="flex flex-wrap gap-3 mt-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search complaints"
            className="input max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">Status: All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In-progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 14px 40px -24px rgba(59,130,246,0.4)' }}
            whileTap={{ scale: 0.97 }}
            className="btn-secondary"
            onClick={() => {
              const params = new URLSearchParams()
              if (searchTerm) params.set('search', searchTerm)
              if (statusFilter) params.set('status', statusFilter)
              navigate(`/complaints${params.toString() ? `?${params}` : ''}`)
            }}
          >
            Search
          </motion.button>
          {user?.role === 'student' && (
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 14px 40px -24px rgba(59,130,246,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={() => navigate('/complaints', { state: { openComplaintForm: true } })}
            >
              + Raise Complaint
            </motion.button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-secondary-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Complaints"
            value={stats?.complaints.total ?? 0}
            subtitle={`${stats?.complaints.resolved ?? 0} resolved`}
            accent="primary"
          />
          <StatCard
            title="Owned Resources"
            value={stats?.resources.owned ?? 0}
            subtitle={`${stats?.resources.available ?? 0} available`}
            accent="success"
          />
          <StatCard
            title="Borrowed"
            value={stats?.resources.borrowed ?? 0}
            subtitle={`${stats?.notifications.unread ?? 0} unread alerts`}
            accent="warning"
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-4"
      >
        <div className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-secondary-900">Recent Complaints</h2>
            <span className="text-sm text-secondary-500">Last 5</span>
          </div>
          <div className="space-y-3">
            {data?.recent.complaints?.length ? (
              data.recent.complaints.map((c, idx) => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className="p-3 rounded-xl border border-secondary-100 bg-secondary-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-secondary-900">{c.title}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700">{c.status}</span>
                  </div>
                  <p className="text-sm text-secondary-600 line-clamp-2">{c.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-secondary-500 text-sm">No complaints yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-secondary-900">Your Resources</h2>
            <span className="text-sm text-secondary-500">Last 5</span>
          </div>
          <div className="space-y-3">
            {data?.recent.resources?.length ? (
              data.recent.resources.map((r, idx) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className="p-3 rounded-xl border border-secondary-100 bg-secondary-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-secondary-900">{r.name}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-success-100 text-success-700">{r.availability}</span>
                  </div>
                  <p className="text-sm text-secondary-600 line-clamp-2">{r.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-secondary-500 text-sm">No resources yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default DashboardPage
