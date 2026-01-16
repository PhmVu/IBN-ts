import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string;
  username: string;
  email: string;
  organization_id?: string;
  wallet_id?: string;
  certificate_serial?: string;
  enrolled: boolean;
  enrolled_at?: string;
  roles?: Array<{
    id: string;
    name: string;
    permissions?: Array<{
      resource: string;
      action: string;
    }>;
  }>;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: User) => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({
        token,
        user,
        isAuthenticated: true
      }),

      setToken: (token) => set({
        token,
        isAuthenticated: !!token
      }),

      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),

      logout: () => set({
        token: null,
        user: null,
        isAuthenticated: false
      }),
    }),
    {
      name: 'ibn-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    },
  ),
)

