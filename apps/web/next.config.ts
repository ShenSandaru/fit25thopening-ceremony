import type { NextConfig } from "next";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Socket.IO requests `/socket.io/`. The default slash redirect turns that into a 404.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${serverUrl}/api/:path*` },
        { source: "/socket.io", destination: `${serverUrl}/socket.io/` },
        { source: "/socket.io/:path*", destination: `${serverUrl}/socket.io/:path*` },
      ],
    };
  },
};

export default nextConfig;
