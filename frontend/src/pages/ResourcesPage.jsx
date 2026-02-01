import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const fetchResources = async (filters) => {
  const params = new URLSearchParams(filters)
  const res = await api.get(`/resources?${params.toString()}`)
  return res.data.data
}

const ResourcesPage = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [filters, setFilters] = useState({ category: '', availability: '', search: '' })
  const [showForm, setShowForm] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    category: 'electronics',
    condition: 'good',
    availability: 'available',
    imageUrl: '',
  })

  const { data, isLoading } = useQuery(['resources', filters], () => fetchResources(filters))

  const resources = data?.resources || []

  const wishlistMutation = useMutation((id) => api.post(`/resources/${id}/wishlist`), {
    onSuccess: () => {
      toast.success('Added to wishlist')
      queryClient.invalidateQueries(['resources'])
    },
    onError: () => toast.error('Could not add to wishlist'),
  })

  const createResourceMutation = useMutation(
    (payload) => api.post('/resources', payload),
    {
      onSuccess: () => {
        toast.success('Resource added')
        setShowForm(false)
        setFormValues({
          name: '',
          description: '',
          category: 'electronics',
          condition: 'good',
          availability: 'available',
          imageUrl: '',
        })
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Could not add resource')
      },
    }
  )

  const filterBadge = useMemo(() => {
    const active = Object.entries(filters).filter(([_, v]) => v)
    if (!active.length) return 'All'
    return active.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [filters])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formValues.name || !formValues.description) {
      toast.error('Name and description are required')
      return
    }
    if (!user?.hostelBlock || !user?.roomNumber) {
      toast.error('Profile missing hostel info. Update profile first.')
      return
    }
    const payload = {
      name: formValues.name,
      description: formValues.description,
      category: formValues.category,
      condition: formValues.condition,
      availability: formValues.availability,
      hostelBlock: user.hostelBlock,
      roomNumber: user.roomNumber,
      images: formValues.imageUrl ? [formValues.imageUrl] : [],
    }
    createResourceMutation.mutate(payload)
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Resources</h1>
            <p className="text-secondary-600">Borrow and share items across the hostel community.</p>
          </div>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 14px 30px -20px rgba(59,130,246,0.6)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            + Add Resource
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-secondary-100 p-4 rounded-2xl shadow-soft"
      >
        <motion.input
          whileFocus={{ scale: 1.01, boxShadow: '0 8px 30px -20px rgba(59,130,246,0.45)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="input"
          placeholder="Search by name or tag"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
        />
        <motion.select
          whileFocus={{ scale: 1.01, boxShadow: '0 8px 30px -20px rgba(59,130,246,0.45)' }}
          className="input"
          value={filters.category}
          onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="">Category: All</option>
          <option value="electronics">Electronics</option>
          <option value="books">Books</option>
          <option value="sports">Sports</option>
          <option value="kitchen">Kitchen</option>
          <option value="tools">Tools</option>
          <option value="study-materials">Study materials</option>
          <option value="other">Other</option>
        </motion.select>
        <motion.select
          whileFocus={{ scale: 1.01, boxShadow: '0 8px 30px -20px rgba(59,130,246,0.45)' }}
          className="input"
          value={filters.availability}
          onChange={(e) => setFilters((p) => ({ ...p, availability: e.target.value }))}
        >
          <option value="">Availability: All</option>
          <option value="available">Available</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
        </motion.select>
        <div className="flex items-center text-sm text-secondary-600">Active filters: {filterBadge}</div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="h-40 rounded-2xl bg-secondary-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {resources.length === 0 && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-secondary-500"
              >
                No resources found. Try adjusting filters.
              </motion.p>
            )}
            {resources.map((item, idx) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.02 }}
                whileHover={{ y: -6, boxShadow: '0 15px 45px -25px rgba(15,23,42,0.35)' }}
                whileTap={{ scale: 0.995 }}
                className="p-4 bg-white border border-secondary-100 rounded-2xl shadow-soft transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-secondary-500">{item.category}</p>
                    <h3 className="text-lg font-semibold text-secondary-900">{item.name}</h3>
                  </div>
                  <motion.span
                    layout
                    className={`badge-success capitalize ${item.availability !== 'available' ? 'bg-warning-100 text-warning-800' : ''}`}
                  >
                    {item.availability}
                  </motion.span>
                </div>
                <p className="text-secondary-600 text-sm mt-2 line-clamp-3">{item.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-secondary-500">
                  <span>{item.hostelBlock} Block • Room {item.roomNumber}</span>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => wishlistMutation.mutate(item._id)}
                      className="text-primary-600 font-semibold"
                      disabled={wishlistMutation.isLoading}
                    >
                      Wishlist
                    </motion.button>
                    <Link to={`/resources/${item._id}`} className="text-primary-600 font-semibold">View</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Inline modal for add resource */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-strong border border-secondary-100 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-secondary-900">Add Resource</h3>
                  <p className="text-secondary-600 text-sm">Share an item with your hostel mates.</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(false)}
                  className="text-secondary-500 hover:text-secondary-800"
                >
                  ✕
                </motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Name</label>
                    <input
                      className="input"
                      value={formValues.name}
                      onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Electric Kettle"
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
                      <option value="electronics">Electronics</option>
                      <option value="books">Books</option>
                      <option value="sports">Sports</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="tools">Tools</option>
                      <option value="study-materials">Study materials</option>
                      <option value="other">Other</option>
                    </select>
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="space-y-2">
                  <label className="text-sm font-semibold text-secondary-800">Description</label>
                  <textarea
                    className="input min-h-[96px]"
                    value={formValues.description}
                    onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What is it, and any borrowing notes?"
                    required
                  />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Condition</label>
                    <select
                      className="input"
                      value={formValues.condition}
                      onChange={(e) => setFormValues((p) => ({ ...p, condition: e.target.value }))}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Availability</label>
                    <select
                      className="input"
                      value={formValues.availability}
                      onChange={(e) => setFormValues((p) => ({ ...p, availability: e.target.value }))}
                    >
                      <option value="available">Available</option>
                      <option value="borrowed">Borrowed</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Image URL (optional)</label>
                    <input
                      className="input"
                      value={formValues.imageUrl}
                      onChange={(e) => setFormValues((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://.../item.jpg"
                    />
                  </motion.div>
                </div>

                <div className="flex items-center justify-between text-sm text-secondary-600">
                  <span>Will be listed for {user?.hostelBlock ? `Block ${user.hostelBlock}, Room ${user.roomNumber}` : 'your hostel'}.</span>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary"
                    disabled={createResourceMutation.isLoading}
                  >
                    {createResourceMutation.isLoading ? 'Saving…' : 'Save Resource'}
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

export default ResourcesPage
