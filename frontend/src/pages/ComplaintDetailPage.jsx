import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const fetchComplaint = async (id) => {
  const res = await api.get(`/complaints/${id}`)
  return res.data.data.complaint
}

const ComplaintDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { user } = useAuthStore()
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

  const statusMutation = useMutation(
    (status) => api.put(`/complaints/${id}/status`, { status }),
    {
      onSuccess: () => {
        toast.success('Status updated')
        queryClient.invalidateQueries(['complaint', id])
        queryClient.invalidateQueries({ queryKey: ['complaints'] })
        queryClient.invalidateQueries('dashboard')
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Status update failed'),
    }
  )

  const feedbackMutation = useMutation(
    (payload) => api.post(`/complaints/${id}/feedback`, payload),
    {
      onSuccess: () => {
        toast.success('Feedback sent')
        queryClient.invalidateQueries(['complaint', id])
        queryClient.invalidateQueries({ queryKey: ['complaints'] })
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not send feedback'),
    }
  )

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
          <p className="text-secondary-600">{data.hostelBlock} Hostel • Room {data.roomNumber}</p>
        </div>
        <div className="flex gap-2">
          <span className="badge-primary capitalize">{data.priority}</span>
          <span className="badge-secondary capitalize">{data.status}</span>
        </div>
      </div>
      <p className="text-secondary-700 leading-relaxed">{data.description}</p>

      <div className="flex flex-wrap gap-3">
        {user?.role === 'warden' || user?.role === 'admin' ? (
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'pending', label: 'Pending', className: 'btn-secondary' },
              { value: 'in-progress', label: 'In-progress', className: 'btn-primary' },
              { value: 'resolved', label: 'Resolved', className: 'btn-success' },
              { value: 'rejected', label: 'Rejected', className: 'btn-error' }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => statusMutation.mutate(status.value)}
                className={`${status.className} capitalize ${data.status === status.value ? 'ring-2 ring-offset-2 ring-primary-200' : ''}`}
                disabled={statusMutation.isLoading}
              >
                {statusMutation.isLoading && data.status !== status.value ? 'Updating…' : status.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => upvoteMutation.mutate()}
            className="btn-primary"
            disabled={upvoteMutation.isLoading}
          >
            {upvoteMutation.isLoading ? 'Upvoting…' : `Upvote (${data.upvoteCount || 0})`}
          </button>
        )}
        <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>

      {user?.role === 'student' && data.isOwner && data.status === 'awaiting-approval' && (
        <div className="p-4 rounded-2xl border border-secondary-100 bg-secondary-50 space-y-3">
          <div>
            <h3 className="font-semibold text-secondary-900">Confirm resolution</h3>
            <p className="text-sm text-secondary-600">Is your issue really resolved? Your response notifies the warden.</p>
          </div>
          {data.feedback?.resolved === true && (
            <p className="text-sm text-success-700">You confirmed this complaint is resolved.</p>
          )}
          {data.feedback?.resolved === false && (
            <p className="text-sm text-error-700">You marked this complaint as not resolved.</p>
          )}
          {data.feedback?.resolved === undefined && (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-success"
                onClick={() => feedbackMutation.mutate({ resolved: true })}
                disabled={feedbackMutation.isLoading}
              >
                Yes, resolved
              </button>
              <button
                className="btn-error"
                onClick={() => feedbackMutation.mutate({ resolved: false })}
                disabled={feedbackMutation.isLoading}
              >
                Not resolved
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default ComplaintDetailPage
