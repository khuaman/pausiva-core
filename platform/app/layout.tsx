import type { Metadata } from "next";
import { Gilda_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const gildaDisplay = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gilda",
});

export const metadata: Metadata = {
  title: "Pausiva - Dashboard Médico",
  description: "Plataforma integral de atención médica para mujeres en perimenopausia y menopausia",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${gildaDisplay.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
