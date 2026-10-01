/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["lucide-react"],
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
};

export default nextConfig;
