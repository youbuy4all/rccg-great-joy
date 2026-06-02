"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F7F0]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldX size={36} className="text-red-500" />
        </div>
        <h1 className="font-serif font-bold text-gray-900 text-2xl mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm font-medium mb-6">
          You don't have permission to view this page. Contact your Pastor or administrator.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-[#145C14] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#0A3D0A] transition shadow-lg shadow-green-900/20"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
