import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Sora } from "next/font/google";
import FondoAnimado from "@/components/FondoAnimado";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Expertize Insights",
  description: "Insights de producto y mercado en tiempo real para equipos comerciales.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#07080C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sora.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <div className="fondo-cuadricula" aria-hidden />
        <div className="fondo-brillo" aria-hidden />
        <FondoAnimado />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
