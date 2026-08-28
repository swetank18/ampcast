import type { Metadata } from "next";
import { Anek_Latin, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
/* Anek Latin is Ek Type's, drawn in India for Indian scripts. Its width axis
 * lets the rupee figures be set condensed and heavy without a second file. */
const anek = Anek_Latin({
  subsets: ["latin"],
  variable: "--font-anek",
  display: "swap",
  axes: ["wdth"],
});
/* Meter readings, interval times and kVA are machine data, and are set in mono
 * throughout so they never read as prose. */
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aethergrid — tariff-native demand control",
  description:
    "We do not forecast electricity. We forecast the bill. A chance-constrained controller that defends a monthly demand ceiling on real meter data under a real Indian tariff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${anek.variable} ${geistMono.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
