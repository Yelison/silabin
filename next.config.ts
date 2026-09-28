import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloquea en desarrollo las peticiones de origen cruzado a sus recursos de dev
  // (hot reload, RSC): sin esto, abrir la app desde la IP de la red local pinta la página
  // pero no la hidrata (un lienzo que no responde, no un fallo de las constantes de trace).
  // Solo afecta a `next dev`. Ver «Cómo ejecutarlo» en el README.
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").filter(Boolean) ?? [],
};

export default nextConfig;
