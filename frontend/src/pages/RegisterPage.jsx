import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email({ message: 'Enter a valid email' }),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/g, 'Enter a valid 10-digit phone'),
  hostelBlock: z.enum(['A', 'B', 'C', 'D'], { errorMap: () => ({ message: 'Select a block' }) }),
  roomNumber: z.string().regex(/^[A-Z]\d{3}$/g, 'Format like A101'),
  password: z
    .string()
    .min(6, { message: 'Min 6 characters' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/g, 'Need upper, lower, and number'),
})

const inputClasses = 'w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register: registerUser } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    const res = await registerUser(values)
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Account created!')
      navigate('/dashboard', { replace: true })
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white/80 backdrop-blur shadow-strong rounded-3xl p-6 md:p-10 border border-secondary-100"
      >
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Create account</p>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 leading-tight">
            Join Smart Hostel
            <span className="text-primary-600"> to manage & share</span>
          </h1>
          <p className="text-secondary-600">Report issues, borrow items, and stay updated with animated clarity.</p>
          <div className="grid grid-cols-2 gap-3 text-sm text-secondary-700">
            <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 shadow-soft">Live tracking</div>
            <div className="p-3 rounded-xl bg-secondary-50 border border-secondary-100 shadow-soft">Resource sharing</div>
            <div className="p-3 rounded-xl bg-success-50 border border-success-100 shadow-soft">Warden updates</div>
            <div className="p-3 rounded-xl bg-warning-50 border border-warning-100 shadow-soft">Animated UX</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-secondary-100 shadow-soft p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Full name</label>
              <input
                type="text"
                placeholder="Alex Student"
                {...register('name')}
                className={`${inputClasses} ${errors.name ? 'border-error-400' : ''}`}
              />
              {errors.name && <p className="text-error-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Email</label>
              <input
                type="email"
                placeholder="you@hostel.edu"
                {...register('email')}
                className={`${inputClasses} ${errors.email ? 'border-error-400' : ''}`}
              />
              {errors.email && <p className="text-error-500 text-sm">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Phone</label>
              <input
                type="tel"
                placeholder="9876543210"
                {...register('phoneNumber')}
                className={`${inputClasses} ${errors.phoneNumber ? 'border-error-400' : ''}`}
              />
              {errors.phoneNumber && <p className="text-error-500 text-sm">{errors.phoneNumber.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`${inputClasses} ${errors.password ? 'border-error-400' : ''}`}
              />
              {errors.password && <p className="text-error-500 text-sm">{errors.password.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Hostel Block</label>
              <select
                {...register('hostelBlock')}
                className={`${inputClasses} ${errors.hostelBlock ? 'border-error-400' : ''}`}
                defaultValue=""
              >
                <option value="" disabled>
                  Select block
                </option>
                <option value="A">Block A</option>
                <option value="B">Block B</option>
                <option value="C">Block C</option>
                <option value="D">Block D</option>
              </select>
              {errors.hostelBlock && <p className="text-error-500 text-sm">{errors.hostelBlock.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-800">Room Number</label>
              <input
                type="text"
                placeholder="A101"
                {...register('roomNumber')}
                className={`${inputClasses} ${errors.roomNumber ? 'border-error-400' : ''}`}
              />
              {errors.roomNumber && <p className="text-error-500 text-sm">{errors.roomNumber.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transition-all disabled:opacity-70"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <div className="text-center text-sm text-secondary-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default RegisterPage
