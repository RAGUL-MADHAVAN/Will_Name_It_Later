import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'

const fetchComplaints = async (filters) => {
  const params = new URLSearchParams(filters)
  const res = await api.get(`/complaints?${params.toString()}`)
  return res.data.data
}

const ComplaintsPage = () => {
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' })

  const { data, isLoading, refetch } = useQuery(['complaints', filters], () => fetchComplaints(filters))

  const complaints = data?.complaints || []

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filterBadge = useMemo(() => {
    const active = Object.entries(filters).filter(([_, v]) => v)
    if (!active.length) return 'All'
    return active.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [filters])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-secondary-900">Complaints</h1>
        <p className="text-secondary-600">Track and upvote issues in your hostel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-secondary-100 p-4 rounded-2xl shadow-soft">
        <select
          className="input"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">Status: All</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In-progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          className="input"
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
        >
          <option value="">Priority: All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          className="input"
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
        >
          <option value="">Category: All</option>
          <option value="electrical">Electrical</option>
          <option value="plumbing">Plumbing</option>
          <option value="furniture">Furniture</option>
          <option value="cleanliness">Cleanliness</option>
          <option value="noise">Noise</option>
          <option value="security">Security</option>
          <option value="other">Other</option>
        </select>
        <div className="flex items-center text-sm text-secondary-600">Active filters: {filterBadge}</div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-secondary-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {complaints.length === 0 && (
            <p className="text-secondary-500">No complaints found. Try adjusting filters.</p>
          )}
          {complaints.map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4 bg-white border border-secondary-100 rounded-2xl shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-secondary-500">{item.category}</p>
                  <h3 className="text-lg font-semibold text-secondary-900">{item.title}</h3>
                </div>
                <div className="flex gap-2">
                  <span className="badge-primary capitalize">{item.priority}</span>
                  <span className="badge-secondary capitalize">{item.status}</span>
                </div>
              </div>
              <p className="text-secondary-600 text-sm mt-2 line-clamp-3">{item.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm text-secondary-500">
                <span>{item.hostelBlock} Block • Room {item.roomNumber}</span>
                <Link to={`/complaints/${item._id}`} className="text-primary-600 font-semibold">View</Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ComplaintsPage
