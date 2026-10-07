import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  // PDFs are read in a worker thread that loads unpdf from node_modules, so it must be shipped there, unbundled.
  serverExternalPackages: ['unpdf'],
  outputFileTracingIncludes: {'/api/**': ['./node_modules/unpdf/**']},
}

export default nextConfig
