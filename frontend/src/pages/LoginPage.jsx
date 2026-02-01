import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

const inputClasses = 'w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    const res = await login(values)
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Welcome back!')
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
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
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white/80 backdrop-blur shadow-strong rounded-3xl p-6 md:p-10 border border-secondary-100"
      >
        <div className="flex flex-col justify-center gap-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Smart Hostel</p>
            <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 leading-tight">
              Seamless Complaints &
              <span className="text-primary-600"> Resource Sharing</span>
            </h1>
            <p className="text-secondary-600 mt-3">Login to submit complaints, borrow resources, and get real-time updates.</p>
          </div>

          <div className="hidden lg:flex gap-3 items-center text-secondary-700 text-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 font-semibold grid place-items-center">SH</div>
            <p>Trusted by students and wardens. Secure, fast, and animated for clarity.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-secondary-100 shadow-soft p-6 space-y-5">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transition-all disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-center text-sm text-secondary-600">
            No account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Create one
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default LoginPage
