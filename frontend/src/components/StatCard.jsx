import { motion } from 'framer-motion'

const StatCard = ({ title, value, subtitle, accent = 'primary' }) => {
  const accentMap = {
    primary: 'from-primary-500/15 to-primary-600/20 text-primary-700',
    success: 'from-success-500/15 to-success-600/20 text-success-700',
    warning: 'from-warning-500/15 to-warning-600/20 text-warning-700',
    error: 'from-error-500/15 to-error-600/20 text-error-700',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 rounded-2xl bg-white border border-secondary-100 shadow-soft hover:shadow-medium transition-all duration-200"
    >
      <p className="text-sm text-secondary-500 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-secondary-900">{value}</p>
        {subtitle && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${accentMap[accent] || accentMap.primary}`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard
