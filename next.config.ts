import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // dev 与 build 使用不同输出目录，避免 next build 覆盖 dev 缓存导致 manifest ENOENT
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
