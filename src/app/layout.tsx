import type { Metadata, Viewport } from "next";
import { Chakra_Petch } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { pixellet } from "@/lib/fonts";
const bodyFont = Chakra_Petch({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Count//Down",
  description: "Personal important-day countdowns",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Count//Down",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#283828",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('countdown-app.settings');var v=t&&JSON.parse(t).theme;if(v&&v!=='system')document.documentElement.dataset.theme=v}catch(e){}",
          }}
        />
      </head>
      <body className={`${bodyFont.variable} ${pixellet.variable}`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
