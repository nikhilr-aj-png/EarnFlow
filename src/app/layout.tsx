import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";
import { MonetagScript } from "@/components/features/MonetagScript";


const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EarnFlow - Earn Real Rewards Daily",
  description: "Join EarnFlow to earn coins by completing tasks and withdraw real cash. Secure, transparent, and premium earning platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${inter.variable} antialiased font-sans bg-background text-foreground`}
      >
        <Providers>
          <MonetagScript />
          {children}
        </Providers>
      </body>
    </html>
  );
}
