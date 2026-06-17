import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

interface AuthState {
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isLoggedIn:   boolean;
  setAuth:      (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth:    () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null, isLoggedIn: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({ user, accessToken, refreshToken, isLoggedIn: true });
      },
      clearAuth: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, accessToken: null, refreshToken: null, isLoggedIn: false });
      },
    }),
    { name: "rccg-auth", partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken, isLoggedIn: state.isLoggedIn }) }
  )
);
