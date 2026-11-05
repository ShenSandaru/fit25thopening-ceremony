import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { PROJECT_NAME } from "@fit-expo/shared";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description:
    "FIT Expo opening ceremony, Faculty of Information Technology, University of Moratuwa",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
