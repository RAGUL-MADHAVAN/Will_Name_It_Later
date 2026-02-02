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
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingId, setEditingId] = useState(null)
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
  const userId = user?._id || user?.id
  const displayedResources = wishlistOnly
    ? resources.filter((item) => (item.wishlist || []).some((w) => (w.user?._id || w.user || '').toString() === (userId || '').toString()))
    : resources

  const availabilityBadge = (status) => {
    const map = {
      available: 'bg-success-100 text-success-800 border-success-200',
      requested: 'bg-warning-100 text-warning-800 border-warning-200',
      borrowed: 'bg-warning-200 text-warning-900 border-warning-300',
      maintenance: 'bg-secondary-200 text-secondary-800 border-secondary-300',
      unavailable: 'bg-secondary-300 text-secondary-900 border-secondary-400',
    }
    return map[status] || 'bg-secondary-100 text-secondary-800 border-secondary-200'
  }

  const wishlistMutation = useMutation(
    ({ id, isWishlisted }) =>
      isWishlisted ? api.delete(`/resources/${id}/wishlist`) : api.post(`/resources/${id}/wishlist`),
    {
      onSuccess: (_, variables) => {
        toast.success(variables.isWishlisted ? 'Removed from wishlist' : 'Added to wishlist')
        queryClient.invalidateQueries(['resources'])
      },
      onError: () => toast.error('Could not update wishlist'),
    }
  )

  const createResourceMutation = useMutation(
    (payload) => api.post('/resources', payload),
    {
      onSuccess: () => {
        toast.success('Resource added')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1200)
        setShowForm(false)
        setEditingId(null)
        setFormValues({
          name: '',
          description: '',
          category: 'electronics',
          condition: 'good',
          availability: 'available',
          imageUrl: '',
        })
        queryClient.invalidateQueries(['resources'])
        queryClient.invalidateQueries('dashboard')
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Could not add resource')
      },
    }
  )

  const updateResourceMutation = useMutation(
    ({ id, payload }) => api.put(`/resources/${id}`, payload),
    {
      onSuccess: () => {
        toast.success('Resource updated')
        setShowForm(false)
        setEditingId(null)
        setFormValues({
          name: '',
          description: '',
          category: 'electronics',
          condition: 'good',
          availability: 'available',
          imageUrl: '',
        })
        queryClient.invalidateQueries(['resources'])
        queryClient.invalidateQueries('dashboard')
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Could not update resource')
      },
    }
  )

  const filterBadge = useMemo(() => {
    const active = Object.entries(filters).filter(([_, v]) => v)
    if (!active.length) return 'All'
    return active.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [filters])

  const resetForm = () => {
    setEditingId(null)
    setFormValues({
      name: '',
      description: '',
      category: 'electronics',
      condition: 'good',
      availability: 'available',
      imageUrl: '',
    })
  }

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
    if (editingId) {
      updateResourceMutation.mutate({ id: editingId, payload })
    } else {
      createResourceMutation.mutate(payload)
    }
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
            whileHover={{ y: -2, boxShadow: '0 20px 50px -24px rgba(59,130,246,0.65)', background: 'linear-gradient(120deg, #2563eb, #22d3ee)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setEditingId(null); setShowForm(true) }}
            className="btn-primary relative overflow-hidden"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative z-10"
            >
              + Add Resource
            </motion.span>
            <motion.span
              className="absolute inset-0 bg-white/10"
              initial={false}
              animate={{ opacity: showSuccess ? 0.3 : 0, scale: showSuccess ? 1.1 : 0.98 }}
              transition={{ duration: 0.4 }}
            />
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
          <option value="requested">Requested</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </motion.select>
        <div className="flex items-center justify-between text-sm text-secondary-600">
          <span>Active filters: {filterBadge}</span>
          <button
            type="button"
            onClick={() => setWishlistOnly((p) => !p)}
            className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${wishlistOnly ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white text-secondary-700 border-secondary-200'}`}
          >
            {wishlistOnly ? 'Show All' : 'Show Wishlist Only'}
          </button>
        </div>
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
            {displayedResources.length === 0 && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-secondary-500"
              >
                No resources found. Try adjusting filters{wishlistOnly ? ' or turn off wishlist filter.' : ''}
              </motion.p>
            )}
            {displayedResources.map((item, idx) => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, delay: idx * 0.02 }}
                whileHover={{ y: -8, boxShadow: '0 25px 60px -32px rgba(15,23,42,0.45)', borderColor: 'rgba(59,130,246,0.35)' }}
                whileTap={{ scale: 0.994 }}
                className="p-4 bg-white border border-secondary-100 rounded-2xl shadow-soft transition-all relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={false}
                  animate={{ opacity: 0.04 }}
                  style={{ background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 35%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.2), transparent 28%)' }}
                />
                <div className="flex items-center justify-between gap-3 relative">
                  <div>
                    <p className="text-sm text-secondary-500">{item.category}</p>
                    <h3 className="text-lg font-semibold text-secondary-900">{item.name}</h3>
                  </div>
                  <motion.span
                    layout
                    animate={{ scale: item.availability === 'available' ? 1 : 1.02 }}
                    transition={{ duration: 0.28 }}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border capitalize ${availabilityBadge(item.availability)}`}
                  >
                    {item.availability}
                  </motion.span>
                </div>
                <p className="text-secondary-600 text-sm mt-2 line-clamp-3 relative">{item.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-secondary-500 relative">
                  <span>{item.hostelBlock} Block • Room {item.roomNumber}</span>
                  <div className="flex gap-3">
                    {(() => {
                      const isWishlisted = (item.wishlist || []).some(
                        (w) => ((w.user?._id || w.user || '').toString() === (userId || '').toString())
                      )
                      return (
                        <motion.button
                          whileHover={{ scale: 1.03, color: '#2563eb' }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => wishlistMutation.mutate({ id: item._id, isWishlisted })}
                          className={`font-semibold ${isWishlisted ? 'text-secondary-600' : 'text-primary-600'}`}
                          disabled={wishlistMutation.isLoading}
                        >
                          {wishlistMutation.isLoading ? (isWishlisted ? 'Removing…' : 'Adding…') : isWishlisted ? 'Wishlisted' : 'Wishlist'}
                        </motion.button>
                      )
                    })()}
                    {(item.owner === user?._id || item.owner === user?.id || item.owner?._id === user?._id || item.owner?._id === user?.id) && (
                      <motion.button
                        whileHover={{ scale: 1.03, color: item.availability === 'borrowed' ? '#94a3b8' : '#2563eb' }}
                        whileTap={{ scale: 0.97 }}
                        disabled={item.availability === 'borrowed'}
                        onClick={() => {
                          if (item.availability === 'borrowed') return
                          setEditingId(item._id)
                          setFormValues({
                            name: item.name,
                            description: item.description,
                            category: item.category,
                            condition: item.condition,
                            availability: item.availability,
                            imageUrl: (item.images && item.images[0]) || '',
                          })
                          setShowForm(true)
                        }}
                        className={`text-primary-600 font-semibold ${item.availability === 'borrowed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Edit
                      </motion.button>
                    )}
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
                  <h3 className="text-xl font-semibold text-secondary-900">{editingId ? 'Edit Resource' : 'Add Resource'}</h3>
                  <p className="text-secondary-600 text-sm">{editingId ? 'Update details for your resource. Borrowed items cannot be edited.' : 'Share an item with your hostel mates.'}</p>
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
                      <option value="requested">Requested</option>
                      <option value="borrowed">Borrowed</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="unavailable">Unavailable</option>
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
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setShowForm(false); resetForm() }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary relative overflow-hidden"
                    disabled={createResourceMutation.isLoading || updateResourceMutation.isLoading || formValues.availability === 'borrowed'}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {createResourceMutation.isLoading || updateResourceMutation.isLoading ? (
                        <motion.span
                          key="saving"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="relative z-10"
                        >
                          Saving…
                        </motion.span>
                      ) : (
                        <motion.span
                          key="save"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="relative z-10 flex items-center gap-2"
                        >
                          {editingId ? 'Update Resource' : 'Save Resource'}
                          {showSuccess && <motion.span layoutId="resource-check" className="inline-block text-lg">✓</motion.span>}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <motion.span
                      className="absolute inset-0 bg-white/15"
                      initial={false}
                      animate={{ opacity: showSuccess ? 0.25 : 0, scale: showSuccess ? 1.05 : 1 }}
                      transition={{ duration: 0.35 }}
                    />
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
