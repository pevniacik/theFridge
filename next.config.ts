import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { execSync } from "child_process";
import crypto from "crypto";

let revision: string;
try {
  revision = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
} catch {
  revision = crypto.randomUUID();
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  output: "standalone",
  // bonjour-service is loaded via dynamic import() inside instrumentation.ts only
  // when NEXT_RUNTIME=nodejs && NODE_ENV=production. The runtime guard prevents
  // nft (node-file-trace) from statically discovering the import, so we force-include
  // the package and all its transitive files here.
  outputFileTracingIncludes: {
    "**": ["./node_modules/bonjour-service/**"],
  },
};

export default withSerwist(nextConfig);
