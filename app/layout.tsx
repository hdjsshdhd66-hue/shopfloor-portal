import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "S47 DIGITAL — Operational Interfaces Built Around Your Workflow";
const DESCRIPTION =
  "S47 DIGITAL designs custom operational portals, dashboards, and workflow interfaces for organizations — front-end systems ready for integration within your IT environment.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // No production domain has been assigned yet, so metadataBase and
  // canonical URLs are intentionally left unset rather than invented.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
  icons: {
    icon: [
      { url: "/brand/s47-favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/s47-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/s47-favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/s47-favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/s47-favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/s47-apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#050506",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
