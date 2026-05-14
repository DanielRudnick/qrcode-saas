/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'qrcode-saas-nine.vercel.app',
        'qrcode-saas-rudnick-digitals-projects.vercel.app',
      ],
    },
  },
}

module.exports = nextConfig
