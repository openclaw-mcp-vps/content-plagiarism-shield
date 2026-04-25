import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://content-plagiarism-shield.com"),
  title: {
    default: "Content Plagiarism Shield",
    template: "%s | Content Plagiarism Shield"
  },
  description:
    "Monitor your content for unauthorized republishing, receive plagiarism alerts, and send DMCA takedown notices in minutes.",
  keywords: [
    "plagiarism monitoring",
    "dmca takedown",
    "content theft detection",
    "blog content protection",
    "copyright enforcement"
  ],
  openGraph: {
    title: "Content Plagiarism Shield",
    description:
      "Automatically monitor the web for copied articles and send legally-structured DMCA takedown notices.",
    type: "website",
    url: "https://content-plagiarism-shield.com"
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Plagiarism Shield",
    description:
      "Detect copied posts early and issue DMCA takedowns before stolen content drains your traffic."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen bg-[#0d1117] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
