import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'

const fetchResource = async (id) => {
  const res = await api.get(`/resources/${id}`)
  return res.data.data.resource
}

const ResourceDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(['resource', id], () => fetchResource(id))

  const borrowMutation = useMutation(() => api.post(`/resources/${id}/borrow`), {
    onSuccess: () => {
      toast.success('Borrowed successfully')
      queryClient.invalidateQueries(['resource', id])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not borrow'),
  })

  const returnMutation = useMutation(() => api.post(`/resources/${id}/return`), {
    onSuccess: () => {
      toast.success('Returned successfully')
      queryClient.invalidateQueries(['resource', id])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not return'),
  })

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-secondary-100 animate-pulse" />
  }

  if (!data) return <p className="text-secondary-500">Not found</p>

  const isBorrowed = data.availability === 'borrowed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-secondary-500">{data.category}</p>
          <h1 className="text-2xl font-bold text-secondary-900">{data.name}</h1>
          <p className="text-secondary-600">{data.hostelBlock} Block • Room {data.roomNumber}</p>
        </div>
        <motion.span
          layout
          className={`badge-${isBorrowed ? 'warning' : 'success'} capitalize`}
          animate={{ scale: isBorrowed ? 1.05 : 1, boxShadow: isBorrowed ? '0 0 0 6px rgba(251,191,36,0.2)' : '0 0 0 0 rgba(0,0,0,0)' }}
          transition={{ duration: 0.3 }}
        >
          {data.availability}
        </motion.span>
      </div>

      <p className="text-secondary-700 leading-relaxed">{data.description}</p>

      <div className="flex gap-3 items-center">
        <AnimatePresence mode="wait">
          {!isBorrowed ? (
            <motion.button
              key="borrow"
              whileHover={{ y: -2, boxShadow: '0 12px 36px -22px rgba(59,130,246,0.7)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => borrowMutation.mutate()}
              className="btn-primary"
              disabled={borrowMutation.isLoading}
              transition={{ duration: 0.2 }}
            >
              {borrowMutation.isLoading ? 'Borrowing…' : 'Borrow'}
            </motion.button>
          ) : (
            <motion.button
              key="return"
              whileHover={{ y: -2, boxShadow: '0 12px 36px -22px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => returnMutation.mutate()}
              className="btn-success"
              disabled={returnMutation.isLoading}
              transition={{ duration: 0.2 }}
            >
              {returnMutation.isLoading ? 'Returning…' : 'Return'}
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate(-1)} className="btn-secondary">Back</motion.button>
      </div>
    </motion.div>
  )
}

export default ResourceDetailPage
