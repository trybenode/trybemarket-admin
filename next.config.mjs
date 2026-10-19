/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Broadcast was replaced by Campaigns; keep old links and bookmarks working.
      { source: '/broadcast', destination: '/campaigns', permanent: false },
    ]
  },
}

export default nextConfig
