import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/wallet/Providers";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });
const description = "FoodTrace checks product and batch information against trusted recall sources and shows the evidence behind every result.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3460"),
  title: { default: "FoodTrace", template: "%s · FoodTrace" },
  description,
  applicationName: "FoodTrace",
  openGraph: { title: "FoodTrace", description, type: "website", siteName: "FoodTrace" },
  twitter: { card: "summary_large_image", title: "FoodTrace", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
