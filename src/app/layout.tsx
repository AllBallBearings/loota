import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loota - AR Treasure Hunts",
  description: "Create and participate in augmented reality treasure hunts. Join the adventure and discover hidden treasures in your world.",
  keywords: "treasure hunt, augmented reality, AR, gaming, adventure, exploration",
  authors: [{ name: "Loota Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#2196f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
