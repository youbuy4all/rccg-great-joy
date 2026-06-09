import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-[#145C14] font-bold text-6xl mb-2">404</p>
        <h1 className="font-serif font-bold text-gray-900 text-2xl mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
