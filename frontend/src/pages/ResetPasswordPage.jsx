import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const schema = z.object({
  password: z
    .string()
    .nonempty('Password is required')
    .min(6, 'Minimum 6 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower & number'),
})

const inputStyle =
  'w-full px-4 py-3 rounded-xl border border-secondary-400 bg-secondary-50 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const token = params.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const onSubmit = async (values) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: values.password,
      }),
    })

    const result = await res.json()

    if (res.ok) {
      toast.success('Password updated successfully!')
      navigate('/login')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-2xl shadow-strong space-y-5 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center">Reset Password</h2>

        <div>
          <label className="font-semibold">New Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              {...register('password')}
              className={`${inputStyle} ${errors.password && 'border-error-400'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
            >
              {showPassword ? 'Hide' : 'View'}
            </button>
          </div>
          {errors.password && (
            <p className="text-error-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          disabled={!isValid}
          className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-60"
        >
          Update Password
        </button>
      </form>
    </div>
  )
}

export default ResetPasswordPage
