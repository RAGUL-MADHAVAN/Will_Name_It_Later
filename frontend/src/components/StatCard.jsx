import { useEffect, useRef, useState } from 'react'
import { motion, animate, useMotionValue } from 'framer-motion'

const StatCard = ({ title, value, subtitle, accent = 'primary' }) => {
  const accentMap = {
    primary: 'from-primary-500/15 to-primary-600/20 text-primary-700',
    success: 'from-success-500/15 to-success-600/20 text-success-700',
    warning: 'from-warning-500/15 to-warning-600/20 text-warning-700',
    error: 'from-error-500/15 to-error-600/20 text-error-700',
  }

  const isNumber = typeof value === 'number'
  const count = useMotionValue(0)
  const prevValue = useRef(0)
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (!isNumber) {
      setDisplayValue(value)
      return
    }

    count.set(prevValue.current ?? 0)
    const controls = animate(count, value, { duration: 0.8, ease: 'easeOut', delay: 0.05 })
    const unsubscribe = count.on('change', (latest) => setDisplayValue(Math.round(latest)))

    prevValue.current = value

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, isNumber, count])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 20px 45px -32px rgba(15,23,42,0.25)' }}
      className="p-4 rounded-2xl bg-white border border-secondary-100 shadow-soft transition-all duration-200"
    >
      <p className="text-sm text-secondary-500 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-secondary-900">{isNumber ? displayValue : value}</p>
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
