import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vignette.wikia.nocookie.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
