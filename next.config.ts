import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [{ url: '/~offline', revision: null }],
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googleapis.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com; img-src 'self' data: blob: https: https://*.gstatic.com https://*.googleapis.com https://*.googleusercontent.com https://*.ggpht.com; font-src 'self' data: https://fonts.gstatic.com https://*.gstatic.com https://*.googleapis.com https://*.googleusercontent.com https://*.ggpht.com; connect-src 'self' https://*.supabase.co https://www.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com https://*.ggpht.com https://accounts.google.com https://raw.githubusercontent.com http://localhost:* ws://localhost:*; worker-src 'self' blob:; frame-ancestors 'none';",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
