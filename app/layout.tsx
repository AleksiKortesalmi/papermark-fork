import { Metadata } from "next";
import { Inter } from "next/font/google";

import PlausibleProvider from "next-plausible";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

const data = {
  description:
    "Papermark is an open-source document sharing infrastructure. Free alternative to Docsend with custom domain. Manage secure document sharing with real-time analytics.",
  title: "Papermark | The Open Source DocSend Alternative",
  url: "/",
};

export const metadata: Metadata = {
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "Papermark",
    images: [
      {
        url: "/_static/meta-image.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
