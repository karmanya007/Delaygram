/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for its runtime; Clerk requires unsafe-eval
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline'",
      // User avatars (Clerk), uploaded media (UploadThing)
      "img-src 'self' blob: data: https://img.clerk.com https://utfs.io https://uploadthing.com",
      // Clerk auth endpoints
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.accounts.dev https://uploadthing.com https://*.uploadthing.com",
      // Vercel Analytics
      "worker-src 'self' blob:",
      // Video/audio from UploadThing
      "media-src 'self' https://utfs.io https://*.uploadthing.com blob:",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
