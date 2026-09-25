import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
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
  title: "WelliPay — Patient Healthcare Payments & Hospital Clearance",
  description: "Secure patient billing, HMO co-pay reconciliation, and digital hospital gate clearance pass.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#111827]">
        <ClerkProvider>
          <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-6 backdrop-blur shadow-xs">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs p-1">
                <Image
                  src="/logo.png"
                  alt="WelliPay Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-[#12234E] group-hover:text-[#08716D] transition-colors">
                  WelliPay
                </span>
                <span className="text-[11px] font-medium tracking-tight text-[#6B7280]">
                  One bill, every payer.
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Show when="signed-out">
                <div className="flex items-center gap-3">
                  <SignInButton mode="modal">
                    <button className="rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="rounded-lg bg-[#12234E] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#0E1B3E] transition-colors cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#065F46] border border-[#A7F3D0]">
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    Patient Portal Active
                  </span>
                  <div className="h-8 w-[1px] bg-[#E5E7EB] hidden sm:block"></div>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-10 w-10 border-2 border-[#12234E] shadow-xs",
                      },
                    }}
                  />
                </div>
              </Show>
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}