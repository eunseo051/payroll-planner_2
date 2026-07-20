/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Turbopack is not supported on this platform; use Webpack for dev
  devIndicators: false,
}

export default nextConfig
