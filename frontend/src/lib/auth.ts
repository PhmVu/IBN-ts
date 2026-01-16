import { http } from './http'
import { LoginRequest, LoginResponse } from '../types/api'

export async function login(payload: LoginRequest) {
  // Backend uses 'username' field, so send email as username
  const res = await http.post<LoginResponse>('/api/v1/auth/login', {
    username: payload.email,
    password: payload.password,
  })
  // Backend returns data directly, not wrapped in ApiResponse
  return res.data
}
