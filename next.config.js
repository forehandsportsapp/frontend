/** @type {import('next').NextConfig} */
const apiProxyBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.BACKEND_API_BASE_URL ||
  ""
).replace(/\/$/, "");
const shouldExport = process.env.NEXT_OUTPUT_EXPORT === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(shouldExport ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins: ['192.168.1.8'],
  async rewrites() {
    if (!apiProxyBaseUrl || shouldExport) return [];

    return [
      {
        source: "/api/backend/v1/:path*",
        destination: `${apiProxyBaseUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
