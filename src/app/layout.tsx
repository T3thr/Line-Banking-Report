import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { db } from "@/lib/db/connection";
import { sql } from "drizzle-orm";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Bank Income Tracker";
const description =
  "An intuitive application to track your bank income and expenses seamlessly. Get insights into your financial health with our easy-to-use tracker.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description: description,
  keywords: ["income tracker", "expense tracker", "bank", "finance", "personal finance"],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "th_TH",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isDbConnected = false;
  try {
    await db.execute(sql`SELECT 1`);
    isDbConnected = true;
  } catch (error) {
    console.error("Database connection failed:", error);
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div
          title={`Database Connection: ${
            isDbConnected ? "Connected" : "Disconnected"
          }`}
          className={`fixed bottom-4 right-4 h-4 w-4 rounded-full ${
            isDbConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </body>
    </html>
  );
}
