import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Expressive outdoor-gaming display face — chunky, joyful, high craft.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Clean, friendly geometric UI body face.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Outdoor GPS / trail telemetry monospace for coordinates, bearings, distances, IDs.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Loota — Real-World AR Treasure Hunts",
  description:
    "Drop hidden coins and gift cards in the real world. Share a hunt link or QR code and watch your crew race to claim the loot in AR.",
  keywords: "treasure hunt, augmented reality, AR, outdoor game, social gaming, adventure, exploration",
  authors: [{ name: "Loota Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F3EFE3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
