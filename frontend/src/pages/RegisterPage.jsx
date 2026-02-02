import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

/* =======================
   VALIDATION SCHEMA
======================= */

const registerSchema = z.object({
  name: z
    .string()
    .nonempty('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .regex(/^[A-Za-z ]+$/, 'Only letters allowed'),

  email: z
    .string()
    .nonempty('Email is required')
    .email('Enter a valid email'),

  phoneNumber: z
    .string()
    .nonempty('Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit number'),

  hostelBlock: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Hostel block is required' }),
  }),

  roomNumber: z
    .string()
    .nonempty('Room number is required')
    .regex(/^[A-Z]\d{3}$/, 'Format like A101'),

  password: z
    .string()
    .nonempty('Password is required')
    .min(6, 'Minimum 6 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower & number'),
})

/* =======================
   STYLES
======================= */

const inputClasses =
  'w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all'

/* =======================
   COMPONENT
======================= */

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register: registerUser } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

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

  const Required = () => <span className="text-error-500">*</span>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl p-6 md:p-10 border"
      >
        {/* LEFT INFO */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">
            Join Smart Hostel <span className="text-primary-600">today</span>
          </h1>
          <p className="text-secondary-600">
            Report issues, borrow items, and stay connected.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-2xl border p-6 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Full Name <Required /></label>
              <input
                {...register('name')}
                className={`${inputClasses} ${errors.name && 'border-error-400'}`}
              />
              {errors.name && <p className="text-error-500">{errors.name.message}</p>}
            </div>

            <div>
              <label>Email <Required /></label>
              <input
                {...register('email')}
                className={`${inputClasses} ${errors.email && 'border-error-400'}`}
              />
              {errors.email && <p className="text-error-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Phone <Required /></label>
              <input
                {...register('phoneNumber')}
                className={`${inputClasses} ${errors.phoneNumber && 'border-error-400'}`}
              />
              {errors.phoneNumber && (
                <p className="text-error-500">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <label>Password <Required /></label>
              <input
                type="password"
                {...register('password')}
                className={`${inputClasses} ${errors.password && 'border-error-400'}`}
              />
              {errors.password && (
                <p className="text-error-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Hostel Block <Required /></label>
              <select
                {...register('hostelBlock')}
                defaultValue=""
                className={`${inputClasses} ${errors.hostelBlock && 'border-error-400'}`}
              >
                <option value="" disabled>Select block</option>
                <option value="A">Block A</option>
                <option value="B">Block B</option>
                <option value="C">Block C</option>
                <option value="D">Block D</option>
              </select>
              {errors.hostelBlock && (
                <p className="text-error-500">{errors.hostelBlock.message}</p>
              )}
            </div>

            <div>
              <label>Room Number <Required /></label>
              <input
                {...register('roomNumber')}
                className={`${inputClasses} ${errors.roomNumber && 'border-error-400'}`}
              />
              {errors.roomNumber && (
                <p className="text-error-500">{errors.roomNumber.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full bg-primary-600 text-white py-3 rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}

export default RegisterPage
