import { useEffect, useState } from 'react'
import { fetchUsers, UserDTO } from '../lib/users'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Spinner } from '../components/Spinner'
import { http } from '../lib/http'

export default function UsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (userId: string, username: string) => {
    setEnrolling(userId)
    try {
      await http.post(`/api/v1/users/${userId}/enroll`, {
        identityId: username,
      })
      // Reload users to get updated enrollment status
      await loadUsers()
    } catch (err) {
      alert(`Enrollment failed: ${(err as Error).message}`)
    } finally {
      setEnrolling(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý người dùng</CardTitle>
          <CardDescription>Danh sách và quản lý tài khoản</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Tìm theo username hoặc email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spinner size={16} /> Đang tải...
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Username</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Blockchain Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 font-medium text-gray-800">{u.username}</td>
                      <td className="px-4 py-2 text-gray-600">{u.email}</td>
                      <td className="px-4 py-2 text-gray-600">
                        <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {u.is_enrolled ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              ✅ Enrolled
                            </span>
                            {u.fabric_identity_id && (
                              <span className="text-xs text-gray-500" title={u.fabric_identity_id}>
                                🔗 {u.fabric_identity_id.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                            ⏳ Not Enrolled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {!u.is_enrolled && (
                            <button
                              onClick={() => handleEnroll(u.id, u.username)}
                              disabled={enrolling === u.id}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                            >
                              {enrolling === u.id ? '⏳ Enrolling...' : '🔐 Enroll'}
                            </button>
                          )}
                          <button className="text-xs text-blue-600 hover:underline">Chỉnh sửa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">
                  {filter ? 'Không tìm thấy người dùng.' : 'Chưa có người dùng.'}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
