import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Notification Tracker",
  description: "Track your job applications and optimize your resume with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
