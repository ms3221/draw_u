import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 가구 배치: 원본 스케치업 + 가구 여러 장을 FormData 로 전송.
      // 클라이언트에서 다운스케일하지만 안전망으로 여유값 확보.
      bodySizeLimit: "25mb",
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "whjrupurecwtnhwhcbqw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
