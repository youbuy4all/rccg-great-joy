"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border border-red-100 mb-6">
          <ShieldX size={36} className="text-red-400" />
        </div>
        <h1 className="font-serif font-bold text-gray-900 text-2xl mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm font-medium mb-6 leading-relaxed">
          You don't have permission to view this page.<br />Contact your administrator to request access.
        </p>
        <Link href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
