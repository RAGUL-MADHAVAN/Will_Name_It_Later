import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/g, 'Enter valid 10-digit phone'),
  hostelBlock: z.enum(['A', 'B', 'C', 'D']),
  roomNumber: z.string().regex(/^[A-Z]\d{3}$/g, 'Format like A101'),
})

const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: user })

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
        <p className="text-secondary-600">Update your contact and hostel details.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Full name</label>
            <input className="input" {...register('name')} />
            {errors.name && <p className="text-error-500 text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Phone</label>
            <input className="input" {...register('phoneNumber')} />
            {errors.phoneNumber && <p className="text-error-500 text-sm">{errors.phoneNumber.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Hostel Block</label>
            <select className="input" {...register('hostelBlock')} defaultValue={user?.hostelBlock}>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
            </select>
            {errors.hostelBlock && <p className="text-error-500 text-sm">{errors.hostelBlock.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary-800">Room Number</label>
            <input className="input" {...register('roomNumber')} />
            {errors.roomNumber && <p className="text-error-500 text-sm">{errors.roomNumber.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </motion.div>
  )
}

export default ProfilePage
