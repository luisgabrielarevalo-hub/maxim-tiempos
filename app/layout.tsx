import type { Metadata } from "next";
import { Barlow, Bebas_Neue, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Bitácora de personal",
    template: "%s | Bitácora de personal",
  },
  description: "Bitácora de personal para el reporte diario de jornadas en campo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${barlow.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
