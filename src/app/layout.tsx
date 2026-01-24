import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* --- PROPELLERADS SITE-WIDE SCRIPT (Popunder / MultiTag) --- */}
        <Script id="propeller-tag" strategy="afterInteractive">
          {`
            // 👉 PASTE YOUR PROPELLERADS SITE-WIDE SCRIPT HERE
            // For example: (function(s,u,z,p){s.src=u,s.setAttribute('data-zone',z),p.appendChild(s);})(document.createElement('script'),'https://.../tag.min.js', ZONE_ID, document.body||document.documentElement)
          `}
        </Script>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
