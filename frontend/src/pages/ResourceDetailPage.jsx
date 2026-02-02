import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const fetchResource = async (id) => {
  const res = await api.get(`/resources/${id}`)
  return res.data.data.resource
}

const ResourceDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [actionState, setActionState] = useState(null)

  const { data, isLoading } = useQuery(['resource', id], () => fetchResource(id))
  const requestBorrowMutation = useMutation(
    () => api.post(`/resources/${id}/requests`),
    {
      onMutate: () => setActionState('requesting'),
      onSuccess: () => {
        toast.success('Request sent')
        setActionState('request-success')
        setTimeout(() => setActionState(null), 1200)
        queryClient.invalidateQueries(['resource', id])
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => {
        setActionState(null)
        toast.error(err.response?.data?.message || 'Could not request borrow')
      },
    }
  )

  const approveMutation = useMutation(
    (requestId) => api.post(`/resources/${id}/requests/${requestId}/approve`),
    {
      onSuccess: () => {
        toast.success('Approved and marked borrowed')
        queryClient.invalidateQueries(['resource', id])
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not approve'),
    }
  )

  const rejectMutation = useMutation(
    (requestId) => api.post(`/resources/${id}/requests/${requestId}/reject`),
    {
      onSuccess: () => {
        toast.success('Request rejected')
        queryClient.invalidateQueries(['resource', id])
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not reject'),
    }
  )

  const returnRequestMutation = useMutation(
    () => api.post(`/resources/${id}/return-request`),
    {
      onSuccess: () => {
        toast.success('Return request sent to owner')
        queryClient.invalidateQueries(['resource', id])
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not request return'),
    }
  )

  const markAvailableMutation = useMutation(
    () => api.post(`/resources/${id}/mark-available`),
    {
      onSuccess: () => {
        toast.success('Resource marked available')
        queryClient.invalidateQueries(['resource', id])
        queryClient.invalidateQueries(['resources'])
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Could not mark available'),
    }
  )

  const borrowRequests = data?.borrowRequests || []
  const hasPending = useMemo(() => borrowRequests.some((r) => r.status === 'pending'), [borrowRequests])
  const myPending = useMemo(
    () => borrowRequests.find((r) => r.status === 'pending' && (r.requester?._id === user?._id || r.requester === user?.id)),
    [borrowRequests, user]
  )

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-secondary-100 animate-pulse" />
  }

  if (!data) return <p className="text-secondary-500">Not found</p>

  const isOwner = user?._id === data.owner?._id || user?.id === data.owner?._id
  const isBorrowed = data?.availability === 'borrowed'
  const isCurrentBorrower = user?._id === data?.currentBorrower?._id || user?.id === data?.currentBorrower?._id
  const activeBorrowerName = isCurrentBorrower ? 'You' : data?.currentBorrower?.name

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
          animate={{
            scale: isBorrowed ? 1.06 : 1,
            boxShadow: isBorrowed ? '0 0 0 8px rgba(251,191,36,0.16)' : '0 0 0 0 rgba(0,0,0,0)',
            rotate: actionState?.includes('success') ? [0, 2, -2, 0] : 0,
          }}
          transition={{ duration: 0.35 }}
        >
          {data.availability}
        </motion.span>
      </div>

      <p className="text-secondary-700 leading-relaxed">{data.description}</p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3 items-center">
          <AnimatePresence mode="wait">
            {!isOwner ? (
              !isCurrentBorrower ? (
                <motion.button
                  key="request"
                  whileHover={{ y: -2, boxShadow: '0 12px 36px -22px rgba(59,130,246,0.7)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => requestBorrowMutation.mutate()}
                  className="btn-primary relative overflow-hidden"
                  disabled={isBorrowed || data.availability === 'requested' || requestBorrowMutation.isLoading || !!myPending}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {requestBorrowMutation.isLoading ? (
                      <motion.span key="req-loading" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">
                        Requesting…
                      </motion.span>
                    ) : (
                      <motion.span key="req" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10 flex items-center gap-2">
                        {myPending ? 'Requested' : isBorrowed ? 'Borrowed' : data.availability === 'requested' ? 'Pending requests' : 'Request Borrow'}
                        {actionState === 'request-success' && <motion.span layoutId="borrow-check" className="text-lg">✓</motion.span>}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <motion.span className="absolute inset-0 bg-white/10" initial={false} animate={{ opacity: requestBorrowMutation.isLoading ? 0.2 : 0, scale: requestBorrowMutation.isLoading ? 1.04 : 1 }} transition={{ duration: 0.3 }} />
                </motion.button>
              ) : (
                <motion.button
                  key="return"
                  whileHover={{ y: -2, boxShadow: '0 12px 36px -22px rgba(251,146,60,0.7)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => returnRequestMutation.mutate()}
                  className="btn-warning relative overflow-hidden"
                  disabled={returnRequestMutation.isLoading}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {returnRequestMutation.isLoading ? (
                      <motion.span key="ret-loading" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">Requesting Return…</motion.span>
                    ) : (
                      <motion.span key="ret-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">Request Return</motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            ) : (
              <motion.button
                key="mark"
                whileHover={{ y: -2, boxShadow: '0 12px 36px -22px rgba(34,197,94,0.7)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => markAvailableMutation.mutate()}
                className="btn-success relative overflow-hidden"
                disabled={markAvailableMutation.isLoading || !isBorrowed}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {markAvailableMutation.isLoading ? (
                    <motion.span key="mark-loading" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">Updating…</motion.span>
                  ) : (
                    <motion.span key="mark-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-10">Mark Available</motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate(-1)} className="btn-secondary">Back</motion.button>
        </div>

        {isBorrowed && activeBorrowerName && (
          <div className="text-sm text-secondary-600">Currently borrowed by {activeBorrowerName}</div>
        )}

        {isOwner && (data.borrowRequests?.length || 0) > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-secondary-900">Pending Requests</h3>
            <div className="space-y-2">
              {(data.borrowRequests || []).filter((r) => r.status === 'pending').map((r) => (
                <div key={r._id} className="p-3 rounded-xl border border-secondary-100 bg-secondary-50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-secondary-900">{r.requester?.name || 'Student'}</p>
                    <p className="text-sm text-secondary-600">{r.requester?.hostelBlock ? `${r.requester.hostelBlock} Block • Room ${r.requester.roomNumber}` : '—'}</p>
                    {r.message && <p className="text-sm text-secondary-500 mt-1">“{r.message}”</p>}
                    <p className="text-xs text-secondary-500">Requested at {new Date(r.requestedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-success px-3 py-2"
                      onClick={() => approveMutation.mutate(r._id)}
                      disabled={approveMutation.isLoading}
                    >
                      Approve
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-secondary px-3 py-2"
                      onClick={() => rejectMutation.mutate(r._id)}
                      disabled={rejectMutation.isLoading}
                    >
                      Reject
                    </motion.button>
                  </div>
                </div>
              ))}
              {(data.borrowRequests || []).filter((r) => r.status === 'pending').length === 0 && (
                <p className="text-sm text-secondary-500">No pending requests.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ResourceDetailPage
