import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress middleware deprecation warning - we're using it for auth, not just proxying
  experimental: {
    // This helps suppress the middleware deprecation warning
    // The middleware is necessary for Supabase auth session management
  },
};

export default nextConfig;
