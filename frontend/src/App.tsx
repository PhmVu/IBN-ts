import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import UsersPage from './pages/Users'
import ExplorePage from './pages/Explore'
import ChaincodePage from './pages/Chaincode'
import NetworkPage from './pages/Network'
import EnterpriseListPage from './pages/EnterpriseList'
import EnterpriseDetailPage from './pages/EnterpriseDetail'
import QRPage from './pages/QR'
import NotFoundPage from './pages/NotFound'
import { useAuthStore } from './store/auth'
import { http } from './lib/http'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EnrollmentGuard } from './components/EnrollmentGuard'
import { UserProfile } from './components/UserProfile'
import { Dropdown, DropdownItem } from './components/Dropdown'

function Sidebar() {
  const token = useAuthStore((state) => state.token)

  if (!token) return null

  const navItems = [
    { label: 'Tổng quan', path: '/', icon: '📊' },
    { label: 'Người dùng', path: '/users', icon: '👥' },
    { label: 'Network', path: '/network', icon: '🌐' },
    { label: 'Doanh nghiệp', path: '/enterprises', icon: '🏢' },
    { label: 'Chaincode', path: '/chaincode', icon: '⛓️' },
    { label: 'Khám phá', path: '/explore', icon: '🔍' },
    { label: 'QR Code', path: '/qr', icon: '🔲' },
  ]

  return (
    <aside className="w-48 border-r bg-white">
      <nav className="space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="block rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function Header() {
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold text-gray-800">ICTU Blockchain Network</div>
        {token ? (
          <Dropdown trigger={
            <>
              <span className="text-gray-700">👤 Tài khoản</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          }>
            <DropdownItem onClick={() => navigate('/profile')}>
              👤 Hồ sơ
            </DropdownItem>
            <DropdownItem onClick={logout}>
              🚪 Đăng xuất
            </DropdownItem>
          </Dropdown>
        ) : (
          <span className="text-sm text-gray-500">Chưa đăng nhập</span>
        )}
      </div>
    </header>
  )
}

function App() {
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (token) {
      http.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete http.defaults.headers.common.Authorization
    }
  }, [token])

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Header />

        <div className="flex">
          <Sidebar />
          <main className="flex-1 px-6 py-8">
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Dashboard - accessible to all authenticated users */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Profile - accessible to all authenticated users */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explore"
                element={
                  <ProtectedRoute>
                    <ExplorePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/network"
                element={
                  <ProtectedRoute>
                    <NetworkPage />
                  </ProtectedRoute>
                }
              />

              {/* Enterprise routes */}
              <Route
                path="/enterprises"
                element={
                  <ProtectedRoute>
                    <EnterpriseListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enterprises/:enterpriseId"
                element={
                  <ProtectedRoute>
                    <EnterpriseDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Legacy Tea Trace route - redirect to enterprises */}
              <Route
                path="/teatrace"
                element={<Navigate to="/enterprises/teatrace" replace />}
              />

              {/* Chaincode - requires enrollment */}
              <Route
                path="/chaincode"
                element={
                  <ProtectedRoute>
                    <EnrollmentGuard>
                      <ChaincodePage />
                    </EnrollmentGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/qr"
                element={
                  <ProtectedRoute>
                    <QRPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

