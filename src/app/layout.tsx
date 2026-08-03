import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Count//Down",
  description: "Personal important-day countdowns",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Count//Down",
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
      <body>{children}</body>
    </html>
  );
}
