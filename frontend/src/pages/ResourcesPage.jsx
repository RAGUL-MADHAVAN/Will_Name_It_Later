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

const fetchResourceRequests = async (filters) => {
  const params = new URLSearchParams(filters)
  const res = await api.get(`/resource-requests?${params.toString()}`)
  return res.data.data
}

const ResourcesPage = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [filters, setFilters] = useState({ category: '', availability: 'available', search: '' })
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [listMode, setListMode] = useState('others')
  const [showForm, setShowForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showFulfillForm, setShowFulfillForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    category: 'electronics',
    condition: 'good',
    imageUrl: '',
  })

  const [requestFormValues, setRequestFormValues] = useState({
    title: '',
    description: '',
    category: 'electronics',
  })

  const [fulfillFormValues, setFulfillFormValues] = useState({
    title: '',
    description: '',
    condition: 'good',
    imageUrl: '',
  })

  const { data, isLoading } = useQuery(['resources', filters], () => fetchResources(filters))

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery(
    ['resource-requests'],
    () => fetchResourceRequests({ status: 'open' })
  )

  const resources = data?.resources || []
  const requests = requestsData?.requests || []
  const userId = user?._id || user?.id

  const isMyResource = (item) => {
    const ownerId = (item?.owner?._id || item?.owner || '').toString()
    return ownerId && userId && ownerId === userId.toString()
  }

  const baseResources = useMemo(() => {
    if (!userId) return resources
    if (listMode === 'mine') return resources.filter((item) => isMyResource(item))
    return resources.filter((item) => !isMyResource(item))
  }, [resources, userId, listMode])

  const displayedResources = (wishlistOnly && listMode === 'others')
    ? baseResources.filter((item) => (item.wishlist || []).some((w) => (w.user?._id || w.user || '').toString() === (userId || '').toString()))
    : baseResources

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

  const createRequestMutation = useMutation((payload) => api.post('/resource-requests', payload), {
    onSuccess: () => {
      toast.success('Request posted')
      setShowRequestForm(false)
      setRequestFormValues({
        title: '',
        description: '',
        category: 'electronics',
      })
      queryClient.invalidateQueries(['resource-requests'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create request'),
  })

  const cancelRequestMutation = useMutation((id) => api.put(`/resource-requests/${id}/cancel`), {
    onSuccess: () => {
      toast.success('Request cancelled')
      queryClient.invalidateQueries(['resource-requests'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel request'),
  })

  const fulfillRequestMutation = useMutation(
    ({ id, payload }) => api.post(`/resource-requests/${id}/fulfill`, payload),
    {
      onSuccess: () => {
        toast.success('Request fulfilled and resource listed')
        setShowFulfillForm(false)
        setSelectedRequest(null)
        setFulfillFormValues({ title: '', description: '', condition: 'good', imageUrl: '' })
        queryClient.invalidateQueries(['resource-requests'])
        queryClient.invalidateQueries(['resources'])
        queryClient.invalidateQueries('notifications')
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not fulfill request'),
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
    const active = Object.entries(filters).filter(([key, value]) => {
      if (!value) return false
      if (key === 'availability' && value === 'available') return false
      return true
    })
    if (!active.length) return 'All'
    return active
      .map(([key, value]) => {
        if (key === 'search') return `Search: "${value}"`
        if (key === 'availability') return value.charAt(0).toUpperCase() + value.slice(1)
        return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${
          value.charAt(0).toUpperCase() + value.slice(1)
        }`
      })
      .join(', ')
  }, [filters])

  const resetForm = () => {
    setEditingId(null)
    setFormValues({
      name: '',
      description: '',
      category: 'electronics',
      condition: 'good',
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

  const handleRequestSubmit = (e) => {
    e.preventDefault()
    if (!requestFormValues.title || !requestFormValues.description) {
      toast.error('Title and description are required')
      return
    }
    const payload = {
      title: requestFormValues.title,
      description: requestFormValues.description,
      category: requestFormValues.category,
    }
    createRequestMutation.mutate(payload)
  }

  const handleFulfillSubmit = (e) => {
    e.preventDefault()
    if (!selectedRequest?._id) return
    if (!fulfillFormValues.title || !fulfillFormValues.description) {
      toast.error('Title and description are required')
      return
    }
    const payload = {
      title: fulfillFormValues.title,
      description: fulfillFormValues.description,
      condition: fulfillFormValues.condition,
      imageUrl: fulfillFormValues.imageUrl,
    }
    fulfillRequestMutation.mutate({ id: selectedRequest._id, payload })
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
            onClick={() => { resetForm(); setShowForm(true) }}
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

          <motion.button
            whileHover={{ y: -2, boxShadow: '0 14px 30px -20px rgba(59,130,246,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRequestForm(true)}
            className="btn-secondary"
          >
            + Request Item
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
          <option value="available">Available</option>
          <option value="requested">Requested</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </motion.select>
        <div className="flex items-center justify-between text-sm text-secondary-600 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span>Active filters: {filterBadge}</span>
            <div className="flex items-center rounded-lg border border-secondary-200 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setListMode('others')
                }}
                className={`px-3 py-2 text-sm font-semibold transition ${listMode === 'others' ? 'bg-primary-100 text-primary-700' : 'bg-white text-secondary-700'}`}
              >
                Others' Listings
              </button>
              <button
                type="button"
                onClick={() => {
                  setListMode('mine')
                  setWishlistOnly(false)
                }}
                className={`px-3 py-2 text-sm font-semibold transition border-l border-secondary-200 ${listMode === 'mine' ? 'bg-primary-100 text-primary-700' : 'bg-white text-secondary-700'}`}
              >
                My Listings
              </button>
            </div>
          </div>

          {listMode === 'others' && (
            <button
              type="button"
              onClick={() => setWishlistOnly((p) => !p)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${wishlistOnly ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white text-secondary-700 border-secondary-200'}`}
            >
              {wishlistOnly ? 'Show All' : 'Show Wishlist Only'}
            </button>
          )}
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

      <div className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-secondary-900">Open Requests</h2>
            <p className="text-secondary-600 text-sm">Students can request items that are not currently listed.</p>
          </div>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 14px 30px -20px rgba(59,130,246,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRequestForm(true)}
            className="btn-secondary"
          >
            + Request Item
          </motion.button>
        </div>

        {isRequestsLoading ? (
          <div className="h-24 rounded-2xl bg-secondary-100 animate-pulse" />
        ) : requests.length === 0 ? (
          <p className="text-secondary-500">No open requests right now.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {requests.map((reqItem, idx) => {
                const requesterId = reqItem?.requestedBy?._id
                const isRequester = requesterId && userId && requesterId.toString() === userId.toString()
                return (
                  <motion.div
                    key={reqItem._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: idx * 0.02 }}
                    className="p-4 bg-white border border-secondary-100 rounded-2xl shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-secondary-500">{reqItem.category}</p>
                        <h3 className="text-lg font-semibold text-secondary-900">{reqItem.title}</h3>
                        <p className="text-secondary-600 text-sm mt-2 whitespace-pre-line">{reqItem.description}</p>
                        <p className="text-xs text-secondary-500 mt-3">
                          Requested by {isRequester ? 'You' : (reqItem.requestedBy?.name || 'Student')}
                          {reqItem.requestedBy?.hostelBlock ? ` • ${reqItem.requestedBy.hostelBlock} Block • Room ${reqItem.requestedBy.roomNumber}` : ''}
                        </p>
                      </div>

                      <motion.span className="badge-success capitalize">{reqItem.status}</motion.span>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      {isRequester ? (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          className="btn-secondary"
                          onClick={() => cancelRequestMutation.mutate(reqItem._id)}
                          disabled={cancelRequestMutation.isLoading}
                        >
                          Cancel
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn-primary"
                          onClick={() => {
                            setSelectedRequest(reqItem)
                            setFulfillFormValues({
                              title: reqItem.title,
                              description: reqItem.description,
                              condition: 'good',
                              imageUrl: '',
                            })
                            setShowFulfillForm(true)
                          }}
                        >
                          I Have This
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

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
                    disabled={createResourceMutation.isLoading || updateResourceMutation.isLoading}
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

      <AnimatePresence>
        {showRequestForm && (
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
                  <h3 className="text-xl font-semibold text-secondary-900">Request an Item</h3>
                  <p className="text-secondary-600 text-sm">Ask others if they can list an item you need.</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRequestForm(false)}
                  className="text-secondary-500 hover:text-secondary-800"
                >
                  ✕
                </motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleRequestSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Title</label>
                    <input
                      className="input"
                      value={requestFormValues.title}
                      onChange={(e) => setRequestFormValues((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Need an umbrella"
                      required
                    />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Category</label>
                    <select
                      className="input"
                      value={requestFormValues.category}
                      onChange={(e) => setRequestFormValues((p) => ({ ...p, category: e.target.value }))}
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
                    value={requestFormValues.description}
                    onChange={(e) => setRequestFormValues((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Why do you need it, and for how long?"
                    required
                  />
                </motion.div>

                <div className="flex gap-3 justify-end">
                  <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-secondary" onClick={() => setShowRequestForm(false)}>
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary"
                    disabled={createRequestMutation.isLoading}
                  >
                    {createRequestMutation.isLoading ? 'Posting…' : 'Post Request'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFulfillForm && selectedRequest && (
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
                  <h3 className="text-xl font-semibold text-secondary-900">Fulfill Request</h3>
                  <p className="text-secondary-600 text-sm">This will list a normal resource for “{selectedRequest.title}”.</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowFulfillForm(false)
                    setSelectedRequest(null)
                  }}
                  className="text-secondary-500 hover:text-secondary-800"
                >
                  ✕
                </motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleFulfillSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-secondary-800">Title</label>
                    <input
                      className="input"
                      value={fulfillFormValues.title}
                      onChange={(e) => setFulfillFormValues((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Umbrella"
                      required
                    />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-secondary-800">Description</label>
                    <textarea
                      className="input min-h-[96px]"
                      value={fulfillFormValues.description}
                      onChange={(e) => setFulfillFormValues((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Add any notes for borrowing"
                      required
                    />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Condition</label>
                    <select
                      className="input"
                      value={fulfillFormValues.condition}
                      onChange={(e) => setFulfillFormValues((p) => ({ ...p, condition: e.target.value }))}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-800">Image URL (optional)</label>
                    <input
                      className="input"
                      value={fulfillFormValues.imageUrl}
                      onChange={(e) => setFulfillFormValues((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://.../item.jpg"
                    />
                  </motion.div>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowFulfillForm(false)
                      setSelectedRequest(null)
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary"
                    disabled={fulfillRequestMutation.isLoading}
                  >
                    {fulfillRequestMutation.isLoading ? 'Listing…' : 'List Resource'}
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
