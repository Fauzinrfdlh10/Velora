import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Display font untuk tema undangan (saat ini 'Sana' / Aksara). next/font
 * self-host font + inject CSS variable.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
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
        className={`${jakarta.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
