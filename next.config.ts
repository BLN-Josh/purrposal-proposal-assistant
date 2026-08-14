import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which loads a PDF-parsing worker via a
  // relative dynamic import (`./pdf.worker.mjs`) at runtime. Bundled into a
  // Turbopack chunk, that path no longer resolves ("Setting up fake worker
  // failed: Cannot find module .../pdf.worker.mjs"). Marking it external
  // makes Next.js `require()` it natively from node_modules instead, where
  // the relative worker path is valid.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
