import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

// Tokens are now httpOnly cookies managed by the server.
// The store only holds the user profile and login state.
interface AuthState {
  user:      AuthUser | null;
  isLoggedIn: boolean;
  setAuth:   (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:       null,
      isLoggedIn: false,

      setAuth: (user) => {
        set({ user, isLoggedIn: true });
      },

      clearAuth: () => {
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name:       "rccg-auth",
      partialize: (state) => ({ user: state.user, isLoggedIn: state.isLoggedIn }),
    }
  )
);
