import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/context/theme";

export const metadata: Metadata = {
  title:       { default: "RCCG Great Joy Parish", template: "%s | Great Joy Parish" },
  description: "Parish Management System — Rivers Province 12",
  robots:      "noindex,nofollow",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
