import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trust Issues — Freelance Without the Drama",
  description:
    "Escrow payments, credit reputation, and backup freelancers. Never get ghosted again.",
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
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111827",
              border: "1px solid #1f2937",
              color: "#ffffff",
            },
          }}
        />
      </body>
    </html>
  );
}