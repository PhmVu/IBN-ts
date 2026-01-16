export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  user: {
    id: string
    username: string
    email: string
    role?: string
  }
}
