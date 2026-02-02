import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Bell, LayoutDashboard, Megaphone, PackageSearch, User as UserIcon, LogOut, Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaints', icon: Megaphone },
  { to: '/resources', label: 'Resources', icon: PackageSearch },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 text-secondary-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 bg-white/80 backdrop-blur border-r border-secondary-100 shadow-soft flex-col p-4 gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">SH</div>
            <div>
              <p className="text-sm text-secondary-500">Smart Hostel</p>
              <p className="font-semibold text-secondary-900">Compliance & Sharing</p>
            </div>
          </div>

          <nav className="flex-1 flex flex-col gap-1 mt-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-primary-50 hover:text-primary-700 ${
                    isActive ? 'bg-primary-100 text-primary-700 shadow-glow' : 'text-secondary-700'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3 rounded-xl bg-secondary-50 border border-secondary-100">
            <p className="text-xs uppercase tracking-wide text-secondary-500">Signed in as</p>
            <p className="font-semibold text-secondary-900">{user?.name || 'User'}</p>
            <p className="text-sm text-secondary-500">{user?.role || 'student'}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-error-600 hover:bg-error-50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </aside>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                type="button"
                aria-label="Close sidebar"
                className="absolute inset-0 w-full h-full bg-black/30 backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              <motion.aside
                className="relative w-72 max-w-[80vw] h-full bg-white shadow-strong border-r border-secondary-100 flex flex-col p-4 gap-4"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between gap-3 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">SH</div>
                    <div>
                      <p className="text-sm text-secondary-500">Smart Hostel</p>
                      <p className="font-semibold text-secondary-900">Compliance & Sharing</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Close menu"
                    className="inline-flex items-center justify-center p-2 rounded-lg text-secondary-600 hover:bg-secondary-50"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 flex flex-col gap-1 mt-2">
                  {navLinks.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-primary-50 hover:text-primary-700 ${
                          isActive ? 'bg-primary-100 text-primary-700 shadow-glow' : 'text-secondary-700'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </NavLink>
                  ))}
                </nav>

                <div className="p-3 rounded-xl bg-secondary-50 border border-secondary-100">
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Signed in as</p>
                  <p className="font-semibold text-secondary-900">{user?.name || 'User'}</p>
                  <p className="text-sm text-secondary-500">{user?.role || 'student'}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-error-600 hover:bg-error-50 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-secondary-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-secondary-700 hover:bg-secondary-50"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div>
                  <p className="text-xs text-secondary-500">Welcome back</p>
                  <p className="text-lg font-semibold text-secondary-900">{user?.name || 'Guest'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium shadow-glow">
                  {user?.hostelBlock ? `Block ${user.hostelBlock}` : 'Hostel'}
                </div>
                <button
                  onClick={handleLogout}
                  className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg text-error-600 hover:bg-error-50 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout
