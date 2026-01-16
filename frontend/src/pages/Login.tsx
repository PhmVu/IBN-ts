import { FormEvent, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import { useAuthStore, AuthState } from '../store/auth'
import { Card } from '../components/Card'
import { Spinner } from '../components/Spinner'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((state: AuthState) => state.setToken)
  const setUser = useAuthStore((state: AuthState) => state.setUser)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await login({ email: username, password })
      setToken(data.token)
      setUser(data.user)
      // Redirect to dashboard after successful login
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card
        title="Đăng nhập"
        description="Sử dụng tài khoản đã được cấp để truy cập hệ thống."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="username">
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="w-full rounded border px-3 py-2 text-sm text-gray-800 focus:border-gray-700 focus:outline-none"
              placeholder="admin"
              value={username}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded border px-3 py-2 text-sm text-gray-800 focus:border-gray-700 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-70"
            disabled={loading}
          >
            {loading ? <Spinner size={16} /> : 'Đăng nhập'}
          </button>
        </form>
      </Card>
    </div>
  )
}
