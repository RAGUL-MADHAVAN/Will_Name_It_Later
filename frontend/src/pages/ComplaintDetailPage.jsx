import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'

const fetchComplaint = async (id) => {
  const res = await api.get(`/complaints/${id}`)
  return res.data.data.complaint
}

const ComplaintDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(['complaint', id], () => fetchComplaint(id))

  const upvoteMutation = useMutation(() => api.post(`/complaints/${id}/upvote`), {
    onSuccess: () => {
      toast.success('Upvoted')
      queryClient.invalidateQueries(['complaint', id])
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries('dashboard')
    },
    onError: () => toast.error('Could not upvote'),
  })

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-secondary-100 animate-pulse" />
  }

  if (!data) return <p className="text-secondary-500">Not found</p>

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
          <h1 className="text-2xl font-bold text-secondary-900">{data.title}</h1>
          <p className="text-secondary-600">{data.hostelBlock} Block • Room {data.roomNumber}</p>
        </div>
        <div className="flex gap-2">
          <span className="badge-primary capitalize">{data.priority}</span>
          <span className="badge-secondary capitalize">{data.status}</span>
        </div>
      </div>
      <p className="text-secondary-700 leading-relaxed">{data.description}</p>

      <div className="flex gap-3">
        <button
          onClick={() => upvoteMutation.mutate()}
          className="btn-primary"
          disabled={upvoteMutation.isLoading}
        >
          {upvoteMutation.isLoading ? 'Upvoting…' : `Upvote (${data.upvoteCount || 0})`}
        </button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>
    </motion.div>
  )
}

export default ComplaintDetailPage
