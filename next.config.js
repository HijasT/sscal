/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Use SWC for faster minification
  compress: true, // Enable gzip compression
  
  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
}

module.exports = nextConfig
