import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = "/api/v1";

export const api = axios.create({
  baseURL:         API_URL,
  headers:         { "Content-Type": "application/json" },
  withCredentials: true, // Send httpOnly cookies automatically on every request
});

// No request interceptor needed — cookies are sent automatically by the browser.

// ─── Auto-refresh on 401 ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(null));
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch(e => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        // POST to refresh — refresh_token cookie is sent automatically
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return api(original); // Retry original request — new access_token cookie set
      } catch (refreshErr) {
        processQueue(refreshErr);
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
