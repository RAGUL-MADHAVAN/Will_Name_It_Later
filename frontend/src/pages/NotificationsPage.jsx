import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '@/utils/api'

const fetchNotifications = async () => {
  const res = await api.get('/notifications')
  return res.data.data
}

const NotificationsPage = () => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery('notifications', fetchNotifications)
  const notifications = data?.notifications || []

  const markRead = useMutation((id) => api.put(`/notifications/${id}/read`), {
    onSuccess: () => {
      queryClient.invalidateQueries('notifications')
    },
  })

  const markAllRead = useMutation(() => api.put('/notifications/mark-all-read'), {
    onSuccess: () => {
      toast.success('All marked as read')
      queryClient.invalidateQueries('notifications')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Notifications</h1>
          <p className="text-secondary-600">Stay on top of updates and actions.</p>
        </div>
        <button
          onClick={() => markAllRead.mutate()}
          className="btn-secondary"
          disabled={markAllRead.isLoading}
        >
          {markAllRead.isLoading ? 'Marking…' : 'Mark all read'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary-100 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-secondary-500">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <motion.div
              key={n._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-2xl border shadow-soft ${n.isRead ? 'bg-white' : 'bg-primary-50/60 border-primary-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-secondary-500">{n.type}</p>
                  <h3 className="text-lg font-semibold text-secondary-900">{n.title}</h3>
                  <p className="text-secondary-600 text-sm mt-1">{n.message}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead.mutate(n._id)}
                    className="text-primary-600 font-semibold text-sm"
                    disabled={markRead.isLoading}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
