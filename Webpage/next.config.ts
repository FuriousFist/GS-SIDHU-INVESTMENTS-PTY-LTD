import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "top-right",
  },
  async redirects() {
    // The Customers and Plants tabs were removed; keep bookmarked links
    // working by sending them to the overview.
    return [
      { source: "/customers", destination: "/", permanent: true },
      { source: "/plants", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
