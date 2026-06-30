import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

/**
 * Display font untuk tema undangan (saat ini 'Sana'). next/font
 * self-host font + inject CSS variable. font-display Tailwind
 * utility merujuk ke `--font-cormorant` (lihat tailwind.config.ts),
 * sehingga section components cukup `font-display` tanpa tahu nama font.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Velora — Undangan Pernikahan Digital",
  description:
    "Platform undangan pernikahan digital multi-tenant untuk pasar Indonesia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} ${cormorant.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
