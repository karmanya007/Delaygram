import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider"
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { RoomProvider } from "@/components/RoomContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from '@vercel/analytics/next';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Huddle",
  description: "Your rooms, your people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <RoomProvider>
            <div className="min-h-screen">
              <Navbar />
              <main className="py-8">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-12">
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </div>
                  </div>
                </div>
              </main>
            </div>
            <Toaster />
            </RoomProvider>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
