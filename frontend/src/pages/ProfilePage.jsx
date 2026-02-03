import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import api from '@/utils/api'

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/g, 'Enter valid 10-digit phone'),
  hostelBlock: z.enum(['A', 'B', 'C', 'D']),
  roomNumber: z.string().regex(/^[A-Z]\d{3}$/g, 'Format like A101'),
})

const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore()
  const { id } = useParams()
  const isOwnProfile = !id || id === user?._id || id === user?.id

  const { data: profileData, isLoading } = useQuery(
    ['user-profile', id],
    () => api.get(`/users/${id}`).then(r => r.data.data.user),
    { enabled: !!id && !isOwnProfile }
  )

  const { data: hostelStudents, isLoading: studentsLoading } = useQuery(
    ['hostel-students', user?.hostelBlock],
    () => api.get(`/users?role=student&hostelBlock=${user?.hostelBlock}`).then(r => r.data.data.users || []),
    { enabled: isOwnProfile && user?.role === 'warden' && !!user?.hostelBlock }
  )

  const targetUser = isOwnProfile ? user : profileData
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: targetUser || {} })

  useEffect(() => {
    if (targetUser) {
      reset(targetUser)
    }
  }, [reset, targetUser])

  if (!isOwnProfile && isLoading) {
    return <div className="text-center py-8 text-secondary-500">Loading profile...</div>
  }

  if (!isOwnProfile && !targetUser) {
    return <div className="text-center py-8 text-secondary-500">Profile not found</div>
  }

  if (isOwnProfile && user?.role === 'warden') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-5 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Hostel Students</h1>
          <p className="text-secondary-600">Students registered under Hostel {user?.hostelBlock}.</p>
        </div>
        {studentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(hostelStudents || []).map((student) => (
              <a
                key={student._id}
                href={`/profile/${student._id}`}
                className="p-3 rounded-xl border border-secondary-100 bg-secondary-50 hover:bg-primary-50 transition"
              >
                <p className="font-semibold text-secondary-900">{student.name}</p>
                <p className="text-sm text-secondary-600">{student.hostelBlock} Hostel • Room {student.roomNumber}</p>
                <p className="text-xs text-secondary-500">{student.phoneNumber}</p>
              </a>
            ))}
            {!hostelStudents?.length && (
              <p className="text-secondary-500">No students found for this hostel.</p>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  const onSubmit = async (values) => {
    const res = await updateProfile(values)
    if (res.success) {
      toast.success('Profile updated')
      reset(values)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-secondary-100 rounded-2xl shadow-soft p-5 space-y-5 max-w-3xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Profile</h1>
        <p className="text-secondary-600">
          {isOwnProfile ? 'Update your contact and hostel details.' : `View ${targetUser?.name || ''}'s details.`}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Full name</label>
            <input className={`input ${!isOwnProfile ? 'bg-secondary-50' : ''}`} {...register('name')} disabled={!isOwnProfile} />
            {errors.name && <p className="text-error-500 text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Phone</label>
            <input className={`input ${!isOwnProfile ? 'bg-secondary-50' : ''}`} {...register('phoneNumber')} disabled={!isOwnProfile} />
            {errors.phoneNumber && <p className="text-error-500 text-sm">{errors.phoneNumber.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Hostel</label>
            <select className={`input ${!isOwnProfile ? 'bg-secondary-50' : ''}`} {...register('hostelBlock')} defaultValue={targetUser?.hostelBlock} disabled={!isOwnProfile}>
              <option value="A">Hostel A</option>
              <option value="B">Hostel B</option>
              <option value="C">Hostel C</option>
              <option value="D">Hostel D</option>
            </select>
            {errors.hostelBlock && <p className="text-error-500 text-sm">{errors.hostelBlock.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Room Number</label>
            <input className={`input ${!isOwnProfile ? 'bg-secondary-50' : ''}`} {...register('roomNumber')} disabled={!isOwnProfile} />
            {errors.roomNumber && <p className="text-error-500 text-sm">{errors.roomNumber.message}</p>}
          </div>
        </div>

        {isOwnProfile && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Updating…' : 'Update Profile'}
          </button>
        )}
      </form>
    </motion.div>
  )
}

export default ProfilePage
