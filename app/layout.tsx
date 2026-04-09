import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Poly-SD — Distributed Systems Design",
  description: "Learn distributed systems design through visual simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${ibmPlexMono.variable} ${ibmPlexSans.variable} h-full antialiased`}>
        <body className="h-full overflow-hidden bg-base text-ink">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
