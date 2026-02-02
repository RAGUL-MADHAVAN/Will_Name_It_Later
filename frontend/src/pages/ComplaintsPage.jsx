import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const fetchComplaints = async (filters) => {
  const params = new URLSearchParams(filters)
  const res = await api.get(`/complaints?${params.toString()}`)
  return res.data.data
}

const ComplaintsPage = () => {
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    category: 'electrical',
    priority: 'medium',
    isAnonymous: false,
  })
  const userId = user?._id || user?.id

  const { data, isLoading: complaintsLoading } = useQuery(
    ['complaints', userId || 'anonymous', filters],
    () => fetchComplaints(filters),
    {
      enabled: !!userId && !authLoading,
      staleTime: 30000,
    }
  )

  const complaints = data?.complaints || []

  useEffect(() => {
    if (location.state?.openComplaintForm) {
      setShowForm(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const createComplaintMutation = useMutation(
    (payload) => api.post('/complaints', payload),
    {
      onSuccess: () => {
        toast.success('Complaint filed')
        setShowForm(false)
        setEditingId(null)
        setSuccessMessage('Complaint submitted successfully')
        setFormValues({
          title: '',
          description: '',
          category: 'electrical',
          priority: 'medium',
          isAnonymous: false,
        })
        queryClient.invalidateQueries({ queryKey: ['complaints'] })
        queryClient.invalidateQueries('dashboard')
        setTimeout(() => setSuccessMessage(''), 2000)
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Could not file complaint')
      },
    }
  )

  const updateComplaintMutation = useMutation(
    ({ id, payload }) => api.put(`/complaints/${id}`, payload),
    {
      onSuccess: () =>
        {
          toast.success('Complaint updated')
          setShowForm(false)
          setEditingId(null)
          setSuccessMessage('Complaint updated')
          setFormValues({
            title: '',
            description: '',
            category: 'electrical',
            priority: 'medium',
            isAnonymous: false,
          })
          queryClient.invalidateQueries({ queryKey: ['complaints'] })
          queryClient.invalidateQueries('dashboard')
          setTimeout(() => setSuccessMessage(''), 2000)
        },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not update complaint'),
    }
  )

  const statusTone = {
    pending: { badge: 'badge-warning', glow: '0 0 0 8px rgba(251,191,36,0.18)', y: 0 },
    'in-progress': { badge: 'badge-primary', glow: '0 0 0 8px rgba(59,130,246,0.16)', y: -1 },
    resolved: { badge: 'badge-success', glow: '0 0 0 6px rgba(34,197,94,0.14)', y: 0 },
  }

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filterBadge = useMemo(() => {
    const active = Object.entries(filters).filter(([_, v]) => v)
    if (!active.length) return 'All'
    return active.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [filters])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formValues.title || !formValues.description) {
      toast.error('Title and description are required')
      return
    }
    if (!user?.hostelBlock || !user?.roomNumber) {
      toast.error('Update profile with hostel info before filing')
      return
    }

    const payload = {
      ...formValues,
      hostelBlock: user.hostelBlock,
      roomNumber: user.roomNumber,
    }

    if (editingId) {
      updateComplaintMutation.mutate({ id: editingId, payload })
    } else {
      createComplaintMutation.mutate(payload)
    }
  }

  if (authLoading || !userId) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-secondary-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-3 rounded-xl bg-success-50 text-success-800 border border-success-100"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Complaints</h1>
            <p className="text-secondary-600">Track and upvote issues in your hostel.</p>
          </div>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 18px 45px -26px rgba(59,130,246,0.6)', background: 'linear-gradient(120deg, #2563eb, #7c3aed)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingId(null); setShowForm(true) }}
            className="btn-primary relative overflow-hidden"
          >
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }} className="relative z-10">
              + Raise Complaint
            </motion.span>
            <motion.span className="absolute inset-0 bg-white/10" initial={false} animate={{ opacity: showForm ? 0.2 : 0, scale: showForm ? 1.04 : 1 }} transition={{ duration: 0.25 }} />
          </motion.button>
        </div>
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

      {complaintsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-secondary-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {complaints.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="col-span-1 lg:col-span-2 p-6 rounded-2xl border border-secondary-100 bg-secondary-50 text-secondary-600 text-center"
              >
                No complaints yet. Be the first to raise one.
              </motion.div>
            )}
            {complaints.map((item, idx) => {
              const tone = statusTone[item.status] || statusTone.pending
              const isOwner = !!userId && (item.isOwner || item.reporterId === userId || (item.reporter && (item.reporter._id === userId || item.reporter.id === userId)))
              const canEdit = !authLoading && !!userId && isOwner && item.status === 'pending'
              return (
                <motion.div
                  key={item._id}
                  layout
                  layoutId={item._id}
                  initial={{ opacity: 0, y: 14, scale: 0.985, backgroundColor: 'rgba(59,130,246,0.03)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, backgroundColor: 'rgba(255,255,255,1)' }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.28, delay: idx * 0.015, ease: 'easeOut' }}
                  whileHover={{ y: -6, boxShadow: '0 20px 45px -30px rgba(15,23,42,0.28)', borderColor: 'rgba(59,130,246,0.25)' }}
                  className="p-4 bg-white border border-secondary-100 rounded-2xl shadow-soft transition-all relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={false}
                    animate={{ opacity: 0.04 }}
                    style={{ background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.2), transparent 35%), radial-gradient(circle at 80% 0%, rgba(251,191,36,0.18), transparent 30%)' }}
                  />
                  <div className="flex items-center justify-between gap-3 relative">
                    <div>
                      <p className="text-sm text-secondary-500">{item.category} • {item.displayReporter || 'Student'}</p>
                      <h3 className="text-lg font-semibold text-secondary-900">{item.title}</h3>
                    </div>
                    <div className="flex gap-2 items-center">
                      <motion.span
                        layout
                        className="badge-primary capitalize"
                        animate={{ scale: item.priority === 'urgent' ? 1.06 : 1, boxShadow: item.priority === 'urgent' ? '0 0 0 10px rgba(248,113,113,0.12)' : '0 0 0 0 rgba(0,0,0,0)' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      >
                        {item.priority}
                      </motion.span>
                      <motion.span
                        layout
                        key={item.status}
                        className={`${tone.badge} capitalize`}
                        animate={{ boxShadow: tone.glow, y: tone.y }}
                        transition={{ duration: 0.32, ease: 'easeOut' }}
                      >
                        {item.status}
                      </motion.span>
                      {canEdit && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="text-sm font-semibold text-primary-600"
                          onClick={() => {
                            setEditingId(item._id)
                            setFormValues({
                              title: item.title,
                              description: item.description,
                              category: item.category,
                              priority: item.priority || 'medium',
                              isAnonymous: item.isAnonymous,
                            })
                            setShowForm(true)
                          }}
                        >
                          Edit
                        </motion.button>
                      )}
                    </div>
                  </div>
                  <p className="text-secondary-600 text-sm mt-2 line-clamp-3 relative">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-secondary-500 relative">
                    <span>{item.hostelBlock} Block • Room {item.roomNumber}</span>
                    <Link to={`/complaints/${item._id}`} className="text-primary-600 font-semibold">View</Link>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-strong border border-secondary-100 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-secondary-900">Raise a Complaint</h3>
                  <p className="text-secondary-600 text-sm">Let wardens know what needs attention.</p>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(false)} className="text-secondary-500 hover:text-secondary-800">✕</motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Title</label>
                    <input
                      className="input"
                      value={formValues.title}
                      onChange={(e) => setFormValues((p) => ({ ...p, title: e.target.value }))}
                      placeholder="E.g., Water leakage in B207"
                      required
                    />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Category</label>
                    <select
                      className="input"
                      value={formValues.category}
                      onChange={(e) => setFormValues((p) => ({ ...p, category: e.target.value }))}
                    >
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="furniture">Furniture</option>
                      <option value="cleanliness">Cleanliness</option>
                      <option value="noise">Noise</option>
                      <option value="security">Security</option>
                      <option value="other">Other</option>
                    </select>
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-2">
                  <label className="text-sm font-semibold text-secondary-800">Description</label>
                  <textarea
                    className="input min-h-[110px]"
                    value={formValues.description}
                    onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Explain the issue with details"
                    required
                  />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Priority</label>
                    <div className="input bg-secondary-50 text-secondary-600">Auto-set by category & time</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Hostel Block</label>
                    <input
                      className="input"
                      value={user?.hostelBlock || ''}
                      disabled
                      placeholder="Set in profile"
                    />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Room</label>
                    <input
                      className="input"
                      value={user?.roomNumber || ''}
                      disabled
                      placeholder="Set in profile"
                    />
                  </motion.div>
                </div>

                <div className="flex items-center justify-between text-sm text-secondary-600">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formValues.isAnonymous}
                      onChange={(e) => setFormValues((p) => ({ ...p, isAnonymous: e.target.checked }))}
                    />
                    Submit anonymously
                  </label>
                  <span>Will notify wardens/admins immediately.</span>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary relative overflow-hidden"
                    disabled={createComplaintMutation.isLoading || updateComplaintMutation.isLoading}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {createComplaintMutation.isLoading || updateComplaintMutation.isLoading ? (
                        <motion.span key="save-loading" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">Submitting…</motion.span>
                      ) : (
                        <motion.span key="save" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">{editingId ? 'Update Complaint' : 'Submit Complaint'}</motion.span>
                      )}
                    </AnimatePresence>
                    <motion.span className="absolute inset-0 bg-white/10" initial={false} animate={{ opacity: createComplaintMutation.isLoading || updateComplaintMutation.isLoading ? 0.25 : 0, scale: createComplaintMutation.isLoading || updateComplaintMutation.isLoading ? 1.03 : 1 }} transition={{ duration: 0.3 }} />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ComplaintsPage
