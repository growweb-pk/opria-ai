import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Opria — AI-Powered Business Growth Operating System",
  description:
    "Understand your business. Discover opportunities. Connect with the right professionals.",
  applicationName: "Opria",
  authors: [{ name: "GrowWeb IT Company", url: "https://github.com/growweb-pk" }],
  creator: "GrowWeb IT Company / Ameer Hamza Arshad",
  publisher: "GrowWeb IT Company",
  other: {
    copyright:
      "© 2026 GrowWeb IT Company / Ameer Hamza Arshad — Opria. All rights reserved.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
