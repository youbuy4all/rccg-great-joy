"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 dark:border-gray-700 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-red-500" />
        </div>

        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-xl mb-2">
          This page couldn&apos;t load
        </h2>

        <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed mb-6">
          Something went wrong rendering this section. Your data is safe — this is a display error only.
        </p>

        {process.env.NODE_ENV !== "production" && error?.message && (
          <pre className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 dark:border-gray-700 rounded-xl p-3 text-xs text-left text-red-600 dark:text-red-400 overflow-auto mb-6 max-h-32">
            {error.message}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </div>
    </div>
  );
}
