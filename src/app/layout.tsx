import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { HomeProvider } from "@/context/HomeContext";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03a9f4",
};

export const metadata: Metadata = {
  title: "Pametni dom",
  description: "Lastna nadzorna plošča za pametne inštalacije, vklop in izklop naprav.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pametni dom",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body className={`${roboto.variable} font-sans antialiased`}>
        <HomeProvider>
          <AppShell>{children}</AppShell>
        </HomeProvider>
      </body>
    </html>
  );
}
