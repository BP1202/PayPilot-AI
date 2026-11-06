import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opnly — Where Ideas Find the Right People",
  description: "The AI-powered idea-to-business opportunity network. Connect with the right people, structure commercial agreements, and execute verified outcomes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

