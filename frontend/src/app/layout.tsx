import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  subsets:  ["latin"],
  variable: "--font-dm-sans",
});

const playfair = Playfair_Display({
  subsets:  ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title:       "RCCG Great Joy Parish",
  description: "Parish Management System — Rivers Province 12",
  icons:       { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="font-sans bg-green-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
