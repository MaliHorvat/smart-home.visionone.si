import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { HomeProvider } from "@/context/HomeContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070b12",
};

export const metadata: Metadata = {
  title: "Pametni dom",
  description: "Lastna nadzorna plošča za pametne inštalacije, vklop in izklop naprav.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pametni dom",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body className={`${outfit.variable} font-sans antialiased`}>
        <HomeProvider>
          <AppShell>{children}</AppShell>
        </HomeProvider>
      </body>
    </html>
  );
}
