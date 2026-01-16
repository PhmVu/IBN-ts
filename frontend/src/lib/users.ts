import { http } from './http'
import { ApiResponse } from '../types/api'

export interface UserDTO {
  id: string
  username: string
  email: string
  role?: string
  is_enrolled?: boolean
  fabric_identity_id?: string | null
  enrolled_at?: string | null
  createdAt?: string
}

export async function fetchUsers() {
  const res = await http.get<{ users: UserDTO[]; total: string }>('/api/v1/users')
  if (!res.data.users) {
    throw new Error('Tải danh sách người dùng thất bại')
  }
  return res.data.users
}
