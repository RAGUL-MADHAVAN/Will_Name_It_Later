import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import StatCard from '@/components/StatCard'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const fetchAdminDashboard = async () => {
  const res = await api.get('/users/admin-dashboard')
  return res.data.data
}

const AdminDashboardPage = () => {
  const { data, isLoading } = useQuery('admin-dashboard', fetchAdminDashboard)
  const { user } = useAuthStore()
  const isWarden = user?.role === 'warden'

  const overview = data?.overview
  const recent = data?.recent || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-secondary-900">{isWarden ? 'Warden Analytics' : 'Admin Dashboard'}</h1>
        <p className="text-secondary-600">
          {isWarden
            ? 'Hostel-focused complaint trends and resolution progress.'
            : 'System-wide view of complaints, resources, and users.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-secondary-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${isWarden ? 'md:grid-cols-3' : 'md:grid-cols-3'} gap-4`}>
          {isWarden ? (
            <>
              <StatCard
                title="Total Complaints"
                value={overview?.complaints?.total ?? 0}
                subtitle={`${overview?.complaints?.resolved ?? 0} resolved`}
                accent="primary"
              />
              <StatCard
                title="Pending"
                value={overview?.complaints?.pending ?? 0}
                subtitle="Awaiting action"
                accent="warning"
              />
              <StatCard
                title="In-progress"
                value={overview?.complaints?.inProgress ?? 0}
                subtitle="Under review"
                accent="primary"
              />
              <StatCard
                title="Awaiting Approval"
                value={overview?.complaints?.awaitingApproval ?? 0}
                subtitle="Student confirmation"
                accent="secondary"
              />
              <StatCard
                title="Resolved"
                value={overview?.complaints?.resolved ?? 0}
                subtitle="Confirmed by students"
                accent="success"
              />
            </>
          ) : (
            <>
              <StatCard
                title="Active Users"
                value={overview?.users ?? 0}
                subtitle={`${overview?.complaints?.total ?? 0} complaints`}
                accent="primary"
              />
              <StatCard
                title="Complaints (Pending/In-progress)"
                value={`${overview?.complaints?.pending ?? 0} / ${overview?.complaints?.inProgress ?? 0}`}
                subtitle={`${overview?.complaints?.resolved ?? 0} resolved`}
                accent="warning"
              />
              <StatCard
                title="Resources (Avail/Borrowed)"
                value={`${overview?.resources?.available ?? 0} / ${overview?.resources?.borrowed ?? 0}`}
                subtitle={`Total ${overview?.resources?.total ?? 0}`}
                accent="success"
              />
            </>
          )}
        </div>
      )}

      {isWarden ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-secondary-900">Awaiting Approval</h2>
              <span className="text-sm text-secondary-500">Needs student confirmation</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto custom-scrollbar pr-2">
              {recent.complaints?.filter((c) => c.status === 'awaiting-approval').length ? (
                recent.complaints.filter((c) => c.status === 'awaiting-approval').map((c) => (
                  <div key={c._id} className="p-3 rounded-xl border border-secondary-100 bg-secondary-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-secondary-900">{c.title}</p>
                      <span className="badge-secondary capitalize">Awaiting approval</span>
                    </div>
                    <p className="text-sm text-secondary-600 line-clamp-2">{c.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm">Nothing awaiting approval.</p>
              )}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-secondary-900">Recent Complaints</h2>
              <span className="text-sm text-secondary-500">Last 10</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto custom-scrollbar pr-2">
              {recent.complaints?.length ? (
                recent.complaints.map((c) => (
                  <div key={c._id} className="p-3 rounded-xl border border-secondary-100 bg-secondary-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-secondary-900">{c.title}</p>
                      <span className="badge-secondary capitalize">{c.status}</span>
                    </div>
                    <p className="text-sm text-secondary-600 line-clamp-2">{c.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm">No data.</p>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-secondary-900">Recent Complaints</h2>
              <span className="text-sm text-secondary-500">Last 10</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto custom-scrollbar pr-2">
              {recent.complaints?.length ? (
                recent.complaints.map((c) => (
                  <div key={c._id} className="p-3 rounded-xl border border-secondary-100 bg-secondary-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-secondary-900">{c.title}</p>
                      <span className="badge-secondary capitalize">{c.status}</span>
                    </div>
                    <p className="text-sm text-secondary-600 line-clamp-2">{c.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm">No data.</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-secondary-900">Recent Resources</h2>
              <span className="text-sm text-secondary-500">Last 10</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto custom-scrollbar pr-2">
              {recent.resources?.length ? (
                recent.resources.map((r) => (
                  <div key={r._id} className="p-3 rounded-xl border border-secondary-100 bg-secondary-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-secondary-900">{r.name}</p>
                      <span className="badge-success capitalize">{r.availability}</span>
                    </div>
                    <p className="text-sm text-secondary-600 line-clamp-2">{r.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm">No data.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboardPage
