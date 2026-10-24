import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los archivos de caché de mercado se leen con fs en tiempo de ejecución:
  // esto asegura que Vercel los incluya dentro de las funciones.
  outputFileTracingIncludes: {
    "/api/process": ["./data/market-cache/**/*"],
    "/api/market": ["./data/market-cache/**/*"],
  },
  images: {
    // Las fotos vienen de sitios de terceros (concesionarios, portales, etc.).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
