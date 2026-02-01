import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white border border-secondary-100 rounded-3xl shadow-soft p-8 max-w-lg w-full text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 text-primary-600 grid place-items-center text-3xl font-bold">404</div>
        <h1 className="text-2xl font-bold text-secondary-900">Page not found</h1>
        <p className="text-secondary-600">The page you’re looking for doesn’t exist. Please check the URL or return to the dashboard.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
          <Link to="/login" className="btn-secondary">Back to login</Link>
        </div>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
