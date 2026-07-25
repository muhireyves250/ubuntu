import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryClientProviderWrapper } from "@/lib/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ubuntumed — High-Risk Pregnancy Tracking",
  description:
    "Digital tracking system for high-risk pregnancies and deliveries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryClientProviderWrapper>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProviderWrapper>
      </body>
    </html>
  );
}
