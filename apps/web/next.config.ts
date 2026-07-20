import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @poll-creator/db ships raw .ts via its exports map — Next must compile it.
  transpilePackages: ['@poll-creator/db'],
}

export default nextConfig
