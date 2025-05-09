import type { Metadata } from "next";
import { Geist, Geist_Mono, Montez, Tangerine, Cookie } from "next/font/google";
import "./globals.css";

const montez = Montez({
  variable: "--font-montez",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: "normal",
});

const tangerine = Tangerine({
  variable: "--font-tangerine",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: "normal",
});

const cookie = Cookie({
  variable: "--font-cookie",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: "normal",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Red social recetas",
  description: "Red social recetas donde se comparten recetas de cocina y se opinan sobre ellas.",
  icons: {
    icon: "/favicon.ico"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montez.variable} antialiased`}
      >
        {children}

      </body>
    </html>
  );
}
